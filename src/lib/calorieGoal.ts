// Calcul de l'objectif calorique journalier selon Harris-Benedict (femmes)
// puis multiplication par un facteur d'activité (NAP) et ajustement selon l'objectif.

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

export const OBJECTIVES = [
  { value: "maintenir", label: "Maintien", description: "Conserver mon poids actuel" },
  { value: "perte_poids", label: "Perte de poids", description: "Déficit calorique modéré (-300 kcal)" },
  { value: "gain_muscle", label: "Gain musculaire", description: "Surplus calorique modéré (+300 kcal)" },
  { value: "osseux", label: "Santé osseuse", description: "Apports riches en protéines & calcium" },
] as const;

export type Objective = typeof OBJECTIVES[number]["value"];

export function getActivityLevel(level?: string | null) {
  const normalized = (level || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  return (
    ACTIVITY_LEVELS.find((a) => a.value === normalized) ?? ACTIVITY_LEVELS[0]
  );
}

export function getObjective(value?: string | null) {
  return OBJECTIVES.find((o) => o.value === (value || "")) ?? OBJECTIVES[0];
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

/** TDEE = BMR × NAP, ajusté selon l'objectif. Pas de plancher. */
export function calculateCalorieGoal(params: {
  weight?: number | null;
  height?: number | null;
  age?: number | null;
  activityLevel?: string | null;
  objective?: string | null;
}): number {
  const bmr = calculateBMR(params);
  const level = getActivityLevel(params.activityLevel);
  let tdee = bmr * level.factor;

  const objective = params.objective || "maintenir";
  if (objective === "perte_poids") {
    tdee -= 300;
  } else if (objective === "gain_muscle") {
    tdee += 300;
  }

  const final = Math.round(tdee);
  if (typeof window !== "undefined") {
    console.log("[calorieGoal]", {
      weight: params.weight,
      height: params.height,
      age: params.age,
      activity_level: params.activityLevel,
      objective,
      BMR: bmr,
      NAP: level.factor,
      TDEE: final,
    });
  }
  return final;
}

/** Protéines (g) = (TDEE × %protéines) / 4  —  ajusté selon objectif */
export function calculateProteinGoal(tdee: number, objective?: string | null): number {
  const obj = objective || "maintenir";
  let proteinPercent = 0.27; // standard
  if (obj === "perte_poids") proteinPercent = 0.32;
  else if (obj === "gain_muscle") proteinPercent = 0.30;
  else if (obj === "osseux") proteinPercent = 0.35;
  return Math.round((tdee * proteinPercent) / 4);
}

/** Glucides (g) = (TDEE × %) / 4  —  42% si perte de poids, sinon 48% */
export function calculateCarbsGoal(tdee: number, objective?: string | null): number {
  const carbsPercent = (objective || "maintenir") === "perte_poids" ? 0.42 : 0.48;
  return Math.round((tdee * carbsPercent) / 4);
}

/** Lipides (g) = (TDEE × 0.22) / 9 — fixe pour équilibre hormonal */
export function calculateFatsGoal(tdee: number, _objective?: string | null): number {
  return Math.round((tdee * 0.22) / 9);
}

/** Fibres : recommandation fixe 25g/jour. */
export const FIBRES_GOAL_MIN = 25;
export const FIBRES_GOAL_MAX = 25;
export const FIBRES_GOAL = 25;

