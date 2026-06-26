// Parse a free-form menu text into structured foods with portions (grams)
// and nutritional values. Tries to match each food in aliments_ciqual
// (per-100g table) and scales by grams; falls back to GPT estimates per 100g.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const NUTRIENT_KEYS = [
  "calories", "proteins", "carbs", "fats", "fibres",
  "calcium", "vitamin_d", "magnesium", "iron", "omega3",
  "phytoestrogens", "vitamin_b12", "potassium", "zinc",
  "vitamin_k", "vitamin_b6", "vitamin_b9", "vitamin_e",
] as const;

// Per-100g ceilings — anything above is a bad-unit value and is dropped.
const CEIL_PER_100G: Record<string, number> = {
  calories: 900, proteins: 100, carbs: 100, fats: 100, fibres: 80,
  calcium: 2000, vitamin_d: 100, magnesium: 1000, iron: 100, omega3: 60,
  phytoestrogens: 1000, vitamin_b12: 100, potassium: 5000, zinc: 100,
  vitamin_k: 1500, vitamin_b6: 10, vitamin_b9: 2000, vitamin_e: 100,
};

function sanitizePer100g(key: string, raw: number, foodName: string): number {
  if (!isFinite(raw) || raw < 0) return 0;
  let v = raw;
  const isOil = /huile|oil/i.test(foodName);
  if (key === "vitamin_d" && v > 50) v = v / 40;            // IU → µg
  if (key === "omega3" && !isOil && v > 60) v = v / 1000;   // mg → g
  if (key === "zinc" && v > 100) v = v / 1000;              // µg → mg
  const ceil = CEIL_PER_100G[key];
  if (ceil !== undefined && v > ceil) return 0;
  return v;
}

// CIQUAL column -> food_logs column mapping (per 100g)
const CIQUAL_MAP: Record<string, string> = {
  calories_100g: "calories",
  proteines_100g: "proteins",
  glucides_100g: "carbs",
  lipides_100g: "fats",
  fibres_100g: "fibres",
  calcium_100g: "calcium",
  vitamine_d_100g: "vitamin_d",
  magnesium_100g: "magnesium",
  fer_100g: "iron",
  omega3_total_100g: "omega3",
  phytoestrogenes_100mg: "phytoestrogens",
  vitamine_b12_100g: "vitamin_b12",
  potassium_100g: "potassium",
  zinc_100g: "zinc",
  vitamine_k_100g: "vitamin_k",
  vitamine_b6_100g: "vitamin_b6",
  vitamine_b9_100g: "vitamin_b9",
  vitamine_e_100g: "vitamin_e",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) throw new Error("OPENAI_API_KEY missing");

    const { menu_content } = await req.json();
    if (!menu_content || typeof menu_content !== "string") {
      return new Response(JSON.stringify({ error: "menu_content required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Ask GPT to parse menu + give per-100g estimates for every food
    const sys = `Tu es un nutritionniste. Analyse le menu et identifie TOUS les aliments EXPLICITEMENT mentionnés dans le texte, avec leur portion estimée en grammes. N'INVENTE AUCUN aliment qui n'est pas écrit dans le menu. N'EN OUBLIE AUCUN. Pour chaque aliment, donne aussi des valeurs nutritionnelles ESTIMÉES par 100g (utilisées en fallback). Réponds STRICTEMENT en JSON.`;
    const userMsg = `Menu:\n${menu_content}\n\nFormat JSON attendu:
{
  "meals": [
    {
      "meal_type": "petit-dejeuner" | "dejeuner" | "diner" | "collation",
      "foods": [
        {
          "name": "nom de l'aliment en français, simple (ex: 'flocons d'avoine', 'saumon grillé')",
          "grams": number,
          "per_100g": {
            "calories": number, "proteins": number, "carbs": number, "fats": number, "fibres": number,
            "calcium": number, "vitamin_d": number, "magnesium": number, "iron": number, "omega3": number,
            "phytoestrogens": number, "vitamin_b12": number, "potassium": number, "zinc": number,
            "vitamin_k": number, "vitamin_b6": number, "vitamin_b9": number, "vitamin_e": number
          }
        }
      ]
    }
  ]
}
Unités STRICTES: calories=kcal, macros/fibres/oméga-3=g, calcium/magnésium/fer/zinc/potassium/vitamine_e/vitamine_b6=mg, vitamine_d/b12/k/b9=µg, phytoestrogens=mg. Si inconnu, mets 0. NE PAS donner d'oméga-3 en mg.`;

    const resp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${OPENAI_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: sys },
          { role: "user", content: userMsg },
        ],
        temperature: 0.2,
      }),
    });

    if (!resp.ok) {
      const t = await resp.text();
      return new Response(JSON.stringify({ error: `OpenAI ${resp.status}: ${t}` }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const json = await resp.json();
    const raw = json.choices?.[0]?.message?.content || "{}";
    let parsed: any;
    try { parsed = JSON.parse(raw); } catch { parsed = { meals: [] }; }
    const meals = Array.isArray(parsed.meals) ? parsed.meals : [];

    // Build final food entries with CIQUAL lookup when possible
    const entries: any[] = [];
    for (const meal of meals) {
      const mealType = ["petit-dejeuner", "dejeuner", "diner", "collation"].includes(meal.meal_type)
        ? meal.meal_type : "dejeuner";
      const foods = Array.isArray(meal.foods) ? meal.foods : [];
      for (const f of foods) {
        const name = String(f.name || "").trim();
        const grams = Math.max(1, Number(f.grams) || 100);
        if (!name) continue;

        let per100: Record<string, number> = {};
        let estimated = true;
        let matchedName = name;

        // Try CIQUAL match
        try {
          const { data: matches } = await supabase
            .from("aliments_ciqual")
            .select("*")
            .ilike("nom", `%${name}%`)
            .limit(1);
          if (matches && matches.length > 0) {
            const m = matches[0] as any;
            matchedName = m.nom || name;
            for (const [col, key] of Object.entries(CIQUAL_MAP)) {
              per100[key] = Number(m[col]) || 0;
            }
            estimated = false;
          }
        } catch (e) {
          console.warn("ciqual lookup failed for", name, e);
        }

        if (estimated) {
          const est = f.per_100g || {};
          for (const k of NUTRIENT_KEYS) per100[k] = Number(est[k]) || 0;
        }

        // Sanitize per-100g values (units, ceilings) BEFORE scaling.
        for (const k of NUTRIENT_KEYS) {
          per100[k] = sanitizePer100g(k, per100[k] || 0, matchedName);
        }

        const scale = grams / 100;
        const scaled: Record<string, number> = {};
        for (const k of NUTRIENT_KEYS) {
          scaled[k] = Math.round(((per100[k] || 0) * scale) * 100) / 100;
        }

        entries.push({
          // Keep the original menu food name so the journal matches the displayed menu;
          // CIQUAL is used only for nutrient lookup, not for renaming the food.
          food_name: name,
          meal_type: mealType,
          portion_size: grams,
          estimated,
          ...scaled,
        });
      }
    }

    return new Response(JSON.stringify({ entries }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("parse-menu-foods error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erreur" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
