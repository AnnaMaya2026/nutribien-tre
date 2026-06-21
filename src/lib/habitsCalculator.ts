// Hydration calculation helpers for default habits.

export const HYDRATION_GLASS_ML = 250;

export type HydrationPlan = {
  target: number;
  label: string;
  glassSize: number;
  note: string;
};

/**
 * Compute daily hydration target based on body weight.
 * Formula: 35 mL per kg, rounded to nearest 250 mL glass.
 *
 * Example: 60 kg → 2.1 L → 8 verres/jour (250 mL each)
 */
export function calculateHydration(weightKg: number): HydrationPlan {
  const waterLiters = Number((weightKg * 0.035).toFixed(1));
  const glassesPerDay = Math.round((waterLiters * 1000) / HYDRATION_GLASS_ML);
  return {
    target: glassesPerDay,
    label: `${glassesPerDay} verres/jour (${waterLiters}L)`,
    glassSize: HYDRATION_GLASS_ML,
    note: "1 verre = 250 mL",
  };
}
