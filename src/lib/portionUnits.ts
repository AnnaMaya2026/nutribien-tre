// Strict whitelist: ONLY these standalone words trigger ml.
const LIQUID_WORDS = [
  "lait", "laits",
  "jus",
  "cafe", "cafes",
  "the", "thes",
  "soda", "sodas",
  "biere", "bieres",
  "vin", "vins",
  "smoothie", "smoothies",
  "eau", "eaux",
];

// STRICT solid override: even if a liquid word appears in the name
// (e.g. "Feta au lait de brebis"), these foods MUST always be in grams.
const SOLID_WORDS = [
  // Cheeses
  "fromage", "fromages", "feta", "brie", "camembert", "gruyere", "emmental",
  "emmenthal", "chevre", "roquefort", "comte", "mozzarella", "parmesan",
  "ricotta", "cheddar", "reblochon", "munster", "tomme", "raclette", "edam",
  "gouda", "mascarpone", "burrata", "halloumi", "pecorino", "manchego",
  // Dairy solids
  "yaourt", "yaourts", "skyr", "faisselle",
  // Meats / fish / eggs / charcuterie
  "poulet", "boeuf", "porc", "agneau", "veau", "dinde", "canard", "lapin",
  "jambon", "bacon", "saucisse", "saucisson", "steak", "viande", "viandes",
  "saumon", "thon", "cabillaud", "morue", "sardine", "maquereau", "truite",
  "crevette", "crevettes", "poisson", "poissons", "oeuf", "oeufs",
  // Cooking descriptors (force solid)
  "emiette", "rape", "tranche", "grille", "cuit", "cuite", "roti", "fume",
  "cru", "crue",
  // Grains / legumes
  "pain", "pains", "riz", "pates", "quinoa", "boulgour", "semoule",
  "lentille", "lentilles", "pois", "haricot", "haricots", "feve",
  "cereale", "cereales", "avoine", "ble", "epeautre",
  // Other solids
  "tofu", "tempeh", "seitan", "noix", "amande", "amandes", "noisette",
  "noisettes", "graine", "graines", "biscuit", "biscuits", "gateau",
  "chocolat", "beurre", "huile", "olive", "olives",
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

function hasWord(normalized: string, word: string): boolean {
  const re = new RegExp(`(^|[^a-z0-9])${word}([^a-z0-9]|$)`, "i");
  return re.test(normalized);
}

export function isOilFoodName(_foodName: string): boolean {
  // Oils are now treated as solid grams (no density conversion).
  return false;
}

export function isLiquidFoodName(foodName: string): boolean {
  const normalized = normalizeFoodName(foodName);
  // STRICT: solid override always wins, even if "lait", "eau"… appears in name
  if (SOLID_WORDS.some((w) => hasWord(normalized, w))) return false;
  return LIQUID_WORDS.some((w) => hasWord(normalized, w));
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

export function amountToNutritionGrams(_foodName: string, amount: number): number {
  // 1 ml ≈ 1 g for the supported pure liquids (water-based beverages).
  return amount;
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
