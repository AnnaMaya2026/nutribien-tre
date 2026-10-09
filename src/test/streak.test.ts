import { describe, it, expect } from "vitest";
import { computeStreak, shiftKey, parisKey } from "@/hooks/useStreakData";

const days = (start: string, n: number) => new Set(Array.from({ length: n }, (_, i) => shiftKey(start, -i)));

describe("série de jours complets", () => {
  it("compte au-delà de 30 jours", () => {
    expect(computeStreak(days("2026-10-09", 45), "2026-10-09")).toBe(45);
  });
  it("part d'hier si aujourd'hui n'est pas complet", () => {
    expect(computeStreak(days("2026-10-08", 4), "2026-10-09")).toBe(4);
  });
  it("vaut 0 si ni aujourd'hui ni hier ne sont complets", () => {
    expect(computeStreak(days("2026-10-07", 5), "2026-10-09")).toBe(0);
  });
  it("utilise la date de Paris : 23h30 à Paris le 9 = le 9, pas le 10 ni le 8", () => {
    expect(parisKey(0, new Date("2026-10-09T21:30:00Z"))).toBe("2026-10-09");
    expect(parisKey(0, new Date("2026-10-09T22:30:00Z"))).toBe("2026-10-10");
  });
});
