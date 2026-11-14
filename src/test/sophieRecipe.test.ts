import { describe, expect, it } from "vitest";
import {
  computeRecipeTotals,
  detectMeal,
  formatRecipe,
  isOverBudget,
  mealBudget,
  parseRecipe,
  pickRotation,
  scaleToBudget,
} from "../../supabase/functions/_shared/sophieRecipe";
import { buildDaySnapshot } from "@/lib/daySnapshot";

// Objectif 1 800 kcal : 450 / 630 / 180 / 540.
const meals = (eaten: Partial<Record<string, number>> = {}) => [
  { key: "petit-dejeuner", target: 450, eaten: eaten["petit-dejeuner"] ?? 0 },
  { key: "dejeuner", target: 630, eaten: eaten.dejeuner ?? 0 },
  { key: "diner", target: 540, eaten: eaten.diner ?? 0 },
  { key: "collation", target: 180, eaten: eaten.collation ?? 0 },
];

describe("Budget par repas", () => {
  it("le matin, un repas ne prend pas tout le budget du jour", () => {
    expect(mealBudget("petit-dejeuner", 1800, meals())).toBe(450);
  });
  it("le dîner est limité par ce qui reste", () => {
    expect(mealBudget("diner", 300, meals({ "petit-dejeuner": 500, dejeuner: 800, collation: 200 }))).toBe(300);
  });
  it("garde la part des repas à venir pas encore pris", () => {
    // Reste 700 ; dîner (540) à venir, collation aussi (180) → 700 - 720 < 0 pour le déjeuner
    expect(mealBudget("dejeuner", 700, meals({ "petit-dejeuner": 1100 }))).toBe(0);
    // Collation déjà prise : on ne réserve que le dîner
    expect(mealBudget("dejeuner", 900, meals({ "petit-dejeuner": 700, collation: 200 }))).toBe(360);
  });
  it("devine le repas dans le message, sinon à l'heure", () => {
    expect(detectMeal("une idée pour ce soir ?", 9)).toBe("diner");
    expect(detectMeal("que manger au petit-déjeuner", 20)).toBe("petit-dejeuner");
    expect(detectMeal("un goûter léger", 12)).toBe("collation");
    expect(detectMeal("propose-moi une recette", 12)).toBe("dejeuner");
    expect(detectMeal("propose-moi une recette", 19)).toBe("diner");
  });
});

describe("Calories calculées, jamais annoncées", () => {
  const recipe = parseRecipe({
    nom: "Poulet au riz",
    ingredients: [
      { nom: "blanc de poulet", grammes: 120 },
      { nom: "riz basmati cru", grammes: 60 },
      { nom: "huile d'olive", grammes: 10 },
      { nom: "ras el-hanout", grammes: 2 },
    ],
    etapes: ["Cuire le riz.", "Poêler le poulet."],
  })!;
  const rows = [
    { nom: "Poulet, blanc, cru", calories_100g: 110, proteines_100g: 23 },
    { nom: "Riz basmati, cru", calories_100g: 350, proteines_100g: 8 },
    { nom: "Huile d'olive vierge extra", calories_100g: 900, proteines_100g: 0 },
    null,
  ];
  it("additionne les lignes CIQUAL et ignore une épice introuvable", () => {
    const t = computeRecipeTotals(recipe, rows);
    expect(t.kcal).toBe(432); // 132 + 210 + 90
    expect(t.proteins).toBe(32);
    expect(t.ignored).toEqual(["ras el-hanout"]);
    expect(t.missing).toEqual([]);
  });
  it("signale un ingrédient important introuvable au lieu d'inventer", () => {
    const t = computeRecipeTotals(recipe, [rows[0], null, rows[2], null]);
    expect(t.missing).toEqual(["riz basmati cru"]);
    expect(formatRecipe(recipe, t)).toContain("sans compter riz basmati cru");
  });
  it("réduit les portions pour tenir dans le budget, sans dénaturer le plat", () => {
    expect(isOverBudget(432, 400)).toBe(false); // +8 %
    expect(isOverBudget(432, 350)).toBe(true);
    const scaled = scaleToBudget(recipe, 432, 350)!;
    expect(computeRecipeTotals(scaled, rows).kcal).toBeLessThanOrEqual(350 * 1.1);
    expect(scaleToBudget(recipe, 432, 200)).toBeNull();
  });
  it("refuse une recette sans ingrédients chiffrés", () => {
    expect(parseRecipe({ nom: "X", ingredients: [{ nom: "riz" }], etapes: ["a"] })).toBeNull();
  });
});

describe("Rotation des idées", () => {
  it("évite la cuisine et la cuisson des dernières propositions", () => {
    const recent = [
      { dish_name: "Saumon au four", main_protein: "saumon", cuisine: "française", cooking: "au four" },
      { dish_name: "Curry de lentilles", main_protein: "lentilles", cuisine: "indienne", cooking: "mijoté" },
    ];
    for (let i = 0; i < 20; i++) {
      const r = pickRotation(recent);
      expect(["française", "indienne"]).not.toContain(r.cuisine);
      expect(["au four", "mijoté"]).not.toContain(r.cuisson);
      expect(r.proteinesRecentes).toEqual(["saumon", "lentilles"]);
    }
  });
});

describe("Chiffres envoyés à Sophie = chiffres de l'accueil", () => {
  it("inclut les compléments et calcule le reste et les cibles par repas", () => {
    const snap = buildDaySnapshot({
      profile: { weight: 61, height: 165, age: 55, activity_level: "leger", objective: "maintien" },
      logs: [
        { meal_type: "petit-dejeuner", calories: 400, proteins: 20, magnesium: 100, omega3: 1 },
        { meal_type: "dejeuner", calories: 600, proteins: 30, magnesium: 80 },
      ],
      contributions: { magnesium: { amount: 150 }, omega3: { amount: 500 } },
    });
    expect(snap.calories).toBe(1000);
    expect(snap.caloriesRemaining).toBe(snap.calorieGoal - 1000);
    const mg = snap.nutrients.find((n) => n.key === "magnesium")!;
    expect(mg.value).toBe(330);
    expect(mg.goal).toBe(300);
    expect(mg.reached).toBe(true);
    expect(snap.nutrients.find((n) => n.key === "omega3")!.value).toBe(1.5);
    expect(snap.nutrients.find((n) => n.key === "proteins")!.goal).toBe(73);
    expect(snap.meals.find((m) => m.key === "petit-dejeuner")!.eaten).toBe(400);
    expect(snap.meals.reduce((a, m) => a + m.target, 0)).toBeGreaterThan(snap.calorieGoal - 5);
  });
});
