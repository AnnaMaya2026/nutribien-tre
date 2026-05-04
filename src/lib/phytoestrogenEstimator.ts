// Estimate phytoestrogen content (mg per 100g) when a scanned product
// reports 0/null. Values are conservative, well-established food estimates.

export const PHYTO_KEYWORDS: { keywords: string[]; mg_per_100g: number }[] = [
  { keywords: ["graines de lin", "graine de lin", "lin moulu", "lin "], mg_per_100g: 379380 },
  { keywords: ["tempeh"], mg_per_100g: 24300 },
  { keywords: ["tofu"], mg_per_100g: 27150 },
  { keywords: ["edamame"], mg_per_100g: 27150 },
  { keywords: ["soja", "soy "], mg_per_100g: 27150 },
  { keywords: ["lentille"], mg_per_100g: 3600 },
  { keywords: ["pois chiche", "pois-chiche"], mg_per_100g: 1800 },
];

function norm(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

export function estimatePhytoestrogensPer100g(productName: string): number {
  const n = norm(productName);
  for (const entry of PHYTO_KEYWORDS) {
    if (entry.keywords.some((k) => n.includes(norm(k)))) {
      return entry.mg_per_100g;
    }
  }
  return 0;
}
