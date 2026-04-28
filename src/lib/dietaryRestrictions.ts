// Shared dietary restrictions list and helpers
// Stored in profiles.dietary_preferences (existing column)

export type DietaryRestriction = {
  value: string;
  label: string;
  emoji: string;
  // Keywords used to detect "contains" warnings on food names (lowercased, accent-insensitive)
  containsKeywords: string[];
};

export const DIETARY_RESTRICTIONS: DietaryRestriction[] = [
  {
    value: "sans_lactose",
    label: "Sans lactose",
    emoji: "🥛",
    containsKeywords: [
      "lait", "fromage", "yaourt", "yogourt", "beurre", "creme", "crème",
      "mozzarella", "cheddar", "parmesan", "emmental", "comte", "comté",
      "ricotta", "feta", "camembert", "brie", "gruyere", "gruyère",
      "lactose", "lactique", "petit-suisse", "fromage blanc",
    ],
  },
  {
    value: "sans_gluten",
    label: "Sans gluten",
    emoji: "🌾",
    containsKeywords: [
      "ble", "blé", "pain", "pates", "pâtes", "pasta", "couscous",
      "semoule", "farine", "biscuit", "gateau", "gâteau", "brioche",
      "croissant", "pizza", "orge", "seigle", "epeautre", "épeautre",
      "boulgour", "tarte", "viennoiserie",
    ],
  },
  {
    value: "vegetarien",
    label: "Végétarien",
    emoji: "🥩",
    containsKeywords: [
      "boeuf", "bœuf", "porc", "veau", "agneau", "poulet", "dinde",
      "canard", "lapin", "jambon", "saucisse", "saucisson", "bacon",
      "lardon", "merguez", "pate", "pâté", "viande", "steak", "escalope",
      "rôti", "roti", "cote", "côte", "gibier", "foie",
    ],
  },
  {
    value: "vegan",
    label: "Végétalien / Vegan",
    emoji: "🌱",
    containsKeywords: [
      "boeuf", "bœuf", "porc", "veau", "agneau", "poulet", "dinde",
      "canard", "lapin", "jambon", "saucisse", "viande", "steak",
      "poisson", "saumon", "thon", "cabillaud", "merlu", "sardine",
      "crevette", "fruits de mer", "lait", "fromage", "yaourt", "beurre",
      "creme", "crème", "oeuf", "œuf", "miel",
    ],
  },
  {
    value: "sans_poisson",
    label: "Sans poisson",
    emoji: "🐟",
    containsKeywords: [
      "poisson", "saumon", "thon", "cabillaud", "merlu", "sardine",
      "maquereau", "hareng", "anchois", "truite", "bar", "dorade",
      "sole", "lieu", "colin", "crevette", "moule", "huitre", "huître",
      "calamar", "fruits de mer", "crustace", "crustacé",
    ],
  },
  {
    value: "sans_fruits_a_coque",
    label: "Sans fruits à coque",
    emoji: "🥜",
    containsKeywords: [
      "amande", "noix", "noisette", "cajou", "pistache", "pecan", "pécan",
      "macadamia", "fruits a coque", "fruits à coque", "praline", "praliné",
      "nutella", "frangipane",
    ],
  },
  {
    value: "sans_oeufs",
    label: "Sans oeufs",
    emoji: "🍳",
    containsKeywords: [
      "oeuf", "œuf", "omelette", "mayonnaise", "meringue", "quiche",
      "flan", "souffle", "soufflé", "frittata", "brouille",
    ],
  },
];

const RESTRICTION_PREFIX = "other:";

// Split stored values into known codes + free-text "other"
export function splitDietary(stored: string[] | null | undefined) {
  const arr = stored || [];
  const codes = arr.filter((v) => !v.startsWith(RESTRICTION_PREFIX));
  const other = arr.find((v) => v.startsWith(RESTRICTION_PREFIX));
  return {
    codes,
    other: other ? other.slice(RESTRICTION_PREFIX.length) : "",
  };
}

export function buildDietary(codes: string[], other: string): string[] {
  const trimmed = other.trim();
  return trimmed ? [...codes, `${RESTRICTION_PREFIX}${trimmed}`] : [...codes];
}

function normalize(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

// Returns label of the first restriction whose keyword appears in the food name.
export function detectRestrictionWarning(
  foodName: string,
  restrictions: string[] | null | undefined
): { label: string } | null {
  if (!restrictions || restrictions.length === 0) return null;
  const name = normalize(foodName);
  for (const code of restrictions) {
    if (code.startsWith(RESTRICTION_PREFIX)) continue;
    const def = DIETARY_RESTRICTIONS.find((d) => d.value === code);
    if (!def) continue;
    const hit = def.containsKeywords.find((kw) => name.includes(normalize(kw)));
    if (hit) return { label: def.label };
  }
  return null;
}

export function getDietaryLabels(stored: string[] | null | undefined): string[] {
  const { codes, other } = splitDietary(stored);
  const labels = codes
    .map((c) => DIETARY_RESTRICTIONS.find((d) => d.value === c)?.label || c);
  if (other) labels.push(other);
  return labels;
}

// Convenience: is this food allowed given the user's restrictions?
export function isFoodAllowed(
  foodName: string,
  restrictions: string[] | null | undefined
): boolean {
  return detectRestrictionWarning(foodName, restrictions) === null;
}

// Suggested nutritionally-equivalent alternatives keyed by restriction code.
// Used to recommend a substitute when an excluded food would have been suggested.
export const RESTRICTION_ALTERNATIVES: Record<string, { from: string; to: string }[]> = {
  sans_lactose: [
    { from: "lait", to: "boisson d'amande ou de soja enrichie en calcium" },
    { from: "yaourt", to: "yaourt végétal au soja enrichi en calcium" },
    { from: "fromage", to: "fromage végétal, tofu lacto-fermenté, ou sardines (calcium)" },
    { from: "beurre", to: "purée d'amande ou huile d'olive" },
    { from: "crème", to: "crème de soja, d'avoine ou de coco" },
  ],
  sans_gluten: [
    { from: "pain", to: "pain sans gluten (sarrasin, riz) ou galettes de riz" },
    { from: "pâtes", to: "pâtes de riz, de quinoa ou de légumineuses" },
    { from: "semoule", to: "quinoa, polenta ou riz" },
    { from: "farine", to: "farine de riz, de sarrasin ou de pois chiche" },
  ],
  vegetarien: [
    { from: "viande", to: "tofu, tempeh, lentilles ou pois chiches (protéines)" },
    { from: "poulet", to: "tempeh ou seitan" },
    { from: "boeuf", to: "lentilles + quinoa (fer + protéines)" },
  ],
  vegan: [
    { from: "viande", to: "tofu, tempeh, lentilles" },
    { from: "poisson", to: "algues + graines de lin (oméga-3) ou noix" },
    { from: "lait", to: "boisson de soja enrichie en calcium et B12" },
    { from: "fromage", to: "fromage végétal ou levure maltée" },
    { from: "yaourt", to: "yaourt de soja enrichi" },
    { from: "oeuf", to: "tofu brouillé ou graines de chia (liant)" },
    { from: "miel", to: "sirop d'érable ou d'agave" },
  ],
  sans_poisson: [
    { from: "poisson", to: "graines de lin/chia, noix ou huile de colza (oméga-3)" },
    { from: "saumon", to: "noix + graines de lin" },
    { from: "sardine", to: "tofu enrichi en calcium + graines de chia" },
  ],
  sans_fruits_a_coque: [
    { from: "amande", to: "graines de tournesol ou de courge" },
    { from: "noix", to: "graines de chia ou de lin" },
    { from: "noisette", to: "graines de tournesol" },
  ],
  sans_oeufs: [
    { from: "oeuf", to: "tofu brouillé, ou graines de chia (1 c. à s. + 3 c. à s. d'eau)" },
  ],
};

export function getAlternativesForRestrictions(
  restrictions: string[] | null | undefined
): { from: string; to: string }[] {
  if (!restrictions || restrictions.length === 0) return [];
  const out: { from: string; to: string }[] = [];
  for (const code of restrictions) {
    const alts = RESTRICTION_ALTERNATIVES[code];
    if (alts) out.push(...alts);
  }
  return out;
}

// Build a string block to inject into AI system prompts
export function buildAIRestrictionsBlock(
  dietary: string[] | null | undefined,
  healthLabels: string[] | null | undefined
): string {
  const dietLabels = getDietaryLabels(dietary);
  const alts = getAlternativesForRestrictions(dietary);
  const parts: string[] = [];
  if (dietLabels.length > 0) {
    parts.push(`⚠️ RESTRICTIONS ALIMENTAIRES STRICTES: ${dietLabels.join(", ")}.`);
    parts.push(`Tu NE DOIS JAMAIS proposer un aliment incompatible avec ces restrictions, même en exemple.`);
    if (alts.length > 0) {
      parts.push(`Alternatives à utiliser systématiquement :`);
      for (const a of alts) parts.push(`  • Au lieu de ${a.from} → ${a.to}`);
    }
  }
  if (healthLabels && healthLabels.length > 0) {
    parts.push(`\n⚠️ PATHOLOGIES DÉCLARÉES : ${healthLabels.join(", ")}. Adapte tes conseils en conséquence.`);
  }
  parts.push(`\nVÉRIFICATION FINALE : avant d'envoyer la réponse, relis-la et supprime tout aliment interdit.`);
  return parts.join("\n");
}

