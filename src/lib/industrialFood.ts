// Detects truly industrial / ultra-processed prepared foods.
// Only flag based on product name/category keywords — not based on packaging,
// barcode presence, or healthy items like muesli, yaourt, conserves, etc.

const INDUSTRIAL_KEYWORDS = [
  "plat cuisine",
  "plat cuisiné",
  "plat prepare",
  "plat préparé",
  "pizza",
  "lasagne",
  "lasagnes",
  "quiche",
  "nuggets",
  "cordon bleu",
  "cordon-bleu",
  "hachis parmentier",
  "gratin preemballe",
  "gratin préemballé",
  "burger",
  "hamburger",
  "hot dog",
  "hot-dog",
  "soupe en sachet",
  "soupe sachet",
];

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

/**
 * Returns true ONLY if the food name/category clearly matches a known
 * industrial/ultra-processed prepared dish.
 *
 * Never flags healthy basics: muesli, granola, céréales, yaourt, fromage,
 * lait, conserves de légumes, poisson en boîte, pain, biscottes, fruits,
 * légumes, etc.
 */
export function isIndustrialFood(name?: string | null, category?: string | null): boolean {
  if (!name && !category) return false;
  const haystack = normalize(`${name ?? ""} ${category ?? ""}`);
  return INDUSTRIAL_KEYWORDS.some((kw) => haystack.includes(normalize(kw)));
}
