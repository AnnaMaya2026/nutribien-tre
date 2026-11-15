import { isFishRoeMismatch } from "@/lib/ciqualRoe";
import { supabase } from "@/integrations/supabase/client";
import { amountToNutritionGrams } from "@/lib/portionUnits";

export interface CiqualFood {
  id: number;
  nom: string;
  groupe: string | null;
  calories_100g: number;
  proteines_100g: number;
  glucides_100g: number;
  lipides_100g: number;
  fibres_100g: number | null;
  calcium_100g: number | null;
  fer_100g: number | null;
  magnesium_100g: number | null;
  vitamine_d_100g: number | null;
  vitamine_b12_100g: number | null;
  omega3_total_100g: number | null;
  phytoestrogenes_100mg: number | null;
  potassium_100g: number | null;
  zinc_100g: number | null;
  vitamine_k_100g: number | null;
  vitamine_b6_100g: number | null;
  vitamine_b9_100g: number | null;
  vitamine_e_100g: number | null;
}

function n(v: number | null): number {
  return v ?? 0;
}

/** Fibres et micronutriments : une valeur absente reste inconnue (null), jamais 0. */
function unknownStaysNull(v: number | null | undefined): number | null {
  return v === null || v === undefined || !Number.isFinite(Number(v)) ? null : Number(v);
}

function mapRows(data: any[]): CiqualFood[] {
  return (data || []).map((row) => ({
    id: row.id,
    nom: row.nom || "Sans nom",
    groupe: row.groupe,
    calories_100g: n(row.calories_100g),
    proteines_100g: n(row.proteines_100g),
    glucides_100g: n(row.glucides_100g),
    lipides_100g: n(row.lipides_100g),
    fibres_100g: unknownStaysNull(row.fibres_100g),
    calcium_100g: unknownStaysNull(row.calcium_100g),
    fer_100g: unknownStaysNull(row.fer_100g),
    magnesium_100g: unknownStaysNull(row.magnesium_100g),
    vitamine_d_100g: unknownStaysNull(row.vitamine_d_100g),
    vitamine_b12_100g: unknownStaysNull(row.vitamine_b12_100g),
    omega3_total_100g: unknownStaysNull(row.omega3_total_100g),
    phytoestrogenes_100mg: unknownStaysNull(row.phytoestrogenes_100mg),
    potassium_100g: unknownStaysNull(row.potassium_100g),
    zinc_100g: unknownStaysNull(row.zinc_100g),
    vitamine_k_100g: unknownStaysNull(row.vitamine_k_100g),
    vitamine_b6_100g: unknownStaysNull(row.vitamine_b6_100g),
    vitamine_b9_100g: unknownStaysNull(row.vitamine_b9_100g),
    vitamine_e_100g: unknownStaysNull(row.vitamine_e_100g),
  }));
}

// Common French misspellings → correct form
const COMMON_MISSPELLINGS: Record<string, string> = {
  patate: "pomme de terre",
  patates: "pommes de terre",
  cacaouete: "cacahuète",
  cacaouetes: "cacahuètes",
  yahourt: "yaourt",
  yahourts: "yaourts",
  yogourt: "yaourt",
  yogourts: "yaourts",
  chocolate: "chocolat",
  brocolis: "brocoli",
};

// Simplify double consonants: "carrottes" → "carottes", "tommates" → "tomates"
function simplifyDoubles(s: string): string {
  return s.replace(/([bcdfghjklmnpqrstvwxz])\1+/gi, "$1");
}

function applyMisspellingFixes(s: string): string {
  const lower = s.toLowerCase();
  for (const [bad, good] of Object.entries(COMMON_MISSPELLINGS)) {
    const re = new RegExp(`\\b${bad}\\b`, "gi");
    if (re.test(lower)) return lower.replace(re, good);
  }
  return s;
}

async function runSearch(term: string): Promise<CiqualFood[]> {
  const { data, error } = await supabase.rpc("search_aliments_unaccent" as any, {
    search_term: term,
    max_results: 1000,
  });
  if (error) throw error;

  const stripAccents = (s: string) =>
    s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const lower = stripAccents(term);
  const sorted = ((data as any[]) || []).sort((a, b) => {
    const aNom = stripAccents(a.nom || "");
    const bNom = stripAccents(b.nom || "");
    const aScore = aNom.startsWith(lower) ? 0 : aNom.includes(` ${lower}`) ? 1 : 2;
    const bScore = bNom.startsWith(lower) ? 0 : bNom.includes(` ${lower}`) ? 1 : 2;
    // « œuf » seul : œufs de poule avant les œufs de poisson
    const aRoe = isFishRoeMismatch(term, a.nom || "") ? 1 : 0;
    const bRoe = isFishRoeMismatch(term, b.nom || "") ? 1 : 0;
    if (aRoe !== bRoe) return aRoe - bRoe;
    if (aScore !== bScore) return aScore - bScore;
    if (aNom.length !== bNom.length) return aNom.length - bNom.length;
    return aNom.localeCompare(bNom);
  });
  return mapRows(sorted.slice(0, 20));
}

export async function searchCiqual(query: string): Promise<CiqualFood[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];

  // 1. Try original query first
  let results: CiqualFood[] = [];
  try {
    results = await runSearch(trimmed);
  } catch (e) {
    console.error("Search error:", e);
  }
  if (results.length >= 3) return results;

  // 2. Try simplified doubles ("carrottes" → "carottes")
  const simplified = simplifyDoubles(trimmed);
  if (simplified.toLowerCase() !== trimmed.toLowerCase()) {
    try {
      const more = await runSearch(simplified);
      const seen = new Set(results.map((r) => r.id));
      results = [...results, ...more.filter((r) => !seen.has(r.id))];
      if (results.length >= 3) return results.slice(0, 20);
    } catch (e) {
      console.warn("Fuzzy (doubles) search failed:", e);
    }
  }

  // 3. Try common misspellings ("patates" → "pommes de terre")
  const fixed = applyMisspellingFixes(trimmed);
  if (fixed.toLowerCase() !== trimmed.toLowerCase()) {
    try {
      const more = await runSearch(fixed);
      const seen = new Set(results.map((r) => r.id));
      results = [...results, ...more.filter((r) => !seen.has(r.id))];
    } catch (e) {
      console.warn("Fuzzy (misspellings) search failed:", e);
    }
  }

  return results.slice(0, 20);
}

// Exclude exotic/uncommon foods from suggestions
const EXCLUDED_TERMS = [
  "foie de morue", "huile de foie", "abats", "rognon", "cervelle",
  "tripes", "ris de veau", "langue de boeuf", "museau", "pied de",
  "tête de veau", "coeur de", "gésier",
];

function isExcludedFood(nom: string): boolean {
  const lower = nom.toLowerCase();
  return EXCLUDED_TERMS.some((term) => lower.includes(term));
}

// Preferred everyday foods per nutrient gap
const PREFERRED_FOODS: Record<string, string[]> = {
  vitamine_d_100g: ["saumon", "sardine", "oeuf", "champignon", "thon", "maquereau"],
  calcium_100g: ["yaourt", "fromage", "lait", "amande", "brocoli", "épinard"],
  magnesium_100g: ["chocolat noir", "banane", "épinard", "noix", "amande", "lentille"],
  fer_100g: ["lentille", "épinard", "boeuf", "haricot", "tofu", "quinoa"],
  omega3_total_100g: ["saumon", "noix", "colza", "sardine", "maquereau", "lin"],
  proteines_100g: ["poulet", "oeuf", "thon", "lentille", "yaourt", "boeuf"],
  vitamine_b12_100g: ["oeuf", "saumon", "fromage", "boeuf", "thon", "lait"],
};

/** Search preferred everyday foods for a nutrient, then fill with top DB results */
export async function searchByNutrient(
  nutrient: keyof CiqualFood,
  limit = 10
): Promise<CiqualFood[]> {
  const col = nutrient as string;
  const preferred = PREFERRED_FOODS[col] || [];

  // Search preferred foods first
  const preferredResults: CiqualFood[] = [];
  if (preferred.length > 0) {
    const promises = preferred.map(async (term) => {
      const { data } = await supabase
        .from("aliments_ciqual")
        .select("*")
        .ilike("nom", `${term}%`)
        .gt(col, 0)
        .order(col, { ascending: false })
        .limit(2);
      return data || [];
    });
    const results = await Promise.all(promises);
    const seen = new Set<number>();
    results.flat().forEach((row) => {
      if (!seen.has(row.id) && !isExcludedFood(row.nom || "")) {
        seen.add(row.id);
        preferredResults.push(...mapRows([row]));
      }
    });
  }

  // Fill remaining slots from top DB results
  const remaining = limit - preferredResults.length;
  if (remaining > 0) {
    const { data } = await supabase
      .from("aliments_ciqual")
      .select("*")
      .gt(col, 0)
      .order(col, { ascending: false })
      .limit(limit * 3);

    const existingIds = new Set(preferredResults.map((f) => f.id));
    const filtered = (data || [])
      .filter((row) => !existingIds.has(row.id) && !isExcludedFood(row.nom || ""))
      .slice(0, remaining);
    preferredResults.push(...mapRows(filtered));
  }

  return preferredResults.slice(0, limit);
}

/** Scale a per-100 g value; unknown (null/undefined/NaN) stays null — never 0. */
export function scaleOrNull(v: number | null | undefined, r: number, dec = 0): number | null {
  if (v === null || v === undefined || !isFinite(Number(v))) return null;
  const x = Number(v) * r;
  return dec === 0 ? Math.round(x) : +x.toFixed(dec);
}

export function scaleCiqual(food: CiqualFood, grams: number): Record<string, any> {
  const r = amountToNutritionGrams(food.nom, grams) / 100;
  return {
    calories: Math.round(food.calories_100g * r),
    proteins: Math.round(food.proteines_100g * r),
    carbs: Math.round(food.glucides_100g * r),
    fats: Math.round(food.lipides_100g * r),
    fibres: scaleOrNull(food.fibres_100g, r),
    calcium: scaleOrNull(food.calcium_100g, r),
    vitamin_d: scaleOrNull(food.vitamine_d_100g, r, 1),
    magnesium: scaleOrNull(food.magnesium_100g, r),
    iron: scaleOrNull(food.fer_100g, r, 1),
    omega3: scaleOrNull(food.omega3_total_100g, r, 1),
    vitamin_b12: scaleOrNull(food.vitamine_b12_100g, r, 1),
    phytoestrogens: scaleOrNull(food.phytoestrogenes_100mg, r, 1),
    potassium: scaleOrNull(food.potassium_100g, r),
    zinc: scaleOrNull(food.zinc_100g, r, 1),
    vitamin_k: scaleOrNull(food.vitamine_k_100g, r, 1),
    vitamin_b6: scaleOrNull(food.vitamine_b6_100g, r, 2),
    vitamin_b9: scaleOrNull(food.vitamine_b9_100g, r),
    vitamin_e: scaleOrNull(food.vitamine_e_100g, r, 1),
  };
}
