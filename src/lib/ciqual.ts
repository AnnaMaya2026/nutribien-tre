import { supabase } from "@/integrations/supabase/client";

export interface CiqualFood {
  id: number;
  nom: string;
  groupe: string | null;
  calories_100g: number;
  proteines_100g: number;
  glucides_100g: number;
  lipides_100g: number;
  fibres_100g: number;
  calcium_100g: number;
  fer_100g: number;
  magnesium_100g: number;
  vitamine_d_100g: number;
  vitamine_b12_100g: number;
  omega3_total_100g: number;
}

function n(v: number | null): number {
  return v ?? 0;
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
    fibres_100g: n(row.fibres_100g),
    calcium_100g: n(row.calcium_100g),
    fer_100g: n(row.fer_100g),
    magnesium_100g: n(row.magnesium_100g),
    vitamine_d_100g: n(row.vitamine_d_100g),
    vitamine_b12_100g: n(row.vitamine_b12_100g),
    omega3_total_100g: n(row.omega3_total_100g),
  }));
}

export async function searchCiqual(query: string): Promise<CiqualFood[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];

  const { data, error } = await supabase.rpc("search_aliments_unaccent" as any, {
    search_term: trimmed,
    max_results: 1000,
  });

  if (error) {
    console.error("Search error:", error);
    throw error;
  }

  // Normalize for accent-insensitive sorting
  const stripAccents = (s: string) =>
    s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const lower = stripAccents(trimmed);
  const sorted = ((data as any[]) || []).sort((a, b) => {
    const aNom = stripAccents(a.nom || "");
    const bNom = stripAccents(b.nom || "");
    const aScore = aNom.startsWith(lower) ? 0 : aNom.includes(` ${lower}`) ? 1 : 2;
    const bScore = bNom.startsWith(lower) ? 0 : bNom.includes(` ${lower}`) ? 1 : 2;

    if (aScore !== bScore) return aScore - bScore;
    if (aNom.length !== bNom.length) return aNom.length - bNom.length;
    return aNom.localeCompare(bNom);
  });

  return mapRows(sorted.slice(0, 20));
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

export function scaleCiqual(food: CiqualFood, grams: number) {
  const r = grams / 100;
  return {
    calories: Math.round(food.calories_100g * r),
    proteins: Math.round(food.proteines_100g * r),
    carbs: Math.round(food.glucides_100g * r),
    fats: Math.round(food.lipides_100g * r),
    fibres: Math.round(food.fibres_100g * r),
    calcium: Math.round(food.calcium_100g * r),
    vitamin_d: +(food.vitamine_d_100g * r).toFixed(1),
    magnesium: Math.round(food.magnesium_100g * r),
    iron: +(food.fer_100g * r).toFixed(1),
    omega3: +(food.omega3_total_100g * r).toFixed(1),
    vitamin_b12: +(food.vitamine_b12_100g * r).toFixed(1),
    phytoestrogens: 0,
  };
}
