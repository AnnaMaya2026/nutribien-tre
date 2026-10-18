import { describe, expect, it } from "vitest";
import { scaleOrNull } from "@/lib/ciqual";

// Règle : quand on change la portion d'un aliment, sel/sodium/sucres/
// acides_gras_satures sont recalculés au prorata comme les micronutriments.
// Une valeur inconnue (null) reste null, jamais 0.
// Arrondis : 3 décimales pour sel et sodium (grammes), 1 pour sucres et
// acides_gras_satures.

describe("recalcul proportionnel de sel / sodium / sucres / acides_gras_satures", () => {
  it("garde null une valeur inconnue, sans la transformer en 0", () => {
    expect(scaleOrNull(null, 1.5, 3)).toBeNull();
    expect(scaleOrNull(undefined, 1.5, 3)).toBeNull();
    expect(scaleOrNull(null, 1.5, 1)).toBeNull();
    expect(scaleOrNull(undefined, 1.5, 1)).toBeNull();
  });

  it("scaled sel et sodium au prorata avec 3 décimales", () => {
    // 2,7 g de sel pour 200 g -> 300 g : 4,05 g
    expect(scaleOrNull(2.7, 300 / 200, 3)).toBe(4.05);
    // arrondi à 3 décimales
    expect(scaleOrNull(1.23456, 1, 3)).toBe(1.235);
    expect(scaleOrNull(1.06, 0.5, 3)).toBe(0.53);
  });

  it("scale sucres et acides_gras_satures au prorata avec 1 décimale", () => {
    // 4,2 g de sucres pour 100 g -> 150 g : 6,3 g
    expect(scaleOrNull(4.2, 1.5, 1)).toBe(6.3);
    // arrondi à 1 décimale
    expect(scaleOrNull(12.3456, 1, 1)).toBe(12.3);
    expect(scaleOrNull(0.9, 0.5, 1)).toBe(0.5);
  });
});
