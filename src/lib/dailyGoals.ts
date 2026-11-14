import { calculateCalorieGoal, calculateProteinGoal } from "@/lib/calorieGoal";
import { NUTRIENT_REFERENCES, omega3GoalG } from "@/lib/nutrientReferences";

/**
 * Objectifs du jour d'une utilisatrice, calculés comme sur l'accueil :
 * repères ANSES de la table unique, protéines selon le poids,
 * oméga-3 selon l'objectif calorique.
 */
export function getDailyGoals(profile: any) {
  const calorieGoal = calculateCalorieGoal({
    weight: profile?.weight,
    height: profile?.height,
    age: profile?.age,
    activityLevel: profile?.activity_level,
    objective: profile?.objective,
  });
  return {
    calorieGoal,
    proteins: calculateProteinGoal(calorieGoal, profile?.weight, profile?.objective),
    omega3: omega3GoalG(calorieGoal) ?? 0,
    calcium: NUTRIENT_REFERENCES.calcium.target,
    vitamin_d: NUTRIENT_REFERENCES.vitamin_d.target,
    magnesium: NUTRIENT_REFERENCES.magnesium.target,
    iron: NUTRIENT_REFERENCES.iron.target,
  };
}
