import { describe, expect, it } from "vitest";
import {
  CIQUAL_MATCH_THRESHOLD,
  scoreCandidate,
  type CiqualMatchContext,
} from "../../supabase/functions/_shared/ciqualMatch";

// Text-only CIQUAL candidates: no nutritional values are fabricated.
const RICE_NAMES = ["Riz rond blanc, cuit, non salé", "Riz rond blanc, cru"];
const NOODLE_NAMES = ["Nouilles asiatiques, cuites, non salées", "Nouilles asiatiques, sèches"];

function bestName(query: string, names: string[], context?: CiqualMatchContext) {
  const candidates = names.map((nom) => ({ nom, score: scoreCandidate(query, nom, "", context) }));
  candidates.sort((a, b) => b.score - a.score);
  const best = candidates[0];
  return best && best.score >= CIQUAL_MATCH_THRESHOLD ? best.nom : null;
}

describe("CIQUAL raw ingredients context for recipe cards", () => {
  it("chooses raw round white rice for a recipe card", () => {
    expect(bestName("riz rond blanc", RICE_NAMES, { ingredientsBruts: true }))
      .toBe("Riz rond blanc, cru");
  });

  it("still chooses cooked round white rice without context", () => {
    expect(bestName("riz rond blanc", RICE_NAMES))
      .toBe("Riz rond blanc, cuit, non salé");
  });

  it("chooses dried Asian noodles for a recipe card", () => {
    expect(bestName("nouilles asiatiques", NOODLE_NAMES, { ingredientsBruts: true }))
      .toBe("Nouilles asiatiques, sèches");
  });

  it("recognizes non-cooked rice rather than treating it as cooked", () => {
    expect(bestName("riz rond blanc", [RICE_NAMES[0], "Riz rond blanc, non cuit"], { ingredientsBruts: true }))
      .toBe("Riz rond blanc, non cuit");
  });

  it("preserves an explicitly requested cooked form on a recipe card", () => {
    expect(bestName("riz rond blanc cuit", RICE_NAMES, { ingredientsBruts: true }))
      .toBe("Riz rond blanc, cuit, non salé");
  });
});