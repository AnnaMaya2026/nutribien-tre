import { describe, expect, it } from "vitest";
import { matchCiqual, rankCiqual } from "../../supabase/functions/_shared/ciqualMatch";

const ROWS = [
  { id: 1, nom: "Poulet, blanc, rôti", groupe: "viandes", calories_100g: 150 },
  { id: 2, nom: "Soupe au poulet et vermicelles, préemballée", groupe: "soupes", calories_100g: 30 },
  { id: 3, nom: "Thé infusé, non sucré", groupe: "boissons", calories_100g: 0 },
  { id: 4, nom: "Thé glacé, sucré", groupe: "boissons", calories_100g: 30 },
];
const fakeSupabase = {
  rpc: async (_fn: string, { search_term }: { search_term: string }) => ({
    data: ROWS.filter((r) => r.nom.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").includes(search_term)),
    error: null,
  }),
  from: () => ({ select: () => ({ eq: () => ({ limit: async () => ({ data: [] }) }) }) }),
};

describe("Moteur unique de reconnaissance CIQUAL", () => {
  it("classe l'aliment simple avant le plat composé", async () => {
    const ranked = await rankCiqual(fakeSupabase, "poulet");
    expect(ranked[0].row.nom).toBe("Poulet, blanc, rôti");
    expect((await matchCiqual(fakeSupabase, "poulet"))?.row.id).toBe(1);
  });
  it("garde les aliments à 0 kcal dans une liste de recherche, pas dans un rapprochement automatique", async () => {
    const auto = await rankCiqual(fakeSupabase, "thé");
    expect(auto.map((c) => c.row.id)).not.toContain(3);
    const list = await rankCiqual(fakeSupabase, "thé", {}, { keepZeroKcal: true });
    expect(list.map((c) => c.row.id)).toContain(3);
  });
  it("ne renvoie rien quand aucun aliment ne correspond", async () => {
    expect(await matchCiqual(fakeSupabase, "manouri")).toBeNull();
  });
});

import { preferredFoodsForDay } from "@/lib/ciqual";

describe("Onglet Idées : aliments proposés", () => {
  it("propose six aliments qui changent d'un jour à l'autre, sans soja", () => {
    const day1 = preferredFoodsForDay("fer_100g", 100);
    const day2 = preferredFoodsForDay("fer_100g", 101);
    expect(day1).toHaveLength(6);
    expect(day2).not.toEqual(day1);
    for (let d = 0; d < 12; d++) {
      expect(preferredFoodsForDay("fer_100g", d).join(" ")).not.toMatch(/tofu|soja/);
    }
  });
});
