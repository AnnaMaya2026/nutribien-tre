import { describe, expect, it } from "vitest";
import { calculateProteinGoal, calculateFatsGoal, calculateCarbsGoal, OBJECTIVES } from "@/lib/calorieGoal";

describe("Objectifs de macronutriments", () => {
  it.each(OBJECTIVES.map(({ value }) => value))("61 kg et 1450 kcal : 73 g, 56 g et 163 g pour %s", (objective) => {
    const proteins = calculateProteinGoal(1450, 61, objective);
    const fats = calculateFatsGoal(1450);
    expect(proteins).toBe(73);
    expect(fats).toBe(56);
    expect(calculateCarbsGoal(1450, proteins, fats)).toBe(163);
  });

  it.each([
    ["maintenir", 98], ["perte_poids", 116], ["gain_muscle", 109], ["osseux", 127],
  ] as const)("un poids absent conserve l'ancien calcul pour %s", (objective, expected) => {
    expect(calculateProteinGoal(1450, undefined, objective)).toBe(expected);
  });

  it.each([null, 0, -61, NaN, Infinity])("un poids nul ou invalide (%s) conserve l'ancien calcul", (weight) => {
    expect(calculateProteinGoal(1450, weight, "maintenir")).toBe(98);
  });

  it("les glucides ne sont jamais négatifs même si les autres objectifs dépassent les calories", () => {
    expect(calculateCarbsGoal(100, 73, 56)).toBe(0);
    expect(calculateCarbsGoal(796, 73, 56)).toBe(0);
  });
});