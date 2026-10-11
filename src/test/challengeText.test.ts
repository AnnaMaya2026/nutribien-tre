import { describe, it, expect } from "vitest";
import { cleanChallengeText, parisDateKey } from "@/lib/challengeText";

describe("défi Sophie", () => {
  it("retire « Demain : , » en tête", () => {
    expect(cleanChallengeText("Demain : , ajoute une poignée d'amandes")).toBe("Ajoute une poignée d'amandes");
  });
  it("retire une virgule orpheline", () => {
    expect(cleanChallengeText(", ajoute du yaourt")).toBe("Ajoute du yaourt");
  });
  it("demain en heure de Paris (23h30 Paris = 21h30 UTC)", () => {
    expect(parisDateKey(new Date("2026-10-11T21:30:00Z"), 1)).toBe("2026-10-12");
    // 00h30 Paris le 12 alors que UTC est encore le 11
    expect(parisDateKey(new Date("2026-10-11T22:30:00Z"), 1)).toBe("2026-10-13");
  });
});
