const LIQUID_KEYWORDS = [
  "lait",
  "boisson",
  "jus",
  "eau",
  "café",
  "cafe",
  "thé",
  "the",
  "tisane",
  "infusion",
  "soda",
  "limonade",
  "bière",
  "biere",
  "vin",
  "cidre",
  "champagne",
  "alcool",
  "smoothie",
  "milkshake",
  "kéfir",
  "kefir",
  "yaourt à boire",
  "yaourt a boire",
  "soupe",
  "bouillon",
  "crème liquide",
  "creme liquide",
  "huile",
];

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

export function isLiquidFoodName(foodName: string): boolean {
  const normalized = normalizeFoodName(foodName);
  return LIQUID_KEYWORDS.some((keyword) => normalized.includes(normalizeFoodName(keyword)));
}

export function isOilFoodName(foodName: string): boolean {
  return normalizeFoodName(foodName).includes("huile");
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