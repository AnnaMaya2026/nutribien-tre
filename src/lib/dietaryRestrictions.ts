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
