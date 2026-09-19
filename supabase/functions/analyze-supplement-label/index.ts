// Analyse la photo d'une étiquette de complément alimentaire et en extrait
// le nom, la marque, la dose journalière et la composition nutriment/quantité.
// Même schéma vision que analyze-meal-photo / parse-menu-foods (OpenAI gpt-4o).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Clés nutriments suivies par l'app (doivent rester alignées avec NUTRIENT_KEY_LABELS côté front)
const KNOWN_KEYS = [
  "calcium", "magnesium", "iron", "zinc", "selenium", "omega3", "proteins",
  "vitamin_c", "vitamin_d", "vitamin_e", "vitamin_k",
  "vitamin_b1", "vitamin_b2", "vitamin_b3", "vitamin_b5", "vitamin_b6",
  "vitamin_b8", "vitamin_b9", "vitamin_b12",
  "potassium", "phosphore", "iode", "manganese", "cuivre", "chrome", "molybdene",
  "vitamin_a", "fibres", "calories", "carbs", "fats",
];

// Synonymes d'étiquette (FR / EN / PL) → clé app
const SYNONYMS: Record<string, string> = {
  // Vitamine D
  "vitamine d": "vitamin_d", "vitamine d3": "vitamin_d", "vitamin d": "vitamin_d",
  "vitamin d3": "vitamin_d", "witamina d": "vitamin_d", "witamina d3": "vitamin_d",
  "cholecalciferol": "vitamin_d", "cholécalciférol": "vitamin_d", "cholekalcyferol": "vitamin_d",
  // B12
  "vitamine b12": "vitamin_b12", "vitamin b12": "vitamin_b12", "witamina b12": "vitamin_b12",
  "cobalamine": "vitamin_b12", "cyanocobalamine": "vitamin_b12", "cyanocobalamin": "vitamin_b12",
  "methylcobalamine": "vitamin_b12", "kobalamina": "vitamin_b12",
  // B9
  "vitamine b9": "vitamin_b9", "vitamin b9": "vitamin_b9", "witamina b9": "vitamin_b9",
  "acide folique": "vitamin_b9", "folic acid": "vitamin_b9", "kwas foliowy": "vitamin_b9",
  "folate": "vitamin_b9", "folates": "vitamin_b9",
  // B8
  "vitamine b8": "vitamin_b8", "biotine": "vitamin_b8", "biotin": "vitamin_b8",
  "biotyna": "vitamin_b8", "vitamine h": "vitamin_b8", "witamina b7": "vitamin_b8",
  "vitamin b7": "vitamin_b8", "vitamine b7": "vitamin_b8",
  // Autres B
  "vitamine b1": "vitamin_b1", "thiamine": "vitamin_b1", "tiamina": "vitamin_b1", "witamina b1": "vitamin_b1",
  "vitamine b2": "vitamin_b2", "riboflavine": "vitamin_b2", "riboflavin": "vitamin_b2", "ryboflawina": "vitamin_b2", "witamina b2": "vitamin_b2",
  "vitamine b3": "vitamin_b3", "niacine": "vitamin_b3", "niacin": "vitamin_b3", "niacyna": "vitamin_b3", "vitamine pp": "vitamin_b3", "witamina b3": "vitamin_b3",
  "vitamine b5": "vitamin_b5", "acide pantothenique": "vitamin_b5", "acide pantothénique": "vitamin_b5",
  "pantothenic acid": "vitamin_b5", "kwas pantotenowy": "vitamin_b5", "witamina b5": "vitamin_b5",
  "vitamine b6": "vitamin_b6", "pyridoxine": "vitamin_b6", "witamina b6": "vitamin_b6", "vitamin b6": "vitamin_b6",
  // Vitamines liposolubles / C
  "vitamine c": "vitamin_c", "vitamin c": "vitamin_c", "witamina c": "vitamin_c",
  "acide ascorbique": "vitamin_c", "ascorbic acid": "vitamin_c", "kwas askorbinowy": "vitamin_c",
  "vitamine e": "vitamin_e", "vitamin e": "vitamin_e", "witamina e": "vitamin_e", "tocopherol": "vitamin_e", "tocophérol": "vitamin_e",
  "vitamine k": "vitamin_k", "vitamine k2": "vitamin_k", "vitamin k": "vitamin_k", "vitamin k2": "vitamin_k",
  "witamina k": "vitamin_k", "witamina k2": "vitamin_k", "menaquinone": "vitamin_k", "phylloquinone": "vitamin_k",
  "vitamine a": "vitamin_a", "vitamin a": "vitamin_a", "witamina a": "vitamin_a", "retinol": "vitamin_a", "rétinol": "vitamin_a",
  // Minéraux
  "calcium": "calcium", "wapn": "calcium", "wapń": "calcium",
  "magnesium": "magnesium", "magnésium": "magnesium", "magnez": "magnesium",
  "fer": "iron", "iron": "iron", "zelazo": "iron", "żelazo": "iron",
  "zinc": "zinc", "cynk": "zinc",
  "selenium": "selenium", "sélénium": "selenium", "selen": "selenium",
  "potassium": "potassium", "potas": "potassium",
  "phosphore": "phosphore", "phosphorus": "phosphore", "fosfor": "phosphore",
  "iode": "iode", "iodine": "iode", "jod": "iode",
  "manganese": "manganese", "manganèse": "manganese", "mangan": "manganese",
  "cuivre": "cuivre", "copper": "cuivre", "miedz": "cuivre", "miedź": "cuivre",
  "chrome": "chrome", "chromium": "chrome", "chrom": "chrome",
  "molybdene": "molybdene", "molybdène": "molybdene", "molybdenum": "molybdene", "molibden": "molybdene",
  // Divers
  "omega 3": "omega3", "omega-3": "omega3", "oméga 3": "omega3", "oméga-3": "omega3", "epa": "omega3", "dha": "omega3",
  "proteines": "proteins", "protéines": "proteins", "protein": "proteins", "bialko": "proteins", "białko": "proteins",
  "fibres": "fibres", "fibre": "fibres", "blonnik": "fibres", "błonnik": "fibres",
  // Macros énergétiques (poudres, substituts de repas)
  "glucides": "carbs", "carbohydrates": "carbs", "weglowodany": "carbs", "węglowodany": "carbs",
  "lipides": "fats", "matieres grasses": "fats", "matières grasses": "fats", "fat": "fats", "fats": "fats", "tluszcze": "fats", "tłuszcze": "fats",
  "calories": "calories", "energie": "calories", "énergie": "calories", "valeur energetique": "calories", "valeur énergétique": "calories", "energy": "calories", "wartosc energetyczna": "calories",
};

function normalize(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function mapKey(label: string): string | null {
  const n = normalize(label);
  if (SYNONYMS[n]) return SYNONYMS[n];
  const direct = n.replace(/[\s-]/g, "_");
  if (KNOWN_KEYS.includes(direct)) return direct;
  // correspondance partielle sur les synonymes les plus longs d'abord
  const keys = Object.keys(SYNONYMS).sort((a, b) => b.length - a.length);
  for (const k of keys) {
    if (n.includes(k)) return SYNONYMS[k];
  }
  return null;
}

function normUnit(u: string): string {
  const n = normalize(u);
  if (["ug", "mcg", "µg", "mikrogram", "mikrogramy"].includes(n) || /^u?g$/.test(n) && n === "ug") return "µg";
  if (n === "mg" || n === "miligram") return "mg";
  if (n === "g" || n === "gram" || n === "gramme" || n === "grammes") return "g";
  if (n === "ml") return "ml";
  if (n === "ui" || n === "iu" || n === "j m" || n === "jm") return "UI";
  return u.trim() || "mg";
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

    const { image, images } = await req.json();
    const list: string[] = Array.isArray(images) && images.length
      ? images
      : (typeof image === "string" && image ? [image] : []);
    if (!list.length) {
      return new Response(JSON.stringify({ error: "invalid_input", message: "Image manquante." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const dataUrls = list
      .slice(0, 3)
      .map((i) => (i.startsWith("data:") ? i : `data:image/jpeg;base64,${i}`));

    const systemPrompt = `Tu lis l'étiquette d'un complément alimentaire et tu en extrais la composition. L'étiquette peut être en français, anglais ou polonais.

RÈGLES STRICTES:
- Renvoie la QUANTITÉ ABSOLUE de chaque nutriment (mg, µg, g, UI), jamais le pourcentage.
- Si SEUL un pourcentage des Apports de Référence (AR / NRV / RWS / %) est indiqué, mets "amount": null et renseigne "percent_ar".
- Les quantités sont celles de la DOSE JOURNALIÈRE indiquée sur l'étiquette (ex: "2 gélules"). Si le tableau est "pour 1 gélule" alors que la dose est 2 gélules, indique-le dans "amount_basis": "par_prise", sinon "par_jour".
- Recopie le nom du nutriment TEL QU'IL APPARAÎT sur l'étiquette dans "label".
- Ingrédients non micronutriments (extraits de plantes, probiotiques, acides aminés, collagène, huiles) : place-les dans "other_ingredients" avec leur quantité, pas dans "nutrients".
- N'invente rien. Si une valeur est illisible, mets null.

Réponds STRICTEMENT en JSON:
{
  "product_name": string|null,
  "brand": string|null,
  "daily_dose": string|null,
  "daily_dose_count": number|null,
  "dose_unit": "gélule"|"comprimé"|"sachet"|"ml"|"g"|null,
  "language": "fr"|"en"|"pl"|"other",
  "nutrients": [{"label": string, "amount": number|null, "unit": "mg"|"µg"|"g"|"UI"|null, "percent_ar": number|null, "amount_basis": "par_jour"|"par_prise"}],
  "other_ingredients": [{"label": string, "amount": number|null, "unit": string|null}],
  "issue": null|"blurry"|"not_a_label"|"too_dark"
}`;

    const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${OPENAI_API_KEY}` },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: [
              { type: "text", text: "Lis cette étiquette de complément alimentaire et extrais la composition complète." },
              ...dataUrls.map((url) => ({ type: "image_url", image_url: { url, detail: "high" } })),
            ],
          },
        ],
        response_format: { type: "json_object" },
        max_tokens: 1500,
      }),
    });

    if (!openaiRes.ok) {
      const t = await openaiRes.text();
      console.error("vision error", openaiRes.status, t);
      return new Response(JSON.stringify({ error: "openai_error", message: "Lecture impossible pour le moment." }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const json = await openaiRes.json();
    let parsed: any = {};
    try { parsed = JSON.parse(json?.choices?.[0]?.message?.content || "{}"); } catch { parsed = {}; }

    // Références d'étiquetage UE pour convertir un % AR en quantité
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { data: refs } = await supabase
      .from("nutrient_references")
      .select("nutrient_key, unite, ar_etiquetage_ue, rnp_anses, limite_haute");
    const refMap: Record<string, any> = {};
    for (const r of refs || []) refMap[r.nutrient_key] = r;

    const doseCount = Number(parsed.daily_dose_count) > 0 ? Number(parsed.daily_dose_count) : 1;

    const nutrients: any[] = [];
    const unrecognized: any[] = [];
    for (const raw of Array.isArray(parsed.nutrients) ? parsed.nutrients : []) {
      const label = String(raw?.label || "").trim();
      if (!label) continue;
      const key = mapKey(label);
      let amount = raw?.amount === null || raw?.amount === undefined ? null : Number(raw.amount);
      if (amount !== null && (!isFinite(amount) || amount < 0)) amount = null;
      let unit = raw?.unit ? normUnit(String(raw.unit)) : null;
      let source: "etiquette" | "converti_ar" = "etiquette";
      const percent = raw?.percent_ar === null || raw?.percent_ar === undefined ? null : Number(raw.percent_ar);

      if (!key) {
        unrecognized.push({ label, amount, unit, percent_ar: percent });
        continue;
      }

      const ref = refMap[key];

      // Conversion UI → µg / mg pour les vitamines les plus courantes
      if (unit === "UI" && amount !== null) {
        if (key === "vitamin_d") { amount = amount * 0.025; unit = "µg"; }
        else if (key === "vitamin_e") { amount = amount * 0.67; unit = "mg"; }
        else if (key === "vitamin_a") { amount = amount * 0.3; unit = "µg"; }
      }

      // Seul le % AR est disponible → conversion via la référence d'étiquetage UE
      if (amount === null && percent !== null && ref?.ar_etiquetage_ue) {
        amount = (Number(ref.ar_etiquetage_ue) * percent) / 100;
        unit = ref.unite;
        source = "converti_ar";
      }

      if (amount === null) {
        unrecognized.push({ label, amount: null, unit, percent_ar: percent, key });
        continue;
      }

      // Ramener à la dose journalière si l'étiquette donne le "par prise"
      if (raw?.amount_basis === "par_prise" && doseCount > 1) amount = amount * doseCount;

      if (!unit) unit = ref?.unite || "mg";
      // Harmoniser avec l'unité de référence (g↔mg, mg↔µg)
      if (ref?.unite && unit !== ref.unite) {
        const conv: Record<string, number> = { "g>mg": 1000, "mg>µg": 1000, "g>µg": 1e6, "mg>g": 0.001, "µg>mg": 0.001, "µg>g": 1e-6 };
        const f = conv[`${unit}>${ref.unite}`];
        if (f) { amount = amount * f; unit = ref.unite; }
      }

      nutrients.push({
        nutrient_key: key,
        label,
        amount: Math.round(amount * 10000) / 10000,
        unit,
        source,
        percent_ar: percent,
        rnp_anses: ref?.rnp_anses ?? null,
        limite_haute: ref?.limite_haute ?? null,
      });
    }

    const other = (Array.isArray(parsed.other_ingredients) ? parsed.other_ingredients : [])
      .map((o: any) => ({
        label: String(o?.label || "").trim(),
        amount: o?.amount === null || o?.amount === undefined ? null : Number(o.amount),
        unit: o?.unit ? String(o.unit) : null,
      }))
      .filter((o: any) => o.label);

    const issue = ["blurry", "not_a_label", "too_dark"].includes(parsed.issue) ? parsed.issue : null;

    return new Response(JSON.stringify({
      product_name: parsed.product_name || null,
      brand: parsed.brand || null,
      daily_dose: parsed.daily_dose || null,
      daily_dose_count: parsed.daily_dose_count ?? null,
      dose_unit: parsed.dose_unit || null,
      language: parsed.language || null,
      nutrients,
      unrecognized,
      other_ingredients: other,
      issue: nutrients.length === 0 ? (issue || "not_a_label") : null,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("analyze-supplement-label error", e);
    return new Response(JSON.stringify({ error: "server_error", message: "Erreur serveur." }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
