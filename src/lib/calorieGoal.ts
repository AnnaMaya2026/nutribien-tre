// Calcul de l'objectif calorique journalier selon Mifflin-St Jeor (femmes)
// puis multiplication par un facteur d'activité (NAP) et application de planchers minimums.

export const ACTIVITY_LEVELS = [
  {
    value: "sedentaire",
    label: "Sédentaire",
    factor: 1.4,
    minCalories: 1800,
    description: "Peu ou pas d'exercice",
  },
  {
    value: "leger",
    label: "Légèrement actif",
    factor: 1.6,
    minCalories: 2000,
    description: "1-3 fois/semaine",
  },
  {
    value: "modere",
    label: "Modérément actif",
    factor: 1.8,
    minCalories: 2300,
    description: "3-5 fois/semaine",
  },
  {
    value: "actif",
    label: "Très actif",
    factor: 2.0,
    minCalories: 2400,
    description: "6-7 fois/semaine",
  },
] as const;

export type ActivityLevel = typeof ACTIVITY_LEVELS[number]["value"];

export function getActivityLevel(level?: string | null) {
  return ACTIVITY_LEVELS.find((a) => a.value === level) ?? ACTIVITY_LEVELS[0];
}

export function getActivityFactor(level?: string | null): number {
  return getActivityLevel(level).factor;
}

/** Mifflin-St Jeor pour une femme : 10·poids + 6.25·taille − 5·âge − 161 */
export function calculateBMR(params: {
  weight?: number | null;
  height?: number | null;
  age?: number | null;
}): number {
  const weight = Number(params.weight) || 60;
  const height = Number(params.height) || 165;
  const age = Number(params.age) || 50;
  return Math.round(10 * weight + 6.25 * height - 5 * age - 161);
}

/** TDEE = BMR × NAP, puis plancher minimum selon niveau d'activité. */
export function calculateCalorieGoal(params: {
  weight?: number | null;
  height?: number | null;
  age?: number | null;
  activityLevel?: string | null;
}): number {
  const bmr = calculateBMR(params);
  const level = getActivityLevel(params.activityLevel);
  const tdee = bmr * level.factor;
  const withFloor = Math.max(level.minCalories, tdee);
  const final = Math.round(withFloor / 10) * 10;
  if (typeof window !== "undefined") {
    console.log("[calorieGoal]", {
      weight: params.weight,
      height: params.height,
      age: params.age,
      activity_level: params.activityLevel,
      BMR: bmr,
      NAP: level.factor,
      TDEE: Math.round(tdee),
      final,
    });
  }
  return final;
}

export function calculateProteinGoal(weightKg?: number | null): number {
  return Math.max(1, Math.round((Number(weightKg) || 60) * 1.0));
}

/** Glucides (g) = (TDEE × 0.50) / 4 */
export function calculateCarbsGoal(tdee: number): number {
  return Math.round((tdee * 0.5) / 4);
}

/** Lipides (g) = (TDEE × 0.30) / 9 */
export function calculateFatsGoal(tdee: number): number {
  return Math.round((tdee * 0.3) / 9);
}

/** Fibres : recommandation OMS 25-30g/jour pour les femmes adultes. */
export const FIBRES_GOAL_MIN = 25;
export const FIBRES_GOAL_MAX = 30;
