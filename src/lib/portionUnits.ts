// No multi-word phrases — strict word-boundary matching only to avoid
// false positives on cooked solid foods (e.g. "asperges bouillies").
const LIQUID_PHRASES: string[] = [];

// Strict whitelist of pure liquids only. Word-boundary match on normalized text.
const LIQUID_WORDS = [
  "lait",
  "laits",
  "jus",
  "eau",
  "eaux",
  "cafe",
  "cafes",
  "the",
  "thes",
  "soda",
  "sodas",
  "biere",
  "bieres",
];

// Oils are tracked separately because they need a density conversion (0.92 g/ml)
// but should still display in ml when used as a liquid measure (e.g. spoon volumes).
const OIL_WORDS = ["huile", "huiles"];

const STANDARD_PORTIONS = [
  { keywords: ["oeuf", "œuf"], amount: 55, description: "1 œuf moyen" },
  { keywords: ["yaourt"], amount: 125, description: "1 pot" },
  { keywords: ["fromage"], amount: 30, description: "1 portion" },
  { keywords: ["croissant"], amount: 50, description: "1 croissant" },
  { keywords: ["baguette"], amount: 60, description: "1 portion" },
  { keywords: ["pain"], amount: 30, description: "1 tranche" },
  { keywords: ["cereales", "céréales"], amount: 40, description: "1 bol" },
  { keywords: ["banane"], amount: 120, description: "1 banane" },
  { keywords: ["pomme"], amount: 150, description: "1 pomme" },
  { keywords: ["orange"], amount: 150, description: "1 orange" },
  { keywords: ["kiwi"], amount: 80, description: "1 kiwi" },
  { keywords: ["fraise"], amount: 150, description: "1 portion" },
  { keywords: ["carotte"], amount: 80, description: "1 carotte" },
  { keywords: ["tomate"], amount: 120, description: "1 tomate" },
  { keywords: ["courgette"], amount: 200, description: "1 courgette" },
  { keywords: ["poulet"], amount: 150, description: "1 portion" },
  { keywords: ["saumon"], amount: 150, description: "1 portion" },
  { keywords: ["steak"], amount: 150, description: "1 steak" },
  { keywords: ["jambon"], amount: 45, description: "2 tranches" },
  { keywords: ["beurre"], amount: 10, description: "1 noix" },
  { keywords: ["huile"], amount: 10, description: "1 cuillère" },
  { keywords: ["noix"], amount: 30, description: "1 poignée" },
];

function normalizeFoodName(foodName: string): string {
  return foodName
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function hasWord(normalized: string, word: string): boolean {
  // Word-boundary match on already-normalized (accent-stripped, lowercased) text.
  const re = new RegExp(`(^|[^a-z0-9])${word}([^a-z0-9]|$)`, "i");
  return re.test(normalized);
}

export function isOilFoodName(foodName: string): boolean {
  const normalized = normalizeFoodName(foodName);
  return OIL_WORDS.some((w) => hasWord(normalized, w));
}

export function isLiquidFoodName(foodName: string): boolean {
  const normalized = normalizeFoodName(foodName);
  if (LIQUID_PHRASES.some((p) => normalized.includes(p))) return true;
  if (LIQUID_WORDS.some((w) => hasWord(normalized, w))) return true;
  if (isOilFoodName(foodName)) return true;
  return false;
}

export function getPortionUnit(foodName: string): "g" | "ml" {
  return isLiquidFoodName(foodName) ? "ml" : "g";
}

export function getStandardPortion(foodName: string): { amount: number; description: string } | null {
  const normalized = normalizeFoodName(foodName);
  return STANDARD_PORTIONS.find((portion) =>
    portion.keywords.some((keyword) => normalized.includes(normalizeFoodName(keyword)))
  ) || null;
}

export function getDefaultPortion(foodName: string): number {
  return getStandardPortion(foodName)?.amount || (isLiquidFoodName(foodName) ? 200 : 100);
}

export function getPortionStep(foodName: string): number {
  return isLiquidFoodName(foodName) ? 25 : 10;
}

export function amountToNutritionGrams(foodName: string, amount: number): number {
  return isOilFoodName(foodName) ? amount * 0.92 : amount;
}

export function formatPortion(foodName: string, amount: number | null | undefined): string {
  return `${amount || getDefaultPortion(foodName)}${getPortionUnit(foodName)}`;
}

export function formatStandardPortionHint(foodName: string): string {
  const standard = getStandardPortion(foodName);
  const amount = standard?.amount || getDefaultPortion(foodName);
  const description = standard?.description || (getPortionUnit(foodName) === "ml" ? "1 verre" : "portion moyenne");
  return `Portion standard : ${amount}${getPortionUnit(foodName)} (${description})`;
}