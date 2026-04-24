// Calcul de l'objectif calorique journalier selon Mifflin-St Jeor (femmes)
// puis multiplication par un facteur d'activité.

export const ACTIVITY_LEVELS = [
  { value: "sedentaire", label: "Sédentaire", factor: 1.2, description: "Peu ou pas d'exercice" },
  { value: "leger", label: "Légèrement actif", factor: 1.375, description: "Exercice léger 1-3j/sem" },
  { value: "modere", label: "Modérément actif", factor: 1.55, description: "Exercice modéré 3-5j/sem" },
  { value: "actif", label: "Très actif", factor: 1.725, description: "Exercice intense 6-7j/sem" },
] as const;

export type ActivityLevel = typeof ACTIVITY_LEVELS[number]["value"];

export function getActivityFactor(level?: string | null): number {
  return ACTIVITY_LEVELS.find((a) => a.value === level)?.factor ?? 1.2;
}

/** Mifflin-St Jeor pour une femme : 10·poids + 6.25·taille − 5·âge − 161 */
export function calculateCalorieGoal(params: {
  weight?: number | null;
  height?: number | null;
  age?: number | null;
  activityLevel?: string | null;
}): number {
  const weight = Number(params.weight) || 60;
  const height = Number(params.height) || 165;
  const age = Number(params.age) || 50;
  const bmr = 10 * weight + 6.25 * height - 5 * age - 161;
  const tdee = bmr * getActivityFactor(params.activityLevel);
  return Math.max(1200, Math.round(tdee / 10) * 10);
}

export function calculateProteinGoal(weightKg?: number | null): number {
  return Math.max(1, Math.round((Number(weightKg) || 60) * 1.0));
}
