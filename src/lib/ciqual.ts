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
  const words = query.trim().split(/\s+/).filter((w) => w.length >= 2);
  if (words.length === 0) return [];

  // Build a filter where every word must appear in nom
  // Supabase doesn't chain multiple ilikes easily, so we use textSearch workaround:
  // We fetch candidates matching the first word, then filter client-side for remaining words.
  let q = supabase.from("aliments_ciqual").select("*").ilike("nom", `%${words[0]}%`).limit(50);

  const { data, error } = await q;
  if (error) throw error;

  let filtered = data || [];

  // Client-side filter for additional words
  if (words.length > 1) {
    const extraWords = words.slice(1).map((w) => w.toLowerCase());
    filtered = filtered.filter((row) => {
      const nom = (row.nom || "").toLowerCase();
      return extraWords.every((w) => nom.includes(w));
    });
  }

  // Sort: exact query match first, then by name length (shorter = more relevant)
  const lowerQuery = query.toLowerCase();
  filtered.sort((a, b) => {
    const aNom = (a.nom || "").toLowerCase();
    const bNom = (b.nom || "").toLowerCase();
    const aExact = aNom === lowerQuery ? 0 : 1;
    const bExact = bNom === lowerQuery ? 0 : 1;
    if (aExact !== bExact) return aExact - bExact;
    // Starts-with gets priority
    const aStarts = aNom.startsWith(lowerQuery) ? 0 : 1;
    const bStarts = bNom.startsWith(lowerQuery) ? 0 : 1;
    if (aStarts !== bStarts) return aStarts - bStarts;
    return aNom.length - bNom.length;
  });

  return mapRows(filtered.slice(0, 10));
}

export async function searchCiqualByGroupe(groupe: string): Promise<CiqualFood[]> {
  const { data, error } = await supabase
    .from("aliments_ciqual")
    .select("*")
    .ilike("groupe", `%${groupe}%`)
    .order("nom")
    .limit(20);

  if (error) throw error;
  return mapRows(data || []);
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
