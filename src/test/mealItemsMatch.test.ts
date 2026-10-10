import { describe, it, expect } from "vitest";
import { findMissingItems } from "@/lib/mealItemsMatch";

describe("aliments de la photo sans entrée au journal", () => {
  it("signale l'avocat absent", () => {
    expect(findMissingItems(["poulet grillé", "avocat"], ["Poulet grillé"])).toEqual(["avocat"]);
  });
  it("tolère accents et pluriel", () => {
    expect(findMissingItems(["haricots verts", "œufs"], ["haricot vert", "oeuf"])).toEqual([]);
  });
});
