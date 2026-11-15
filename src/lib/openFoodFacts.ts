// Lecture des micronutriments d'Open Food Facts.
//
// Les champs « _100g » d'Open Food Facts sont tous exprimés en GRAMMES pour
// 100 g, vitamines et minéraux compris. L'appli travaille en mg ou en µg :
// chaque valeur est donc convertie ici, et nulle part ailleurs.

export type OffMicroKey =
  | "calcium" | "magnesium" | "iron" | "potassium" | "zinc" | "vitamin_b6" | "vitamin_e"
  | "vitamin_d" | "vitamin_b12" | "vitamin_k" | "vitamin_b9" | "omega3";

const G_TO_MG = 1000;
const G_TO_UG = 1_000_000;

/** Champ Open Food Facts et facteur de conversion vers l'unité de l'appli. */
const OFF_FIELDS: Record<OffMicroKey, { field: string; factor: number }> = {
  calcium: { field: "calcium_100g", factor: G_TO_MG },
  magnesium: { field: "magnesium_100g", factor: G_TO_MG },
  iron: { field: "iron_100g", factor: G_TO_MG },
  potassium: { field: "potassium_100g", factor: G_TO_MG },
  zinc: { field: "zinc_100g", factor: G_TO_MG },
  vitamin_b6: { field: "vitamin-b6_100g", factor: G_TO_MG },
  vitamin_e: { field: "vitamin-e_100g", factor: G_TO_MG },
  vitamin_d: { field: "vitamin-d_100g", factor: G_TO_UG },
  vitamin_b12: { field: "vitamin-b12_100g", factor: G_TO_UG },
  vitamin_k: { field: "vitamin-k_100g", factor: G_TO_UG },
  vitamin_b9: { field: "vitamin-b9_100g", factor: G_TO_UG },
  omega3: { field: "omega-3-fat_100g", factor: 1 },
};

/** Colonne CIQUAL correspondante (déjà dans l'unité de l'appli). */
export const CIQUAL_FIELDS: Record<OffMicroKey, string> = {
  calcium: "calcium_100g",
  magnesium: "magnesium_100g",
  iron: "fer_100g",
  potassium: "potassium_100g",
  zinc: "zinc_100g",
  vitamin_b6: "vitamine_b6_100g",
  vitamin_e: "vitamine_e_100g",
  vitamin_d: "vitamine_d_100g",
  vitamin_b12: "vitamine_b12_100g",
  vitamin_k: "vitamine_k_100g",
  vitamin_b9: "vitamine_b9_100g",
  omega3: "omega3_total_100g",
};

export const OFF_MICRO_KEYS = Object.keys(OFF_FIELDS) as OffMicroKey[];

const num = (v: unknown): number | null => {
  if (v === undefined || v === null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : null;
};

/** Micronutriments pour 100 g dans l'unité de l'appli (mg, µg, g) ; null = non fourni. */
export function readOffMicros(nutriments: Record<string, unknown> | null | undefined): Record<OffMicroKey, number | null> {
  const out = {} as Record<OffMicroKey, number | null>;
  for (const key of OFF_MICRO_KEYS) {
    const v = num(nutriments?.[OFF_FIELDS[key].field]);
    out[key] = v === null ? null : Math.round(v * OFF_FIELDS[key].factor * 1000) / 1000;
  }
  return out;
}

/**
 * Complète, nutriment par nutriment, ce qu'Open Food Facts ne fournit pas
 * avec la ligne CIQUAL la plus proche. Renvoie les clés complétées.
 */
export function fillMissingFromCiqual(
  micros: Record<OffMicroKey, number | null>,
  ciqualRow: Record<string, unknown> | null | undefined,
): OffMicroKey[] {
  const filled: OffMicroKey[] = [];
  if (!ciqualRow) return filled;
  for (const key of OFF_MICRO_KEYS) {
    if (micros[key] !== null) continue;
    const v = num(ciqualRow[CIQUAL_FIELDS[key]]);
    if (v !== null) {
      micros[key] = v;
      filled.push(key);
    }
  }
  return filled;
}
