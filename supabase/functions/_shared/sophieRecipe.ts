// Logique pure des recettes de Sophie : budget par repas, calories calculées
// à partir des lignes CIQUAL (jamais annoncées par le modèle), mise à l'échelle
// et rotation des idées. Aucun accès réseau ici : testé par vitest.

export type MealKey = "petit-dejeuner" | "dejeuner" | "diner" | "collation";

export const MEAL_ORDER: MealKey[] = ["petit-dejeuner", "dejeuner", "collation", "diner"];

export const MEAL_LABELS: Record<MealKey, string> = {
  "petit-dejeuner": "petit-déjeuner",
  dejeuner: "déjeuner",
  collation: "collation",
  diner: "dîner",
};

export interface MealState {
  key: string;
  target: number;
  eaten: number;
}

const stripAccents = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

/** Repas demandé dans le message, sinon repas correspondant à l'heure de Paris. */
export function detectMeal(text: string, parisHour: number): MealKey {
  const t = stripAccents(text || "");
  if (/petit[- ]?dej|matin|brunch/.test(t)) return "petit-dejeuner";
  if (/collation|gouter|encas|en-cas|snack|grignot/.test(t)) return "collation";
  if (/\bdiner\b|ce soir|\bsoir\b|souper/.test(t)) return "diner";
  if (/dejeuner|\bmidi\b|lunch/.test(t)) return "dejeuner";
  if (parisHour < 10) return "petit-dejeuner";
  if (parisHour < 14) return "dejeuner";
  if (parisHour < 18) return "collation";
  return "diner";
}

/**
 * Budget calorique d'un repas : le plus petit entre la cible de ce repas et
 * le reste du jour, une fois mise de côté la part des repas à venir pas encore pris.
 */
export function mealBudget(meal: MealKey, caloriesRemaining: number, meals: MealState[]): number {
  const byKey = new Map(meals.map((m) => [m.key, m]));
  const target = byKey.get(meal)?.target ?? 0;
  const after = MEAL_ORDER.slice(MEAL_ORDER.indexOf(meal) + 1);
  const reserved = after.reduce((acc, k) => {
    const m = byKey.get(k);
    return acc + (m && m.eaten <= 0 ? m.target : 0);
  }, 0);
  const available = Math.max(0, caloriesRemaining - reserved);
  return Math.round(target > 0 ? Math.min(target, available) : available);
}

export interface RecipeIngredient {
  nom: string;
  grammes: number;
}

export interface Recipe {
  nom: string;
  ingredients: RecipeIngredient[];
  etapes: string[];
  proteine_principale?: string;
  cuisine?: string;
  cuisson?: string;
}

/** Lit la recette structurée rendue par le modèle ; null si elle est inutilisable. */
export function parseRecipe(raw: any): Recipe | null {
  const nom = String(raw?.nom || "").trim();
  const ingredients = (Array.isArray(raw?.ingredients) ? raw.ingredients : [])
    .map((i: any) => ({ nom: String(i?.nom || "").trim(), grammes: Number(i?.grammes) }))
    .filter((i: RecipeIngredient) => i.nom && Number.isFinite(i.grammes) && i.grammes > 0);
  const etapes = (Array.isArray(raw?.etapes) ? raw.etapes : []).map((e: any) => String(e || "").trim()).filter(Boolean);
  if (!nom || ingredients.length === 0 || etapes.length === 0) return null;
  const opt = (v: any) => (v ? String(v).trim().toLowerCase() : undefined);
  return { nom, ingredients, etapes, proteine_principale: opt(raw.proteine_principale), cuisine: opt(raw.cuisine), cuisson: opt(raw.cuisson) };
}

export interface CiqualRow {
  nom: string;
  calories_100g: number | null;
  proteines_100g: number | null;
}

/** Ingrédient introuvable ignoré sans bloquer la recette (épices, herbes…). */
export const MAX_IGNORED_GRAMS = 30;

export interface RecipeTotals {
  kcal: number;
  proteins: number;
  /** Ingrédients comptés, avec la ligne CIQUAL retenue. */
  counted: { nom: string; grammes: number; ciqual: string }[];
  /** Petites quantités introuvables, non comptées. */
  ignored: string[];
  /** Ingrédients introuvables au-delà du seuil : le total n'est pas fiable. */
  missing: string[];
}

/** Calories et protéines calculées à partir des lignes CIQUAL trouvées. */
export function computeRecipeTotals(recipe: Recipe, rows: (CiqualRow | null)[]): RecipeTotals {
  const out: RecipeTotals = { kcal: 0, proteins: 0, counted: [], ignored: [], missing: [] };
  recipe.ingredients.forEach((ing, i) => {
    const row = rows[i];
    const kcal100 = Number(row?.calories_100g);
    if (!row || !Number.isFinite(kcal100) || kcal100 <= 0) {
      (ing.grammes <= MAX_IGNORED_GRAMS ? out.ignored : out.missing).push(ing.nom);
      return;
    }
    out.kcal += (kcal100 * ing.grammes) / 100;
    out.proteins += ((Number(row.proteines_100g) || 0) * ing.grammes) / 100;
    out.counted.push({ nom: ing.nom, grammes: ing.grammes, ciqual: row.nom });
  });
  out.kcal = Math.round(out.kcal);
  out.proteins = Math.round(out.proteins);
  return out;
}

/** Tolérance au-dessus du budget avant de corriger la recette. */
export const BUDGET_TOLERANCE = 1.1;
/** En dessous de ce facteur, réduire les portions dénature le plat. */
export const MIN_SCALE = 0.6;

export const isOverBudget = (kcal: number, budget: number) => kcal > budget * BUDGET_TOLERANCE;

/** Réduit toutes les quantités pour tenir dans le budget ; null si la réduction serait trop forte. */
export function scaleToBudget(recipe: Recipe, kcal: number, budget: number): Recipe | null {
  if (kcal <= 0 || budget <= 0) return null;
  const factor = budget / kcal;
  if (factor >= 1) return recipe;
  if (factor < MIN_SCALE) return null;
  const round = (g: number) => (g >= 20 ? Math.max(5, Math.round(g / 5) * 5) : Math.max(1, Math.round(g)));
  return { ...recipe, ingredients: recipe.ingredients.map((i) => ({ ...i, grammes: round(i.grammes * factor) })) };
}

/** Texte affiché à l'utilisatrice ; les chiffres viennent du calcul, pas du modèle. */
export function formatRecipe(recipe: Recipe, totals: RecipeTotals, intro = ""): string {
  const lines: string[] = [];
  if (intro.trim()) lines.push(intro.trim(), "");
  lines.push(`**${recipe.nom}**`, "", "Ingrédients :");
  for (const i of recipe.ingredients) lines.push(`- ${i.grammes} g de ${i.nom}`);
  lines.push("", "Préparation :");
  recipe.etapes.forEach((e, n) => lines.push(`${n + 1}. ${e}`));
  lines.push("");
  if (totals.missing.length) {
    lines.push(
      `≈ ${totals.kcal} kcal · ${totals.proteins} g de protéines, sans compter ${totals.missing.join(", ")} (introuvable dans la table CIQUAL).`,
    );
  } else {
    lines.push(`≈ ${totals.kcal} kcal · ${totals.proteins} g de protéines (calculé avec la table CIQUAL).`);
  }
  if (totals.ignored.length) lines.push(`Non compté : ${totals.ignored.join(", ")}.`);
  return lines.join("\n");
}

// ── Rotation des idées ─────────────────────────────────────────────────────

export const CUISINES = ["française", "méditerranéenne", "italienne", "asiatique", "indienne", "orientale", "mexicaine", "nordique"];
export const CUISSONS = ["au four", "à la poêle", "à la vapeur", "mijoté", "en salade (sans cuisson)", "en soupe", "en papillote", "au wok"];

export interface ProposedDish {
  dish_name: string;
  main_protein?: string | null;
  cuisine?: string | null;
  cooking?: string | null;
}

/** Tire une cuisine et un mode de cuisson absents des dernières propositions. */
export function pickRotation(recent: ProposedDish[], random: () => number = Math.random) {
  const pick = (all: string[], used: (string | null | undefined)[]) => {
    const usedSet = new Set(used.filter(Boolean).map((u) => stripAccents(String(u))));
    const fresh = all.filter((a) => !usedSet.has(stripAccents(a)));
    const pool = fresh.length ? fresh : all;
    return pool[Math.floor(random() * pool.length) % pool.length];
  };
  const last = recent.slice(0, 5);
  return {
    cuisine: pick(CUISINES, last.map((d) => d.cuisine)),
    cuisson: pick(CUISSONS, last.map((d) => d.cooking)),
    proteinesRecentes: [...new Set(recent.slice(0, 3).map((d) => d.main_protein).filter(Boolean) as string[])],
  };
}
