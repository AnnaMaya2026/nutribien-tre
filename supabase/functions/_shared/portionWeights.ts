// Poids de portion standards et conversion des quantités en grammes.
// Extrait de analyze-recipe-card pour être testable hors Deno (src/test).
// Ce sont des poids APPROXIMATIFS de portions courantes, jamais des valeurs
// nutritionnelles : la base retenue est toujours affichée à l'utilisatrice.

export const norm = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

// Table de poids standards — EXACTEMENT ces valeurs, aucune autre.
// Tout ingrédient en unités absent de cette table demande une saisie manuelle.
// Ce sont des poids de portion approximatifs, PAS des valeurs nutritionnelles :
// ils servent uniquement à convertir « 2 cuisses de canard » en grammes, et la
// base utilisée est toujours affichée à l'utilisatrice.
// ORDRE IMPORTANT : la première entrée qui correspond gagne, donc le plus
// spécifique doit précéder le plus général (« pomme de terre » avant « pomme »).
export const STANDARD_WEIGHTS: { keywords: string[]; grams: number; label: string }[] = [
  // — Viandes et volailles (à la pièce)
  { keywords: ["cuisse de canard"], grams: 200, label: "cuisse de canard" },
  { keywords: ["magret"], grams: 350, label: "magret de canard" },
  { keywords: ["supreme de poulet"], grams: 150, label: "suprême de poulet" },
  { keywords: ["supreme de volaille"], grams: 150, label: "suprême de volaille" },
  { keywords: ["cuisse de poulet"], grams: 150, label: "cuisse de poulet" },
  { keywords: ["blanc de poulet", "filet de poulet", "escalope de poulet"], grams: 150, label: "blanc de poulet" },
  { keywords: ["escalope de dinde", "filet de dinde"], grams: 120, label: "escalope de dinde" },
  { keywords: ["escalope de veau"], grams: 130, label: "escalope de veau" },
  { keywords: ["steak hache"], grams: 125, label: "steak haché" },
  { keywords: ["pave de boeuf", "steak"], grams: 150, label: "pavé de bœuf" },
  { keywords: ["cote de porc"], grams: 150, label: "côte de porc" },
  { keywords: ["merguez"], grams: 60, label: "merguez" },
  { keywords: ["saucisse"], grams: 70, label: "saucisse" },
  { keywords: ["tranche de jambon"], grams: 40, label: "tranche de jambon" },
  // — Poissons et fruits de mer (à la pièce)
  { keywords: ["pave de saumon", "filet de saumon"], grams: 130, label: "pavé de saumon" },
  { keywords: ["dos de cabillaud", "filet de cabillaud"], grams: 130, label: "dos de cabillaud" },
  { keywords: ["filet de colin", "filet de lieu", "filet de merlu"], grams: 130, label: "filet de poisson blanc" },
  { keywords: ["filet de truite"], grams: 120, label: "filet de truite" },
  { keywords: ["crevette", "gambas"], grams: 10, label: "crevette décortiquée" },
  { keywords: ["saint jacques", "saint-jacques"], grams: 20, label: "noix de Saint-Jacques" },
  // — Légumes (à la pièce)
  { keywords: ["carotte"], grams: 125, label: "carotte moyenne" },
  { keywords: ["oignon"], grams: 110, label: "oignon moyen" },
  { keywords: ["echalote", "échalote"], grams: 25, label: "échalote" },
  { keywords: ["gousse d'ail", "gousse ail", "ail"], grams: 4, label: "gousse d'ail" },
  { keywords: ["courgette"], grams: 250, label: "courgette" },
  { keywords: ["aubergine"], grams: 300, label: "aubergine" },
  { keywords: ["poivron"], grams: 150, label: "poivron" },
  { keywords: ["tomate cerise"], grams: 10, label: "tomate cerise" },
  { keywords: ["tomate"], grams: 120, label: "tomate" },
  { keywords: ["pomme de terre"], grams: 150, label: "pomme de terre" },
  { keywords: ["patate douce"], grams: 200, label: "patate douce" },
  { keywords: ["poireau"], grams: 150, label: "poireau" },
  { keywords: ["fenouil"], grams: 250, label: "bulbe de fenouil" },
  { keywords: ["brocoli"], grams: 500, label: "brocoli entier" },
  { keywords: ["chou-fleur", "chou fleur"], grams: 800, label: "chou-fleur entier" },
  { keywords: ["butternut"], grams: 900, label: "courge butternut entière" },
  { keywords: ["concombre"], grams: 350, label: "concombre" },
  { keywords: ["navet"], grams: 120, label: "navet" },
  { keywords: ["panais"], grams: 150, label: "panais" },
  { keywords: ["betterave"], grams: 150, label: "betterave" },
  { keywords: ["endive"], grams: 120, label: "endive" },
  { keywords: ["champignon"], grams: 20, label: "champignon de Paris" },
  { keywords: ["radis"], grams: 15, label: "radis" },
  { keywords: ["celeri branche", "céleri branche"], grams: 60, label: "branche de céleri" },
  { keywords: ["sucrine", "salade", "laitue"], grams: 150, label: "salade" },
  { keywords: ["avocat"], grams: 140, label: "avocat (chair)" },
  // — Fruits (à la pièce)
  { keywords: ["citron vert", "lime"], grams: 70, label: "citron vert" },
  { keywords: ["citron"], grams: 100, label: "citron" },
  { keywords: ["clementine", "clémentine", "mandarine"], grams: 70, label: "clémentine" },
  { keywords: ["orange"], grams: 180, label: "orange" },
  { keywords: ["banane"], grams: 120, label: "banane (chair)" },
  { keywords: ["pomme"], grams: 150, label: "pomme" },
  { keywords: ["poire"], grams: 160, label: "poire" },
  { keywords: ["kiwi"], grams: 80, label: "kiwi" },
  // — Divers
  { keywords: ["oeuf", "œuf"], grams: 50, label: "œuf (sans coquille)" },
  { keywords: ["tortilla", "galette de ble", "galette de blé", "wrap"], grams: 40, label: "tortilla de blé" },
  { keywords: ["pain pita", "pita"], grams: 60, label: "pain pita" },
  { keywords: ["tranche de pain"], grams: 30, label: "tranche de pain" },
];

// Cuillères : uniquement les valeurs fournies
export const SPOON_WEIGHTS: { unit: string; food: RegExp; grams: number; label: string }[] = [
  { unit: "cas", food: /huile/i, grams: 10, label: "cuillère à soupe d'huile" },
  { unit: "cac", food: /huile/i, grams: 5, label: "cuillère à café d'huile" },
  { unit: "cas", food: /beurre/i, grams: 15, label: "cuillère à soupe de beurre" },
];

/**
 * Correspondance sur mot entier, pluriel toléré. Un simple `includes` faisait
 * correspondre « ail » à l'intérieur de « volaille » : une escalope de volaille
 * était alors comptée pour 4 g.
 */
export function matchesKeyword(normalizedName: string, keyword: string): boolean {
  const words = norm(keyword).split(/[^a-z0-9]+/).filter(Boolean);
  if (!words.length) return false;
  // Pluriel toléré sur CHAQUE mot : « cuisses de canard » doit correspondre à
  // « cuisse de canard », sinon « pommes de terre » retombe sur « pomme ».
  const pattern = words
    .map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "(?:s|x)?")
    .join("[^a-z0-9]+");
  return new RegExp(`(?:^|[^a-z0-9])${pattern}(?:[^a-z0-9]|$)`).test(normalizedName);
}

/** Convertit une quantité d'ingrédient en grammes, ou null si inconnue. */
export function toGrams(
  name: string,
  quantity: number | null,
  unit: string | null,
): { grams: number | null; basis: string } {
  const u = (unit || "").toLowerCase().trim();
  if (quantity === null) return { grams: null, basis: "quantité absente" };
  if (u === "g" || u === "gr" || u === "gramme" || u === "grammes") return { grams: quantity, basis: "grammes lus" };
  if (u === "ml" || u === "cl" || u === "l") {
    const ml = u === "cl" ? quantity * 10 : u === "l" ? quantity * 1000 : quantity;
    return { grams: ml, basis: "volume lu (1 ml ≈ 1 g)" };
  }
  if (u === "cas" || u === "cac" || u === "cuillere" || u === "cuillère") {
    const sp = SPOON_WEIGHTS.find((s) => s.unit === (u === "cas" || u === "cuillere" || u === "cuillère" ? "cas" : "cac") && s.food.test(name));
    if (sp) return { grams: quantity * sp.grams, basis: sp.label };
    return { grams: null, basis: "cuillère non listée" };
  }
  // Unités : table de poids standards
  const n = norm(name);
  const hit = STANDARD_WEIGHTS.find((w) => w.keywords.some((k) => matchesKeyword(n, k)));
  if (hit) return { grams: quantity * hit.grams, basis: `${hit.label} = ${hit.grams} g` };
  return { grams: null, basis: "poids standard inconnu" };
}

// Herbes et aromates : sans quantité, ou en brins / branches / pincée / bouquet,
// ils sont ignorés comme le sel et le poivre (apport négligeable, poids inconnu).
const HERBS = ["romarin", "thym", "persil", "basilic", "ciboulette", "coriandre", "laurier",
  "menthe", "aneth", "estragon", "origan", "sauge", "cerfeuil"];
const HERB_UNITS = /\b(brins?|branches?|pincees?|bouquets?|qq|quelques|feuilles?)\b/;

export function isIgnorableHerb(name: string, quantity: number | null, unit: string | null): boolean {
  const n = norm(name);
  if (!HERBS.some((h) => matchesKeyword(n, h))) return false;
  if (quantity === null) return true;
  const u = norm(unit || "");
  if (HERB_UNITS.test(u) || HERB_UNITS.test(n)) return true;
  return !["g", "gr", "gramme", "grammes"].includes(u.trim());
}

/** Poids max (g) d'un ingrédient introuvable dans CIQUAL ignoré sans saisie, comme le sel. */
export const MAX_IGNORED_UNMATCHED_GRAMS = 30;

/** Ingrédient introuvable : ignoré (information seulement) si son poids connu est ≤ seuil. */
export function isIgnorableUnmatched(grams: number | null): boolean {
  return grams !== null && grams > 0 && grams <= MAX_IGNORED_UNMATCHED_GRAMS;
}
