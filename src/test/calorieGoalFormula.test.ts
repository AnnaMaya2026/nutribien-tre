import { describe, expect, it } from "vitest";
import { calculateBMR, calculateCalorieGoal, calorieGoalDetails, missingBodyData } from "@/lib/calorieGoal";

describe("Objectif calorique : Mifflin-St Jeor et plancher", () => {
  it("calcule le métabolisme de base d'une femme", () => {
    // (10 × 61) + (6,25 × 165) − (5 × 55) − 161 = 1205,25
    expect(calculateBMR({ weight: 61, height: 165, age: 55 })).toBe(1205);
  });
  it("applique le niveau d'activité et l'objectif", () => {
    const base = { weight: 61, height: 165, age: 55, activityLevel: "leger" };
    expect(calculateCalorieGoal({ ...base, objective: "maintenir" })).toBe(1657);
    expect(calculateCalorieGoal({ ...base, objective: "perte_poids" })).toBe(1357);
    expect(calculateCalorieGoal({ ...base, objective: "gain_muscle" })).toBe(1957);
  });
  it("ne descend jamais sous le métabolisme de base", () => {
    // 55 kg, 1,58 m, 62 ans, sédentaire, perte de poids : 1067 × 1,2 − 300 = 980 < 1067
    const d = calorieGoalDetails({ weight: 55, height: 158, age: 62, activityLevel: "sedentaire", objective: "perte_poids" });
    expect(d.bmr).toBe(1067);
    expect(d.goal).toBe(1067);
    expect(d.floored).toBe(true);
    expect(calorieGoalDetails({ weight: 61, height: 165, age: 55, activityLevel: "leger", objective: "perte_poids" }).floored).toBe(false);
  });
  it("signale les données manquantes au lieu de les passer sous silence", () => {
    expect(missingBodyData({ weight: 61, height: 165, age: 55 })).toEqual([]);
    expect(missingBodyData({ weight: null, height: 165, age: 0 })).toEqual(["ton poids", "ton âge"]);
    expect(calorieGoalDetails({ height: 165 }).missing).toEqual(["ton poids", "ton âge"]);
  });
});
