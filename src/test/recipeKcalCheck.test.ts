import { describe, it, expect } from "vitest";
import { isKcalGapBlocking, APPROX_KCAL_MAX_GAP } from "@/lib/recipeKcalCheck";
describe("écart kcal fiche recette", () => {
  it("seuil 20 %", () => expect(APPROX_KCAL_MAX_GAP).toBe(0.2));
  it("181 contre 607 bloque", () => expect(isKcalGapBlocking(181, 607)).toBe(true));
  it("590 contre 607 ne bloque pas", () => expect(isKcalGapBlocking(590, 607)).toBe(false));
  it("valeur absente ne bloque pas", () => expect(isKcalGapBlocking(181, null)).toBe(false));
});
