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

export async function searchCiqual(query: string): Promise<CiqualFood[]> {
  const { data, error } = await supabase
    .from("aliments_ciqual")
    .select("*")
    .ilike("nom", `%${query}%`)
    .limit(10);

  if (error) throw error;

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
