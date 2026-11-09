import { describe, expect, it } from "vitest";
import { parseCoveredDays, supplementFrequencySettings } from "@/components/SupplementFrequencyChoice";

describe("fréquence enregistrée des compléments", () => {
  it("tous les jours : quotidien true, périodicité NULL", () => {
    expect(supplementFrequencySettings("quotidien", "30")).toEqual({ quotidien: true, periodicite_jours: null });
  });
  it("jours cochés : quotidien false, périodicité NULL", () => {
    expect(supplementFrequencySettings("coche", "30")).toEqual({ quotidien: false, periodicite_jours: null });
  });
  it("une dose sur 30 jours : quotidien false et périodicité 30", () => {
    expect(supplementFrequencySettings("etale", "30")).toEqual({ quotidien: false, periodicite_jours: 30 });
  });
  it("accepte 2 et 120 jours", () => {
    expect(parseCoveredDays("2")).toBe(2);
    expect(parseCoveredDays("120")).toBe(120);
  });
  it("refuse les valeurs hors limites, vides ou non entières", () => {
    for (const value of ["1", "121", "", "2.5", "abc"]) {
      expect(parseCoveredDays(value)).toBeNull();
      expect(supplementFrequencySettings("etale", value)).toBeNull();
    }
  });
  it("les modes normaux ignorent le nombre de jours masqué", () => {
    expect(supplementFrequencySettings("quotidien", "")).toEqual({ quotidien: true, periodicite_jours: null });
    expect(supplementFrequencySettings("coche", "121")).toEqual({ quotidien: false, periodicite_jours: null });
  });
});