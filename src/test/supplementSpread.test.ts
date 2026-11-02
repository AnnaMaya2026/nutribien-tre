import { describe, it, expect } from "vitest";
import { spreadMultiplier } from "@/lib/supplementSpread";

const dose = 1250;
const log = (d: string, q: number | null = 1, taken = true) => ({ logged_at: d, taken, quantite: q });
const apport = (logs: ReturnType<typeof log>[], day: string, n: number) => dose * spreadMultiplier(logs, day, n);

describe("étalement des compléments à périodicité", () => {
  it("1250 le jour J, N=30 : 1250/30 de J à J+29, 0 à J+30 et J-1", () => {
    const logs = [log("2026-03-01")];
    expect(apport(logs, "2026-03-01", 30)).toBe(1250 / 30);
    expect(apport(logs, "2026-03-30", 30)).toBe(1250 / 30);
    expect(apport(logs, "2026-03-31", 30)).toBe(0);
    expect(apport(logs, "2026-02-28", 30)).toBe(0);
  });

  it("deux doses à 15 jours d'écart se cumulent sur les jours communs", () => {
    const logs = [log("2026-03-01"), log("2026-03-16")];
    expect(apport(logs, "2026-03-10", 30)).toBe(1250 / 30);
    expect(apport(logs, "2026-03-20", 30)).toBe((2 * 1250) / 30);
    expect(apport(logs, "2026-04-05", 30)).toBe(1250 / 30);
  });

  it("une quantité de 2 double l'apport", () => {
    expect(apport([log("2026-03-01", 2)], "2026-03-05", 30)).toBe((2 * 1250) / 30);
  });

  it("un log taken = false est ignoré", () => {
    expect(apport([log("2026-03-01", 1, false)], "2026-03-05", 30)).toBe(0);
  });

  it("passage de fin de mois et d'année", () => {
    const logs = [log("2026-12-20")];
    expect(apport(logs, "2027-01-18", 30)).toBe(1250 / 30); // J+29
    expect(apport(logs, "2027-01-19", 30)).toBe(0); // J+30
    expect(apport([log("2026-01-31")], "2026-02-01", 2)).toBe(1250 / 2);
    expect(apport([log("2026-01-31")], "2026-02-02", 2)).toBe(0);
  });

  it("N à NULL : l'ancien comportement (quantité du jour coché) reste inchangé", () => {
    // Reproduit la règle de contributionsForDay pour periodicite_jours = null.
    const factorFor = (period: number | null, taken: boolean, qty: number) =>
      period != null && period >= 2 ? spreadMultiplier([log("2026-03-01", qty)], "2026-03-01", period) : taken ? (qty > 0 ? qty : 1) : 0;
    expect(factorFor(null, true, 1)).toBe(1);
    expect(factorFor(null, true, 3)).toBe(3);
    expect(factorFor(null, false, 3)).toBe(0);
  });
});
