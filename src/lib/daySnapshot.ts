import {
  calculateCalorieGoal,
  calculateCarbsGoal,
  calculateFatsGoal,
  calculateProteinGoal,
  FIBRES_GOAL,
} from "@/lib/calorieGoal";
import { NUTRIENT_REFERENCES, omega3GoalG, type ReferenceKey } from "@/lib/nutrientReferences";
import { calculateMealTargets } from "@/utils/mealTargetsCalculator";

/**
 * Photographie des chiffres du jour, calculée une seule fois et de la même
 * façon pour l'accueil et pour tout ce qui est envoyé à Sophie (chat, récap,
 * message du soir, défi) : alimentation + compléments cochés.
 */
export interface SnapshotNutrient {
  key: string;
  label: string;
  value: number;
  goal: number;
  unit: string;
  /** Atteint à partir de 80 % du repère, comme les barres de l'accueil. */
  reached: boolean;
  /** Nutriments du récap du jour. */
  primary: boolean;
}

export interface DaySnapshot {
  calories: number;
  calorieGoal: number;
  caloriesRemaining: number;
  foodCount: number;
  macros: Record<"proteins" | "carbs" | "fats", { value: number; goal: number }>;
  nutrients: SnapshotNutrient[];
  meals: { key: string; label: string; target: number; eaten: number }[];
}

type Contributions = Record<string, { amount: number } | undefined>;

const round1 = (n: number) => Math.round(n * 10) / 10;

export function buildDaySnapshot(opts: { profile: any; logs: any[]; contributions: Contributions }): DaySnapshot {
  const { profile: p, logs, contributions } = opts;
  const sum = (key: string) => logs.reduce((acc, l) => acc + (Number(l?.[key]) || 0), 0);
  const sup = (key: string, divisor = 1) => (contributions[key]?.amount || 0) / divisor;

  const calorieGoal = calculateCalorieGoal({
    weight: p?.weight,
    height: p?.height,
    age: p?.age,
    activityLevel: p?.activity_level,
    objective: p?.objective,
  });
  const proteinGoal = calculateProteinGoal(calorieGoal, p?.weight, p?.objective);
  const fatsGoal = calculateFatsGoal(calorieGoal);
  const carbsGoal = calculateCarbsGoal(calorieGoal, proteinGoal, fatsGoal);

  const calories = Math.round(sum("calories") + sup("calories"));
  const proteins = sum("proteins") + sup("proteins");

  const nutrient = (key: string, label: string, value: number, goal: number, unit: string, primary: boolean): SnapshotNutrient => ({
    key,
    label,
    value: round1(value),
    goal,
    unit,
    reached: goal > 0 ? (value / goal) * 100 >= 80 : true,
    primary,
  });
  const ref = (key: ReferenceKey, primary: boolean) => {
    const r = NUTRIENT_REFERENCES[key];
    return nutrient(key, r.label, sum(key) + sup(key), r.target, r.unit, primary);
  };

  const nutrients: SnapshotNutrient[] = [
    ref("calcium", true),
    ref("vitamin_d", true),
    ref("magnesium", true),
    ref("iron", true),
    // Les journaux sont en g, les compléments en mg.
    nutrient("omega3", "Oméga-3", sum("omega3") + sup("omega3", 1000), omega3GoalG(calorieGoal) ?? 0, "g", true),
    ref("vitamin_b12", true),
    nutrient("fibres", "Fibres", sum("fibres") + sup("fibres"), FIBRES_GOAL, "g", true),
    nutrient("proteins", "Protéines", proteins, proteinGoal, "g", true),
    ref("potassium", false),
    ref("zinc", false),
    ref("vitamin_k", false),
    ref("vitamin_b6", false),
    ref("vitamin_b9", false),
    ref("vitamin_e", false),
  ];

  const meals = calculateMealTargets(calorieGoal, proteinGoal, carbsGoal, fatsGoal).map((t) => ({
    key: t.key,
    label: t.label,
    target: Math.round(t.calories),
    eaten: Math.round(
      logs.filter((l) => (l.meal_type || "autre") === t.key).reduce((acc, l) => acc + (Number(l.calories) || 0), 0),
    ),
  }));

  return {
    calories,
    calorieGoal,
    caloriesRemaining: Math.max(0, calorieGoal - calories),
    foodCount: logs.length,
    macros: {
      proteins: { value: Math.round(proteins), goal: proteinGoal },
      carbs: { value: Math.round(sum("carbs") + sup("carbs")), goal: carbsGoal },
      fats: { value: Math.round(sum("fats") + sup("fats")), goal: fatsGoal },
    },
    nutrients,
    meals,
  };
}
