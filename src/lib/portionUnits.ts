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

export function getDefaultPortion(foodName: string): number {
  return isLiquidFoodName(foodName) ? 200 : 100;
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