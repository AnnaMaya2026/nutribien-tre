import { FAT_ENERGY_SHARE, FIBRES_GOAL_G, PROTEIN_G_PER_KG } from "@/lib/nutrientReferences";

// Objectif calorique journalier : métabolisme de base (Mifflin-St Jeor, femmes)
// × facteur d'activité, ajusté selon l'objectif, avec un plancher au métabolisme de base.

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

export interface BodyData {
  weight?: number | null;
  height?: number | null;
  age?: number | null;
}

/**
 * Valeurs utilisées quand une donnée du profil manque. L'objectif n'est alors
 * pas personnel : les écrans le disent (voir missingBodyData).
 */
export const DEFAULT_BODY = { weight: 60, height: 165, age: 50 } as const;

const BODY_LABELS = { weight: "ton poids", height: "ta taille", age: "ton âge" } as const;

const positive = (v: unknown) => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : null;
};

/** Données du profil manquantes pour un calcul personnel (libellés prêts à afficher). */
export function missingBodyData(params: BodyData): string[] {
  return (["weight", "height", "age"] as const).filter((k) => positive(params[k]) == null).map((k) => BODY_LABELS[k]);
}

/**
 * Métabolisme de base, formule de Mifflin-St Jeor pour une femme :
 * (10 × poids) + (6,25 × taille) − (5 × âge) − 161.
 */
export function calculateBMR(params: BodyData): number {
  const weight = positive(params.weight) ?? DEFAULT_BODY.weight;
  const height = positive(params.height) ?? DEFAULT_BODY.height;
  const age = positive(params.age) ?? DEFAULT_BODY.age;
  return Math.round(10 * weight + 6.25 * height - 5 * age - 161);
}

/** Ajustement de l'objectif en perte de poids ou en gain musculaire (kcal/jour). */
export const OBJECTIVE_ADJUSTMENT_KCAL = 300;

export interface CalorieGoalDetails {
  bmr: number;
  /** Dépense du jour : métabolisme de base × niveau d'activité. */
  maintenance: number;
  goal: number;
  /** L'objectif a été remonté au métabolisme de base (plancher). */
  floored: boolean;
  /** Données du profil manquantes : l'objectif n'est pas personnel. */
  missing: string[];
}

/**
 * Objectif calorique = métabolisme de base × niveau d'activité, ajusté selon
 * l'objectif, sans jamais descendre sous le métabolisme de base.
 */
export function calorieGoalDetails(params: BodyData & { activityLevel?: string | null; objective?: string | null }): CalorieGoalDetails {
  const bmr = calculateBMR(params);
  const maintenance = Math.round(bmr * getActivityLevel(params.activityLevel).factor);
  const objective = params.objective || "maintenir";
  let goal = maintenance;
  if (objective === "perte_poids") goal -= OBJECTIVE_ADJUSTMENT_KCAL;
  else if (objective === "gain_muscle") goal += OBJECTIVE_ADJUSTMENT_KCAL;
  const floored = goal < bmr;
  return { bmr, maintenance, goal: floored ? bmr : goal, floored, missing: missingBodyData(params) };
}

export function calculateCalorieGoal(params: BodyData & { activityLevel?: string | null; objective?: string | null }): number {
  return calorieGoalDetails(params).goal;
}

export { PROTEIN_G_PER_KG, FAT_ENERGY_SHARE };

/** Protéines (g) selon le poids ; ancien pourcentage si le poids est indisponible. */
export function calculateProteinGoal(tdee: number, weight?: number | null, objective?: string | null): number {
  if (typeof weight === "number" && Number.isFinite(weight) && weight > 0) {
    return Math.round(weight * PROTEIN_G_PER_KG);
  }
  const obj = objective || "maintenir";
  let proteinPercent = 0.27; // standard
  if (obj === "perte_poids") proteinPercent = 0.32;
  else if (obj === "gain_muscle") proteinPercent = 0.30;
  else if (obj === "osseux") proteinPercent = 0.35;
  return Math.round((tdee * proteinPercent) / 4);
}

/** Glucides (g) = énergie restante après les objectifs de protéines et de lipides. */
export function calculateCarbsGoal(tdee: number, proteins: number, fats: number): number {
  return Math.max(0, Math.round((tdee - proteins * 4 - fats * 9) / 4));
}

/** Lipides (g) = part fixe de l'énergie / 9. */
export function calculateFatsGoal(tdee: number): number {
  return Math.round((tdee * FAT_ENERGY_SHARE) / 9);
}

/** Fibres : repère lu dans la table unique (nutrientReferences). */
export const FIBRES_GOAL = FIBRES_GOAL_G;
export const FIBRES_GOAL_MIN = FIBRES_GOAL;
export const FIBRES_GOAL_MAX = FIBRES_GOAL;

