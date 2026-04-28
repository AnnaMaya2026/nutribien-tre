// Shared helper for edge functions: load profile dietary/health restrictions
// and build prompt blocks + post-filtering.
// Duplicates the logic of src/lib/dietaryRestrictions.ts since edge functions
// cannot import from the src/ directory.

const RESTRICTION_PREFIX = "other:";

const DIET_KEYWORDS: Record<string, string[]> = {
  sans_lactose: [
    "lait", "fromage", "yaourt", "yogourt", "beurre", "creme", "crème",
    "mozzarella", "cheddar", "parmesan", "emmental", "comte", "comté",
    "ricotta", "feta", "camembert", "brie", "gruyere", "gruyère",
    "lactose", "lactique", "petit-suisse", "fromage blanc",
  ],
  sans_gluten: [
    "ble", "blé", "pain", "pates", "pâtes", "pasta", "couscous",
    "semoule", "farine", "biscuit", "gateau", "gâteau", "brioche",
    "croissant", "pizza", "orge", "seigle", "epeautre", "épeautre",
    "boulgour", "tarte", "viennoiserie",
  ],
  vegetarien: [
    "boeuf", "bœuf", "porc", "veau", "agneau", "poulet", "dinde",
    "canard", "lapin", "jambon", "saucisse", "saucisson", "bacon",
    "lardon", "merguez", "pate", "pâté", "viande", "steak", "escalope",
    "rôti", "roti", "cote", "côte", "gibier", "foie",
  ],
  vegan: [
    "boeuf", "bœuf", "porc", "veau", "agneau", "poulet", "dinde",
    "canard", "lapin", "jambon", "saucisse", "viande", "steak",
    "poisson", "saumon", "thon", "cabillaud", "merlu", "sardine",
    "crevette", "fruits de mer", "lait", "fromage", "yaourt", "beurre",
    "creme", "crème", "oeuf", "œuf", "miel",
  ],
  sans_poisson: [
    "poisson", "saumon", "thon", "cabillaud", "merlu", "sardine",
    "maquereau", "hareng", "anchois", "truite", "bar", "dorade",
    "sole", "lieu", "colin", "crevette", "moule", "huitre", "huître",
    "calamar", "fruits de mer", "crustace", "crustacé",
  ],
  sans_fruits_a_coque: [
    "amande", "noix", "noisette", "cajou", "pistache", "pecan", "pécan",
    "macadamia", "fruits a coque", "fruits à coque", "praline", "praliné",
    "nutella", "frangipane",
  ],
  sans_oeufs: [
    "oeuf", "œuf", "omelette", "mayonnaise", "meringue", "quiche",
    "flan", "souffle", "soufflé", "frittata", "brouille",
  ],
};

const DIET_LABELS: Record<string, string> = {
  sans_lactose: "🥛 Sans lactose",
  sans_gluten: "🌾 Sans gluten",
  vegetarien: "🥩 Végétarien (pas de viande ni poisson)",
  vegan: "🌱 Végétalien / Vegan (pas de produits animaux)",
  sans_poisson: "🐟 Sans poisson ni fruits de mer",
  sans_fruits_a_coque: "🥜 Sans fruits à coque",
  sans_oeufs: "🍳 Sans oeufs",
};

const HEALTH_LABELS: Record<string, string> = {
  cholesterol: "Cholestérol élevé",
  diabete: "Diabète ou prédiabète",
  hypertension: "Hypertension",
  osteoporose: "Ostéoporose ou ostéopénie",
  surpoids: "Surpoids",
  syndrome_metabolique: "Syndrome métabolique",
  thyroide: "Troubles thyroïdiens",
};

const ALTERNATIVES: Record<string, { from: string; to: string }[]> = {
  sans_lactose: [
    { from: "lait", to: "boisson d'amande ou de soja enrichie en calcium" },
    { from: "yaourt", to: "yaourt végétal au soja enrichi en calcium" },
    { from: "fromage", to: "fromage végétal, tofu lacto-fermenté, ou sardines (calcium)" },
    { from: "beurre", to: "purée d'amande ou huile d'olive" },
    { from: "crème", to: "crème de soja, d'avoine ou de coco" },
  ],
  sans_gluten: [
    { from: "pain", to: "pain sans gluten ou galettes de riz" },
    { from: "pâtes", to: "pâtes de riz, de quinoa ou de légumineuses" },
    { from: "semoule", to: "quinoa, polenta ou riz" },
    { from: "farine", to: "farine de riz, de sarrasin ou de pois chiche" },
  ],
  vegetarien: [
    { from: "viande", to: "tofu, tempeh, lentilles ou pois chiches" },
    { from: "poulet", to: "tempeh ou seitan" },
  ],
  vegan: [
    { from: "viande", to: "tofu, tempeh, lentilles" },
    { from: "poisson", to: "graines de lin, chia, noix (oméga-3)" },
    { from: "lait", to: "boisson de soja enrichie" },
    { from: "fromage", to: "fromage végétal ou levure maltée" },
    { from: "yaourt", to: "yaourt de soja enrichi" },
    { from: "oeuf", to: "tofu brouillé ou graines de chia" },
    { from: "miel", to: "sirop d'érable ou d'agave" },
  ],
  sans_poisson: [
    { from: "poisson", to: "graines de lin/chia, noix, huile de colza (oméga-3)" },
  ],
  sans_fruits_a_coque: [
    { from: "amande", to: "graines de tournesol ou de courge" },
    { from: "noix", to: "graines de chia ou de lin" },
  ],
  sans_oeufs: [
    { from: "oeuf", to: "tofu brouillé, ou graines de chia (1 c.à.s + 3 c.à.s d'eau)" },
  ],
};

function normalize(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

export function isFoodAllowed(name: string, dietary: string[] | null | undefined): boolean {
  if (!dietary || dietary.length === 0) return true;
  const n = normalize(String(name || ""));
  for (const code of dietary) {
    if (code.startsWith(RESTRICTION_PREFIX)) continue;
    const kws = DIET_KEYWORDS[code];
    if (!kws) continue;
    if (kws.some((kw) => n.includes(normalize(kw)))) return false;
  }
  return true;
}

export interface ProfileRestrictionsContext {
  dietaryCodes: string[];
  dietaryLabels: string[];
  healthCodes: string[];
  healthLabels: string[];
  healthOther: string | null;
  promptBlock: string;
}

export function buildProfileRestrictionsContext(
  profile: any,
): ProfileRestrictionsContext {
  const dietary: string[] = profile?.dietary_preferences || [];
  const healthCodes: string[] = profile?.health_conditions || [];
  const healthOther: string | null = profile?.health_other || null;

  const dietaryLabels = dietary
    .map((d) => d.startsWith(RESTRICTION_PREFIX) ? d.slice(RESTRICTION_PREFIX.length) : (DIET_LABELS[d] || d))
    .filter(Boolean);

  const healthLabels = healthCodes
    .map((c) => HEALTH_LABELS[c] || c)
    .concat(healthOther ? [healthOther] : []);

  const lines: string[] = [];
  if (dietaryLabels.length > 0) {
    lines.push(`⚠️ RESTRICTIONS ALIMENTAIRES STRICTES de l'utilisatrice : ${dietaryLabels.join(", ")}.`);
    lines.push(`Tu NE DOIS JAMAIS proposer ou mentionner un aliment incompatible avec ces restrictions, même en exemple ou en accompagnement.`);
    const alts: { from: string; to: string }[] = [];
    for (const code of dietary) {
      const a = ALTERNATIVES[code];
      if (a) alts.push(...a);
    }
    if (alts.length > 0) {
      lines.push(`Alternatives nutritionnelles à utiliser systématiquement :`);
      for (const a of alts) lines.push(`  • Au lieu de ${a.from} → ${a.to}`);
    }
  }
  if (healthLabels.length > 0) {
    lines.push(`\n⚠️ PATHOLOGIES / PROBLÈMES DE SANTÉ déclarés : ${healthLabels.join(", ")}.`);
    lines.push(`- Cholestérol : limite graisses saturées (charcuterie, fromages gras, beurre).`);
    lines.push(`- Diabète/prédiabète : index glycémique bas, pas de sucres rapides.`);
    lines.push(`- Hypertension : limite sel et produits transformés.`);
    lines.push(`- Ostéoporose : favorise calcium + vitamine D.`);
    lines.push(`- Surpoids : favorise rassasiants, protéines, fibres.`);
    lines.push(`- Syndrome métabolique : combine diabète + cholestérol + surpoids.`);
    lines.push(`- Troubles thyroïdiens : modère soja cru et crucifères crus.`);
  }
  if (lines.length > 0) {
    lines.push(`\nVÉRIFICATION FINALE OBLIGATOIRE : avant de répondre, relis ta réponse et supprime tout aliment interdit. Si une recette contient un aliment interdit, remplace-le par l'alternative équivalente.`);
  }

  return {
    dietaryCodes: dietary,
    dietaryLabels,
    healthCodes,
    healthLabels,
    healthOther,
    promptBlock: lines.join("\n"),
  };
}

// Filter a recipe object: returns true if recipe contains no forbidden ingredient.
export function isRecipeAllowed(recipe: any, dietary: string[] | null | undefined): boolean {
  if (!dietary || dietary.length === 0) return true;
  const name = String(recipe?.name || "");
  if (!isFoodAllowed(name, dietary)) return false;
  const ings = recipe?.ingredients;
  if (Array.isArray(ings)) {
    for (const ing of ings) {
      const ingName = typeof ing === "string" ? ing : String(ing?.name || "");
      if (!isFoodAllowed(ingName, dietary)) return false;
    }
  }
  const steps = recipe?.steps;
  if (Array.isArray(steps)) {
    for (const s of steps) {
      if (!isFoodAllowed(String(s), dietary)) return false;
    }
  }
  return true;
}
