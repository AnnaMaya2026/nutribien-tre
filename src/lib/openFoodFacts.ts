export interface OFFProduct {
  product_name: string;
  nutriments: {
    "energy-kcal_100g"?: number;
    proteins_100g?: number;
    carbohydrates_100g?: number;
    fat_100g?: number;
    calcium_100g?: number;  // mg
    "vitamin-d_100g"?: number; // µg
    magnesium_100g?: number; // mg
    iron_100g?: number; // mg
    "omega-3-fat_100g"?: number; // g
    "vitamin-b12_100g"?: number; // µg
  };
  serving_size?: string;
}

export interface ParsedFood {
  name: string;
  calories_100g: number;
  proteins_100g: number;
  carbs_100g: number;
  fats_100g: number;
  calcium_100g: number;
  vitamin_d_100g: number;
  magnesium_100g: number;
  iron_100g: number;
  omega3_100g: number;
  vitamin_b12_100g: number;
  phytoestrogens_100g: number;
  serving_size: string;
}

function n(v: number | undefined): number {
  return v && isFinite(v) ? v : 0;
}

function parseProduct(p: OFFProduct): ParsedFood | null {
  if (!p.product_name) return null;
  return {
    name: p.product_name,
    calories_100g: n(p.nutriments["energy-kcal_100g"]),
    proteins_100g: n(p.nutriments.proteins_100g),
    carbs_100g: n(p.nutriments.carbohydrates_100g),
    fats_100g: n(p.nutriments.fat_100g),
    calcium_100g: n(p.nutriments.calcium_100g),
    vitamin_d_100g: n(p.nutriments["vitamin-d_100g"]),
    magnesium_100g: n(p.nutriments.magnesium_100g),
    iron_100g: n(p.nutriments.iron_100g),
    omega3_100g: n(p.nutriments["omega-3-fat_100g"]),
    vitamin_b12_100g: n(p.nutriments["vitamin-b12_100g"]),
    phytoestrogens_100g: 0, // OFF doesn't track this
    serving_size: p.serving_size || "100g",
  };
}

async function fetchWithRetry(url: string, retries = 3, timeout = 10000): Promise<Response> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);
    try {
      console.log(`[OFF] Attempt ${attempt}/${retries}`);
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timer);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res;
    } catch (err) {
      clearTimeout(timer);
      console.warn(`[OFF] Attempt ${attempt} failed:`, err);
      if (attempt === retries) throw err;
      await new Promise(r => setTimeout(r, 300));
    }
  }
  throw new Error("Unreachable");
}

export async function searchFoods(query: string): Promise<ParsedFood[]> {
  const url = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(query)}&search_simple=1&action=process&json=1&fields=product_name,nutriments,serving_size&lc=fr&cc=fr&page_size=25`;
  console.log("[OFF] Searching:", url);
  const res = await fetchWithRetry(url);
  const data = await res.json();
  console.log("[OFF] Raw results:", data.products?.length ?? 0);
  const products: OFFProduct[] = data.products || [];
  const parsed = products
    .map(parseProduct)
    .filter((p): p is ParsedFood => p !== null && p.calories_100g > 0)
    .slice(0, 10);
  console.log("[OFF] Parsed foods:", parsed.length);
  return parsed;
}

export function scaleNutrients(food: ParsedFood, grams: number) {
  const r = grams / 100;
  return {
    calories: Math.round(food.calories_100g * r),
    proteins: Math.round(food.proteins_100g * r),
    carbs: Math.round(food.carbs_100g * r),
    fats: Math.round(food.fats_100g * r),
    calcium: Math.round(food.calcium_100g * r),
    vitamin_d: +(food.vitamin_d_100g * r).toFixed(1),
    magnesium: Math.round(food.magnesium_100g * r),
    iron: +(food.iron_100g * r).toFixed(1),
    omega3: +(food.omega3_100g * r).toFixed(1),
    vitamin_b12: +(food.vitamin_b12_100g * r).toFixed(1),
    phytoestrogens: 0,
  };
}
