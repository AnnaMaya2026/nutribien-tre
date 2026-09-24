// Lit l'étiquette d'un plat préparé (tableau nutritionnel + liste d'ingrédients)
// et en tire : des MACROS MESURÉES (reprises telles quelles) et des
// MICRONUTRIMENTS ESTIMÉS depuis la liste d'ingrédients pondérée par les
// pourcentages, via le moteur d'appariement CIQUAL déjà déployé.
// Même schéma vision que analyze-supplement-label (OpenAI gpt-4o).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { matchCiqual } from "../_shared/ciqualMatch.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Micronutriments estimés depuis les ingrédients (colonne CIQUAL -> clé app)
const CIQUAL_MICRO_MAP: Record<string, string> = {
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

// Plafonds par 100 g : au-delà, la valeur est une erreur d'unité -> écartée
const CEIL_PER_100G: Record<string, number> = {
  fibres: 80, calcium: 2000, vitamin_d: 100, magnesium: 1000, iron: 100,
  omega3: 60, phytoestrogens: 1000, vitamin_b12: 100, potassium: 5000,
  zinc: 100, vitamin_k: 1500, vitamin_b6: 10, vitamin_b9: 2000, vitamin_e: 100,
};

function sanitize(key: string, raw: unknown, name: string): number | null {
  if (raw === null || raw === undefined || raw === "") return null;
  let v = Number(raw);
  if (!isFinite(v) || v < 0) return null;
  const isOil = /huile|oil/i.test(name);
  if (key === "vitamin_d" && v > 50) v = v / 40;          // UI -> µg
  if (key === "omega3" && !isOil && v > 60) v = v / 1000; // mg -> g
  if (key === "zinc" && v > 100) v = v / 1000;            // µg -> mg
  const ceil = CEIL_PER_100G[key];
  if (ceil !== undefined && v > ceil) return null;
  return v;
}

function num(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(String(v).replace(",", "."));
  return isFinite(n) && n >= 0 ? n : null;
}

const round = (v: number | null, d = 2) =>
  v === null ? null : Math.round(v * 10 ** d) / 10 ** d;

const SYSTEM_PROMPT = `Tu lis l'étiquette d'un plat préparé industriel (une ou deux photos : tableau nutritionnel et liste d'ingrédients).

RÈGLES STRICTES:
- Recopie le tableau nutritionnel TEL QUEL. N'estime JAMAIS une valeur du tableau : si elle est illisible ou absente, mets null.
- Donne les valeurs POUR 100 g et POUR UNE PORTION quand les deux colonnes existent, sinon remplis seulement celle qui figure.
- "portion_weight_g" = poids de la portion en grammes (ex: "350 g", "1 portion = 350 g", poids net égoutté).
- Le sel est en g. Ne le convertis pas : recopie-le.
- Liste d'ingrédients : recopie chaque ingrédient dans l'ordre, avec son pourcentage s'il figure (sinon null). Ignore les additifs, arômes, épices, sel, eau ajoutée non chiffrés uniquement si aucun pourcentage : garde-les quand même dans la liste avec percent null.
- N'invente aucun pourcentage.

Réponds STRICTEMENT en JSON:
{
  "product_name": string|null,
  "brand": string|null,
  "portion_weight_g": number|null,
  "per_100g": {"calories": number|null, "proteins": number|null, "carbs": number|null, "sugars": number|null, "fats": number|null, "saturated_fats": number|null, "fibres": number|null, "salt": number|null},
  "per_portion": {"calories": number|null, "proteins": number|null, "carbs": number|null, "sugars": number|null, "fats": number|null, "saturated_fats": number|null, "fibres": number|null, "salt": number|null},
  "ingredients": [{"name": string, "percent": number|null}],
  "issue": null|"blurry"|"not_a_label"|"too_dark"
}`;

/** Estime les micronutriments pour 100 g de plat à partir des ingrédients. */
export async function estimateMicros(supabase: any, ingredients: { name: string; percent: number | null }[]) {
  const matched: any[] = [];
  const unmatched: string[] = [];
  let coverage = 0;

  // Répartition : pourcentages déclarés ; le reste réparti dans l'ordre de la
  // liste (ordre réglementaire décroissant), poids décroissants n, n-1, …, 1,
  // sans jamais dépasser le dernier pourcentage déclaré qui précède.
  const list = ingredients.filter((i) => i.name);
  const declared = list.reduce((s, i) => s + (i.percent && i.percent > 0 ? i.percent : 0), 0);
  const remaining = Math.max(0, 100 - declared);
  const undeclaredIdx = list.map((i, idx) => (!i.percent || i.percent <= 0 ? idx : -1)).filter((i) => i >= 0);
  const n = undeclaredIdx.length;
  const weightSum = (n * (n + 1)) / 2;
  const pcts: { value: number; inferred: boolean }[] = list.map((i) => ({ value: i.percent && i.percent > 0 ? i.percent : 0, inferred: false }));
  undeclaredIdx.forEach((idx, rank) => {
    pcts[idx] = { value: weightSum ? (remaining * (n - rank)) / weightSum : 0, inferred: true };
  });

  for (let i = 0; i < list.length; i++) {
    const ing = list[i];
    const pct = pcts[i].value;
    if (!isFinite(pct) || pct <= 0) { unmatched.push(ing.name); continue; }
    let match: any = null;
    try { match = await matchCiqual(supabase, ing.name); } catch { match = null; }
    if (!match) { unmatched.push(ing.name); continue; }
    coverage += pct;
    matched.push({ name: ing.name, percent: round(pct, 1), percent_inferred: pcts[i].inferred, ciqual: match.row.nom, row: match.row });
  }

  const micros: Record<string, number | null> = {};
  for (const key of Object.values(CIQUAL_MICRO_MAP)) micros[key] = null;

  for (const [col, key] of Object.entries(CIQUAL_MICRO_MAP)) {
    let sum = 0;
    let any = false;
    for (const m of matched) {
      const v = sanitize(key, m.row[col], m.ciqual || m.name);
      if (v === null) continue;
      any = true;
      sum += (v * m.percent) / 100;
    }
    micros[key] = any ? round(sum, 4) : null; // jamais 0 par défaut
  }

  return {
    micros,
    coverage: round(coverage, 1) ?? 0,
    matched: matched.map((m) => ({ name: m.name, percent: m.percent, percent_inferred: m.percent_inferred, ciqual: m.ciqual })),
    unmatched,
  };
}

/** Construit la réponse complète à partir d'une extraction déjà parsée. */
export async function buildResult(supabase: any, parsed: any) {
  const p100raw = parsed?.per_100g || {};
  const pPortRaw = parsed?.per_portion || {};
  const portion = num(parsed?.portion_weight_g);

  const MACRO_KEYS = ["calories", "proteins", "carbs", "sugars", "fats", "saturated_fats", "fibres", "salt"];
  const per100: Record<string, number | null> = {};
  const perPortion: Record<string, number | null> = {};
  for (const k of MACRO_KEYS) {
    per100[k] = num(p100raw[k]);
    perPortion[k] = num(pPortRaw[k]);
  }
  // Complète l'une par l'autre quand le poids de portion est connu
  if (portion && portion > 0) {
    for (const k of MACRO_KEYS) {
      if (perPortion[k] === null && per100[k] !== null) perPortion[k] = round(per100[k]! * portion / 100);
      else if (per100[k] === null && perPortion[k] !== null) per100[k] = round(perPortion[k]! * 100 / portion);
    }
  }
  // Sodium = sel / 2,54 ; les deux sont conservés
  const saltPortion = perPortion.salt;
  const sodiumPortion = saltPortion === null ? null : round(saltPortion / 2.54, 3);
  const salt100 = per100.salt;
  const sodium100 = salt100 === null ? null : round(salt100 / 2.54, 3);

  const ingredients = (Array.isArray(parsed?.ingredients) ? parsed.ingredients : [])
    .map((i: any) => ({ name: String(i?.name || "").trim(), percent: num(i?.percent) }))
    .filter((i: any) => i.name);

  const est = await estimateMicros(supabase, ingredients);

  // Micros par portion (les valeurs estimées sont pour 100 g de plat)
  const scale = portion && portion > 0 ? portion / 100 : 1;
  const microsPortion: Record<string, number | null> = {};
  for (const [k, v] of Object.entries(est.micros)) microsPortion[k] = v === null ? null : round(v * scale, 3);

  // Les fibres du tableau sont MESURÉES : elles priment sur l'estimation
  const fibresMeasured = perPortion.fibres !== null;
  if (fibresMeasured) microsPortion.fibres = perPortion.fibres;

  return {
    product_name: parsed?.product_name || null,
    brand: parsed?.brand || null,
    portion_weight_g: portion,
    measured: {
      per_100g: { ...per100, sodium: sodium100 },
      per_portion: { ...perPortion, sodium: sodiumPortion },
    },
    estimated_micros: {
      per_100g: est.micros,
      per_portion: microsPortion,
      coverage_percent: est.coverage,
      fibres_source: fibresMeasured ? "etiquette" : "estime",
      matched_ingredients: est.matched,
      unmatched_ingredients: est.unmatched,
    },
    ingredients,
    issue: ["blurry", "not_a_label", "too_dark"].includes(parsed?.issue) ? parsed.issue : null,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) {
      return new Response(JSON.stringify({ error: "missing_api_key", message: "Clé API manquante." }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const list: string[] = Array.isArray(body?.images) && body.images.length
      ? body.images
      : (typeof body?.image === "string" && body.image ? [body.image] : []);
    if (!list.length) {
      return new Response(JSON.stringify({ error: "invalid_input", message: "Image manquante." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const dataUrls = list.slice(0, 2).map((i) => (i.startsWith("data:") ? i : `data:image/jpeg;base64,${i}`));

    const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${OPENAI_API_KEY}` },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: [
              { type: "text", text: "Lis le tableau nutritionnel et la liste d'ingrédients de ce plat préparé." },
              ...dataUrls.map((url) => ({ type: "image_url", image_url: { url, detail: "high" } })),
            ],
          },
        ],
        response_format: { type: "json_object" },
        max_tokens: 2000,
      }),
    });

    if (!openaiRes.ok) {
      console.error("vision error", openaiRes.status, await openaiRes.text());
      return new Response(JSON.stringify({ error: "openai_error", message: "Lecture impossible pour le moment." }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const json = await openaiRes.json();
    let parsed: any = {};
    try { parsed = JSON.parse(json?.choices?.[0]?.message?.content || "{}"); } catch { parsed = {}; }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const result = await buildResult(supabase, parsed);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("analyze-product-label error", e);
    return new Response(JSON.stringify({ error: "server_error", message: "Erreur serveur." }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
