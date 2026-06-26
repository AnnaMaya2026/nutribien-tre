// Centralized sanitation for per-100g nutrient values before they hit the DB.
// Catches OpenFoodFacts / GPT unit mistakes (IU vs µg, mg vs g, etc.).

export type SanitizableKey =
  | "calories" | "proteins" | "carbs" | "fats" | "fibres"
  | "calcium" | "vitamin_d" | "magnesium" | "iron" | "omega3"
  | "phytoestrogens" | "vitamin_b12" | "potassium" | "zinc"
  | "vitamin_k" | "vitamin_b6" | "vitamin_b9" | "vitamin_e";

// Per-100g physiological ceilings. Anything above is either bad unit or noise.
const CEIL_PER_100G: Record<string, number> = {
  calories: 900,      // pure fat
  proteins: 100,
  carbs: 100,
  fats: 100,
  fibres: 80,
  calcium: 2000,      // mg ; only dried seaweed/herbs go higher
  vitamin_d: 100,     // µg
  magnesium: 1000,
  iron: 100,
  omega3: 60,         // g — only flax/cameline oil go up to ~53
  phytoestrogens: 1000,
  vitamin_b12: 100,   // µg
  potassium: 5000,    // mg
  zinc: 100,          // mg
  vitamin_k: 1500,    // µg (kale leaves can reach ~700)
  vitamin_b6: 10,     // mg
  vitamin_b9: 2000,   // µg
  vitamin_e: 100,     // mg
};

/**
 * Sanitize a per-100g value. `isOil` lets us keep legitimately huge omega-3 in oils.
 * Returns a corrected value (or 0 if hopelessly wrong).
 */
export function sanitizePer100g(
  key: SanitizableKey,
  raw: number,
  foodName = ""
): number {
  if (!isFinite(raw) || raw < 0) return 0;
  let v = raw;
  const name = foodName.toLowerCase();
  const isOil = /huile|oil/.test(name);

  // Vitamin D: IU → µg (1 IU = 0.025 µg). Real foods rarely > 50µg/100g.
  if (key === "vitamin_d" && v > 50) v = v / 40;

  // Omega-3 commonly arrives in mg from GPT; CIQUAL stores grams.
  // > 60 g/100g is impossible (even pure oils cap ~53). Treat as mg → g.
  if (key === "omega3" && !isOil && v > 60) v = v / 1000;

  // Zinc sometimes arrives in µg.
  if (key === "zinc" && v > 100) v = v / 1000;

  const ceil = CEIL_PER_100G[key];
  if (ceil !== undefined && v > ceil) return 0;
  return v;
}

/** Sanitize an already-scaled (consumed) value using the same rules, scaled. */
export function sanitizeConsumed(
  key: SanitizableKey,
  raw: number,
  grams: number,
  foodName = ""
): number {
  if (!isFinite(raw) || raw < 0) return 0;
  if (!grams || grams <= 0) return raw;
  const per100 = (raw / grams) * 100;
  const cleaned = sanitizePer100g(key, per100, foodName);
  return +(cleaned * (grams / 100)).toFixed(2);
}
