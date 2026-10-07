// Lit une fiche recette de box repas (Quitoque & co) :
// nom, nombre de portions, ingrédients avec QUANTITÉS RÉELLES, et le tableau
// nutritionnel par portion s'il figure. Les macros sont reprises telles quelles
// quand le tableau existe (MESURÉ), sinon calculées depuis les ingrédients via
// aliments_ciqual (ESTIMÉ). Les micronutriments sont toujours calculés depuis
// les ingrédients. Tout est divisé par le nombre de portions.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { isAlcoholicDrink, matchCiqual } from "../_shared/ciqualMatch.ts";
import { isIgnorableHerb, norm, toGrams } from "../_shared/portionWeights.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};







// Ingrédients « chez soi » non quantifiés : jamais estimés
const PANTRY = /^(huile|sel|poivre|beurre|vinaigre|epices?|épices?|eau)\b/i;

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

const CEIL_PER_100G: Record<string, number> = {
  calories: 900, proteins: 100, carbs: 100, fats: 100, fibres: 80,
  calcium: 2000, vitamin_d: 100, magnesium: 1000, iron: 100, omega3: 60,
  phytoestrogens: 1000, vitamin_b12: 100, potassium: 5000, zinc: 100,
  vitamin_k: 1500, vitamin_b6: 10, vitamin_b9: 2000, vitamin_e: 100,
};

function sanitize(key: string, raw: unknown, name: string): number | null {
  if (raw === null || raw === undefined || raw === "") return null;
  let v = Number(raw);
  if (!isFinite(v) || v < 0) return null;
  const isOil = /huile|oil/i.test(name);
  if (key === "vitamin_d" && v > 50) v = v / 40;
  if (key === "omega3" && !isOil && v > 60) v = v / 1000;
  if (key === "zinc" && v > 100) v = v / 1000;
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




const SYSTEM_PROMPT = `Tu lis une FICHE RECETTE de box repas (Quitoque, HelloFresh…), pas une étiquette.

RÈGLES STRICTES:
- "recipe_name" = le nom du plat tel qu'écrit.
- "servings" = le nombre de portions/personnes indiqué sur la fiche (souvent 2 ou 4). Si absent, null.
- "ingredients" = TOUS les ingrédients avec leur quantité telle qu'écrite. Pour chacun :
  "name" (nom simple en français), "quantity" (nombre, null si non chiffré), "unit" ("g","ml","cl","piece","cas","cac", null si inconnu),
  "pantry" = true si l'ingrédient fait partie des "à prévoir chez vous" / non fourni dans le panier (huile, beurre, sel, poivre…).
- N'INVENTE aucune quantité : si la fiche n'en donne pas, quantity = null.
- Plusieurs photos peuvent être fournies (recto, verso…) : c'est UNE SEULE fiche, fusionne les informations.
- TABLEAU NUTRITIONNEL : une fiche peut contenir plusieurs tableaux (plat complet, sauce, ingrédient isolé…). Tu dois identifier celui du PLAT COMPLET.
  "nutrition_per_portion" = la colonne « par portion » / « par personne » DU PLAT COMPLET. Jamais la colonne « pour 100 g ». Null si absente.
  "nutrition_per_100g" = la colonne « pour 100 g » DU PLAT COMPLET, null si absente.
  "portion_weight_g" = le poids d'une portion écrit sur la fiche (ex. « 1 portion = 360 g »), null s'il n'est pas écrit. Ne le devine jamais.
  "table_candidates" : si tu hésites entre plusieurs tableaux, liste-les TOUS ici (label = ce que le tableau décrit d'après la fiche, basis = "portion" ou "100g"), sinon [].

Réponds STRICTEMENT en JSON:
{
  "recipe_name": string|null,
  "brand": string|null,
  "servings": number|null,
  "ingredients": [{"name": string, "quantity": number|null, "unit": string|null, "pantry": boolean}],
  "nutrition_per_portion": NUTRI|null,
  "nutrition_per_100g": NUTRI|null,
  "portion_weight_g": number|null,
  "table_candidates": [{"label": string, "basis": "portion"|"100g", "values": NUTRI}],
  "issue": null|"blurry"|"not_a_recipe"|"too_dark"
}
où NUTRI = {"calories": number|null, "proteins": number|null, "carbs": number|null, "sugars": number|null, "fats": number|null, "saturated_fats": number|null, "fibres": number|null, "salt": number|null}`;

export async function buildResult(supabase: any, parsed: any) {
  const servings = Math.max(1, Math.round(num(parsed?.servings) || 2));
  const rawIngredients = Array.isArray(parsed?.ingredients) ? parsed.ingredients : [];

  const counted: any[] = [];
  const needsManual: { name: string; quantity: number | null; unit: string | null; reason: string; not_found?: boolean }[] = [];
  const pantryItems: string[] = [];
  let totalGrams = 0;

  const totals: Record<string, number> = {};
  const hasValue: Record<string, boolean> = {};
  for (const key of Object.values(CIQUAL_MAP)) { totals[key] = 0; hasValue[key] = false; }

  for (const ing of rawIngredients) {
    const name = String(ing?.name || "").trim();
    if (!name) continue;
    const isPantry = ing?.pantry === true || PANTRY.test(norm(name));
    const quantity = num(ing?.quantity);
    if (isPantry && quantity === null) { pantryItems.push(name); continue; }
    if (isIgnorableHerb(name, quantity, ing?.unit ?? null)) { pantryItems.push(name); continue; }

    const alcohol = isAlcoholicDrink(name);
    const { grams, basis } = toGrams(name, quantity, ing?.unit ?? null);
    // Vin, cidre, bière : macros quasi nulles, ignorés comme le sel s'ils n'ont pas de poids
    if (alcohol && (grams === null || grams <= 0)) { pantryItems.push(name); continue; }
    if (grams === null || grams <= 0) {
      needsManual.push({ name, quantity, unit: ing?.unit ?? null, reason: basis });
      continue;
    }

    let match: any = null;
    try { match = await matchCiqual(supabase, name); } catch { match = null; }
    if (!match) {
      if (alcohol || isIgnorableUnmatched(grams)) { pantryItems.push(name); continue; }
      needsManual.push({ name, quantity, unit: ing?.unit ?? null, reason: "introuvable dans la base", not_found: true } as any);
      continue;
    }

    totalGrams += grams;
    const scale = grams / 100;
    for (const [col, key] of Object.entries(CIQUAL_MAP)) {
      const v = sanitize(key, match.row[col], match.row.nom || name);
      if (v === null) continue;
      hasValue[key] = true;
      totals[key] += v * scale;
    }
    counted.push({ name, grams: round(grams, 1), ciqual: match.row.nom, basis });
  }

  // Par portion
  const computed: Record<string, number | null> = {};
  for (const key of Object.values(CIQUAL_MAP)) {
    computed[key] = hasValue[key] ? round(totals[key] / servings, 3) : null;
  }

  // Priorité : par portion du plat complet > pour 100 g × poids réel écrit sur la fiche > rien
  const MK = ["calories", "proteins", "carbs", "sugars", "fats", "saturated_fats", "fibres", "salt"];
  const hasAny = (t: any) => !!t && MK.some((k) => num(t[k]) !== null);
  const printedWeight = num(parsed?.portion_weight_g);
  let table: any = null;
  let tableBasis: "portion" | "100g_x_poids" | "100g_sans_poids" | null = null;
  if (hasAny(parsed?.nutrition_per_portion)) { table = parsed.nutrition_per_portion; tableBasis = "portion"; }
  else if (hasAny(parsed?.nutrition_per_100g)) {
    if (printedWeight && printedWeight > 0) {
      table = {};
      for (const k of MK) { const v = num(parsed.nutrition_per_100g[k]); table[k] = v === null ? null : round(v * printedWeight / 100, 2); }
      tableBasis = "100g_x_poids";
    } else tableBasis = "100g_sans_poids";
  }
  const candidates = (Array.isArray(parsed?.table_candidates) ? parsed.table_candidates : [])
    .filter((c: any) => c && hasAny(c.values))
    .map((c: any) => ({ label: String(c.label || "Tableau"), basis: c.basis === "100g" ? "100g" : "portion", values: Object.fromEntries(MK.map((k) => [k, num(c.values[k])])) }));
  const measured: Record<string, number | null> = {};
  const MACRO_KEYS = ["calories", "proteins", "carbs", "sugars", "fats", "saturated_fats", "fibres", "salt"];
  let measuredAny = false;
  for (const k of MACRO_KEYS) {
    const v = table ? num(table[k]) : null;
    measured[k] = v;
    if (v !== null) measuredAny = true;
  }
  const salt = measured.salt;
  measured.sodium = salt === null ? null : round(salt / 2.54, 3);

  return {
    recipe_name: parsed?.recipe_name || null,
    brand: parsed?.brand || null,
    servings,
    total_grams: round(totalGrams, 1),
    portion_grams: printedWeight && printedWeight > 0 ? printedWeight : (totalGrams > 0 ? round(totalGrams / servings, 1) : null),
    portion_weight_printed: printedWeight && printedWeight > 0 ? printedWeight : null,
    table_basis: tableBasis,
    per_100g: tableBasis === "100g_sans_poids" ? Object.fromEntries(MK.map((k) => [k, num(parsed.nutrition_per_100g[k])])) : null,
    table_candidates: candidates.length > 1 ? candidates : [],
    macros_source: measuredAny ? "etiquette" : "calcule",
    // Quand les macros sont calculées depuis les ingrédients, tout ingrédient dont le
    // poids est inconnu a été écarté : le total est PARTIEL, donc sous-estimé. Sans ce
    // drapeau le client affichait un total incomplet comme s'il était complet.
    macros_complete: needsManual.length === 0 || ["calories", "proteins", "carbs", "fats"].every((k) => measured[k] !== null),
    micros_complete: needsManual.length === 0,
    // Renvoyé pour permettre un recalcul avec des poids saisis à la main, sans
    // repayer une lecture d'image.
    parsed_echo: parsed,
    // Par macro : la valeur imprimée si elle existe, sinon le calcul depuis les
    // ingrédients. Une fiche qui n'imprime que « 545 kcal » garde ses kcal et
    // reçoit des protéines/glucides/lipides/fibres calculés.
    macro_sources: Object.fromEntries(["calories", "proteins", "carbs", "fats", "fibres"].map((k) =>
      [k, measured[k] !== null ? "etiquette" : (computed[k] !== null ? "calcule" : null)])),
    macros_per_portion: {
      calories: measured.calories ?? computed.calories,
      proteins: measured.proteins ?? computed.proteins,
      carbs: measured.carbs ?? computed.carbs,
      sugars: measured.sugars,
      fats: measured.fats ?? computed.fats,
      saturated_fats: measured.saturated_fats,
      fibres: measured.fibres ?? computed.fibres,
      salt: measured.salt,
      sodium: measured.sodium,
    },
    micros_per_portion: {
      calcium: computed.calcium, magnesium: computed.magnesium, iron: computed.iron,
      zinc: computed.zinc, potassium: computed.potassium, vitamin_d: computed.vitamin_d,
      vitamin_b12: computed.vitamin_b12, vitamin_b6: computed.vitamin_b6,
      vitamin_b9: computed.vitamin_b9, vitamin_k: computed.vitamin_k,
      vitamin_e: computed.vitamin_e, omega3: computed.omega3,
      phytoestrogens: computed.phytoestrogens,
    },
    counted_ingredients: counted,
    needs_manual: needsManual,
    pantry_items: pantryItems,
    issue: ["blurry", "not_a_recipe", "too_dark"].includes(parsed?.issue) ? parsed.issue : null,
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

    // Recalcul sans nouvelle lecture d'image : le client renvoie l'analyse déjà
    // obtenue (parsed_echo) accompagnée des poids qu'il a saisis pour les
    // ingrédients absents de la table de poids standards.
    if (body?.parsed && typeof body.parsed === "object") {
      const overrides = Array.isArray(body?.ingredient_overrides) ? body.ingredient_overrides : [];
      const parsedRe = JSON.parse(JSON.stringify(body.parsed));
      if (Array.isArray(parsedRe.ingredients)) {
        for (const o of overrides) {
          const g = num(o?.grams);
          if (g === null || g <= 0) continue;
          const target = norm(String(o?.name || ""));
          if (!target) continue;
          for (const ing of parsedRe.ingredients) {
            if (norm(String(ing?.name || "")) === target) {
              ing.quantity = g;
              ing.unit = "g";
              ing.pantry = false;
            }
          }
        }
      }
      const supabaseRe = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      );
      const recomputed = await buildResult(supabaseRe, parsedRe);
      return new Response(JSON.stringify(recomputed), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const list: string[] = Array.isArray(body?.images) && body.images.length
      ? body.images
      : (typeof body?.image === "string" && body.image ? [body.image] : []);
    if (!list.length) {
      return new Response(JSON.stringify({ error: "invalid_input", message: "Image manquante." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const dataUrls = list.slice(0, 4).map((i) => (i.startsWith("data:") ? i : `data:image/jpeg;base64,${i}`));

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
              { type: "text", text: "Lis cette fiche recette (toutes les photos = une seule fiche) : nom, nombre de portions, ingrédients avec quantités, tableau nutritionnel s'il figure." },
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
    console.error("analyze-recipe-card error", e);
    return new Response(JSON.stringify({ error: "server_error", message: "Erreur serveur." }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
