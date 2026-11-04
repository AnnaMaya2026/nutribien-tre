import { describe, expect, it } from "vitest";
import { FIBRES_GOAL, FIBRES_GOAL_MIN, FIBRES_GOAL_MAX } from "@/lib/calorieGoal";
import { FIBRES_GOAL_G } from "../../supabase/functions/_shared/nutritionTargets";

describe("Objectif de fibres adulte", () => {
  it("utilise 30 g pour le front et le serveur", () => {
    expect(FIBRES_GOAL).toBe(30);
    expect(FIBRES_GOAL_MIN).toBe(30);
    expect(FIBRES_GOAL_MAX).toBe(30);
    expect(FIBRES_GOAL_G).toBe(30);
    expect(FIBRES_GOAL).toBe(FIBRES_GOAL_G);
  });
});