import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import {
  NUTRIENT_REFERENCES,
  FIBRES_GOAL_G,
  PROTEIN_G_PER_KG,
  amountForUpperLimit,
  keyNutrientGoals,
  omega3GoalG,
  phytoestrogensMaxMg,
  proteinGoalFromWeight,
} from "@/lib/nutrientReferences";
import { estimatePhytoestrogensPer100g } from "@/lib/phytoestrogenEstimator";
import { nutrientStatus } from "@/hooks/useSupplements";

describe("Table unique des repères (ANSES 2021, femme ménopausée)", () => {
  it("porte les valeurs validées", () => {
    const expected: Record<string, [number, number | null]> = {
      calcium: [950, 2500],
      vitamin_d: [15, 100],
      magnesium: [300, 250],
      iron: [11, 40],
      zinc: [9.3, 25],
      vitamin_b12: [4, null],
      vitamin_b9: [330, 1000],
      vitamin_b6: [1.6, 12],
      vitamin_e: [9, 300],
      vitamin_k: [79, null],
      potassium: [3500, null],
      selenium: [70, 255],
      vitamin_c: [110, null],
    };
    for (const [key, [target, limit]] of Object.entries(expected)) {
      const r = NUTRIENT_REFERENCES[key as keyof typeof NUTRIENT_REFERENCES];
      expect([key, r.target, r.upperLimit]).toEqual([key, target, limit]);
    }
    expect(Object.keys(NUTRIENT_REFERENCES).sort()).toEqual(Object.keys(expected).sort());
    expect(FIBRES_GOAL_G).toBe(30);
    expect(PROTEIN_G_PER_KG).toBe(1.2);
  });

  it("calcule protéines, oméga-3 et seuil de phytoestrogènes", () => {
    expect(proteinGoalFromWeight(61)).toBe(73);
    expect(proteinGoalFromWeight(null)).toBeNull();
    // 1800 kcal : ALA = 1 % = 18 kcal = 2 g, + 0,5 g EPA/DHA
    expect(omega3GoalG(1800)).toBe(2.5);
    expect(omega3GoalG(null)).toBeNull();
    // 0,02 mg/kg × 61 kg
    expect(phytoestrogensMaxMg(61)).toBe(1.2);
    expect(phytoestrogensMaxMg(undefined)).toBeNull();
  });

  it("compare le magnésium des compléments seuls à la limite de sécurité", () => {
    expect(amountForUpperLimit("magnesium", 400, 100)).toBe(100);
    expect(amountForUpperLimit("calcium", 400, 100)).toBe(500);
    const fromFood = nutrientStatus({ key: "magnesium", food: 600 });
    expect(fromFood.overLimit).toBe(false);
    const fromSupplements = nutrientStatus({
      key: "magnesium",
      food: 100,
      contribution: { amount: 495, sources: [] } as any,
    });
    expect(fromSupplements.overLimit).toBe(true);
    expect(fromSupplements.target).toBe(300);
  });

  it("donne les mêmes objectifs clés aux fonctions serveur", () => {
    const goals = keyNutrientGoals(1800);
    expect(goals.iron.goal).toBe(11);
    expect(goals.vitamin_d.goal).toBe(15);
    expect(goals.omega3.goal).toBe(2.5);
    expect(keyNutrientGoals(null).omega3).toBeUndefined();
  });
});

describe("Phytoestrogènes : valeurs de secours", () => {
  it("donne des mg réalistes pour le soja et null ailleurs", () => {
    expect(estimatePhytoestrogensPer100g("Tofu nature bio")).toBe(27.15);
    expect(estimatePhytoestrogensPer100g("Boisson au soja")).toBeLessThan(10);
    expect(estimatePhytoestrogensPer100g("Graines de lin")).toBeNull();
    expect(estimatePhytoestrogensPer100g("Yaourt nature")).toBeNull();
  });
});

describe("Aucun repère réécrit ailleurs", () => {
  const ALLOWED = ["supabase/functions/_shared/nutrientReferences.ts"];
  const walk = (dir: string): string[] =>
    readdirSync(dir).flatMap((name) => {
      const p = join(dir, name);
      if (statSync(p).isDirectory()) return name === "test" || name === "node_modules" ? [] : walk(p);
      return /\.(ts|tsx)$/.test(name) && !/\.test\.tsx?$/.test(name) ? [p] : [];
    });
  const files = [...walk("src"), ...walk("supabase/functions")].filter(
    (f) => !ALLOWED.includes(f.replace(/\\/g, "/")) && !f.endsWith("types.ts"),
  );
  // Motifs des anciens repères en dur : « goal: 1200 », « / 18mg », « Objectif : 320mg ».
  const FORBIDDEN = [
    /\b(calcium|vitamin_[a-z0-9]+|magnesium|iron|zinc|potassium|omega3|phytoestrogens)\s*:\s*\{[^}\n]*\b(goal|target)\s*:\s*\d/,
    /\/\s*\d+(\.\d+)?\s?(mg|µg)\b/,
    /Objectif\s*:\s*\d+([.,]\d+)?(-\d+)?\s?(mg|µg|g)\s*\/\s*jour/,
    /DAILY_TARGETS/,
  ];
  it("ne trouve aucun repère en dur dans les écrans ni les fonctions serveur", () => {
    const hits: string[] = [];
    for (const f of files) {
      readFileSync(f, "utf8")
        .split("\n")
        .forEach((line, i) => {
          if (FORBIDDEN.some((re) => re.test(line))) hits.push(`${f}:${i + 1}: ${line.trim().slice(0, 100)}`);
        });
    }
    expect(hits).toEqual([]);
  });
});
