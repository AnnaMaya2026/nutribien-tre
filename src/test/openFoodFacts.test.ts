import { describe, expect, it } from "vitest";
import { fillMissingFromCiqual, readOffMicros } from "@/lib/openFoodFacts";

describe("Code-barres : unités d'Open Food Facts", () => {
  it("convertit les grammes en mg et en µg", () => {
    // Lait : 0,12 g de calcium = 120 mg ; 0,000001 g de vitamine D = 1 µg
    const m = readOffMicros({ calcium_100g: 0.12, "vitamin-d_100g": 0.000001, "vitamin-b12_100g": 0.0000004, iron_100g: 0.0021, "omega-3-fat_100g": 1.5 });
    expect(m.calcium).toBe(120);
    expect(m.vitamin_d).toBe(1);
    expect(m.vitamin_b12).toBe(0.4);
    expect(m.iron).toBe(2.1);
    expect(m.omega3).toBe(1.5);
    expect(m.magnesium).toBeNull();
  });
  it("complète seulement les nutriments absents avec CIQUAL, sans écraser l'étiquette", () => {
    const m = readOffMicros({ calcium_100g: 0.12 });
    const filled = fillMissingFromCiqual(m, { calcium_100g: 999, magnesium_100g: 11, fer_100g: null, vitamine_d_100g: 0.05 });
    expect(m.calcium).toBe(120);
    expect(m.magnesium).toBe(11);
    expect(m.iron).toBeNull();
    expect(filled.sort()).toEqual(["magnesium", "vitamin_d"]);
  });
});
