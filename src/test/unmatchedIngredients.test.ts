import { describe, it, expect } from "vitest";
import { isIgnorableUnmatched, MAX_IGNORED_UNMATCHED_GRAMS } from "../../supabase/functions/_shared/portionWeights";
import { applySynonyms } from "../../supabase/functions/_shared/ciqualMatch";

describe("ingrédients introuvables dans CIQUAL", () => {
  it("seuil à 30 g", () => expect(MAX_IGNORED_UNMATCHED_GRAMS).toBe(30));
  it("5 g ignoré", () => expect(isIgnorableUnmatched(5)).toBe(true));
  it("30 g ignoré", () => expect(isIgnorableUnmatched(30)).toBe(true));
  it("31 g non ignoré", () => expect(isIgnorableUnmatched(31)).toBe(false));
  it("poids inconnu non ignoré", () => expect(isIgnorableUnmatched(null)).toBe(false));
  it("parmigiano reggiano → parmesan", () => {
    expect(applySynonyms("parmigiano reggiano râpé")).toBe("parmesan rape");
    expect(applySynonyms("grana padano")).toBe("parmesan");
  });
});
