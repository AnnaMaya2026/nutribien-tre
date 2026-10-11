import { describe, it, expect } from "vitest";
import { isFishRoeMismatch } from "@/lib/ciqualRoe";
import { scoreCandidate } from "../../supabase/functions/_shared/ciqualMatch";

describe("œuf = œuf de poule", () => {
  it("« oeufs » seul rejette les œufs de cabillaud", () => {
    expect(isFishRoeMismatch("oeufs", "Oeufs de cabillaud, fumés")).toBe(true);
    expect(isFishRoeMismatch("œuf", "Oeuf de lompe")).toBe(true);
    expect(scoreCandidate("oeufs", "Oeufs de cabillaud, fumés")).toBeLessThan(0);
  });
  it("accepte l'œuf de poisson si le poisson est nommé", () => {
    expect(isFishRoeMismatch("oeufs de saumon", "Oeufs de saumon")).toBe(false);
    expect(isFishRoeMismatch("oeufs de truite", "Oeufs de truite")).toBe(false);
  });
  it("l'œuf de poule n'est jamais rejeté", () => {
    expect(isFishRoeMismatch("oeuf", "Oeuf, cru")).toBe(false);
  });
});
