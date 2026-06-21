// Répartition cible des macronutriments par repas.
// Calories & Glucides & Lipides : 25 / 35 / 30 / 10
// Protéines : 20 / 35 / 30 / 15

export type MealKey = "petit-dejeuner" | "dejeuner" | "diner" | "collation";

export interface MealSplit {
  key: MealKey;
  label: string;
  emoji: string;
  caloriesPct: number;
  proteinsPct: number;
}

export const MEAL_SPLITS: MealSplit[] = [
  { key: "petit-dejeuner", label: "Petit-déjeuner", emoji: "🌅", caloriesPct: 0.25, proteinsPct: 0.20 },
  { key: "dejeuner",       label: "Déjeuner",       emoji: "🍽️", caloriesPct: 0.35, proteinsPct: 0.35 },
  { key: "diner",          label: "Dîner",          emoji: "🌙", caloriesPct: 0.30, proteinsPct: 0.30 },
  { key: "collation",      label: "Collation",      emoji: "☕", caloriesPct: 0.10, proteinsPct: 0.15 },
];

export interface MealTarget {
  key: MealKey;
  label: string;
  emoji: string;
  caloriesPct: number;
  calories: number;
  proteins: number;
  carbs: number;
  fats: number;
}

/**
 * Calcule les cibles par repas à partir des totaux journaliers.
 * @param totalCalories TDEE journalier (kcal)
 * @param totalProteins Objectif protéines journalier (g)
 * @param totalCarbs Objectif glucides journalier (g)
 * @param totalFats Objectif lipides journalier (g)
 */
export function calculateMealTargets(
  totalCalories: number,
  totalProteins: number,
  totalCarbs: number,
  totalFats: number,
): MealTarget[] {
  return MEAL_SPLITS.map((m) => ({
    key: m.key,
    label: m.label,
    emoji: m.emoji,
    caloriesPct: m.caloriesPct,
    calories: Math.round(totalCalories * m.caloriesPct),
    proteins: Math.round(totalProteins * m.proteinsPct),
    carbs: Math.round(totalCarbs * m.caloriesPct),
    fats: Math.round(totalFats * m.caloriesPct),
  }));
}
