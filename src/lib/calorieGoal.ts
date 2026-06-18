// Calcul de l'objectif calorique journalier selon Harris-Benedict (femmes)
// puis multiplication par un facteur d'activité (NAP).

export const ACTIVITY_LEVELS = [
  {
    value: "sedentaire",
    label: "Sédentaire",
    factor: 1.2,
    description: "Peu ou pas d'exercice",
  },
  {
    value: "leger",
    label: "Légèrement actif",
    factor: 1.375,
    description: "1-3 fois/semaine",
  },
  {
    value: "modere",
    label: "Modérément actif",
    factor: 1.55,
    description: "3-5 fois/semaine",
  },
  {
    value: "actif",
    label: "Très actif",
    factor: 1.725,
    description: "6-7 fois/semaine",
  },
] as const;

export type ActivityLevel = typeof ACTIVITY_LEVELS[number]["value"];

export function getActivityLevel(level?: string | null) {
  const normalized = (level || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  return (
    ACTIVITY_LEVELS.find((a) => a.value === normalized) ?? ACTIVITY_LEVELS[0]
  );
}


export function getActivityFactor(level?: string | null): number {
  return getActivityLevel(level).factor;
}

/** Harris-Benedict pour une femme : 655 + (9,6 × poids) + (1,8 × taille) − (4,7 × âge) */
export function calculateBMR(params: {
  weight?: number | null;
  height?: number | null;
  age?: number | null;
}): number {
  const weight = Number(params.weight) || 60;
  const height = Number(params.height) || 165;
  const age = Number(params.age) || 50;
  return Math.round(655 + 9.6 * weight + 1.8 * height - 4.7 * age);
}

/** TDEE = BMR × NAP, sans plancher minimum. */
export function calculateCalorieGoal(params: {
  weight?: number | null;
  height?: number | null;
  age?: number | null;
  activityLevel?: string | null;
}): number {
  const bmr = calculateBMR(params);
  const level = getActivityLevel(params.activityLevel);
  const tdee = bmr * level.factor;
  const final = Math.round(tdee);
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
  return Math.max(1, Math.round((Number(weightKg) || 60) * 1.2));
}

/** Glucides (g) = (TDEE × 0.50) / 4 */
export function calculateCarbsGoal(tdee: number): number {
  return Math.round((tdee * 0.5) / 4);
}

/** Lipides (g) = (TDEE × 0.30) / 9 */
export function calculateFatsGoal(tdee: number): number {
  return Math.round((tdee * 0.3) / 9);
}

/** Fibres : recommandation fixe 25g/jour. */
export const FIBRES_GOAL_MIN = 25;
export const FIBRES_GOAL_MAX = 25;
export const FIBRES_GOAL = 25;

