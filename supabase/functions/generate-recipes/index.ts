// Edge function: generate recipes via Lovable AI Gateway, filtered by user profile
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import {
  buildProfileRestrictionsContext,
  isRecipeAllowed,
} from "../_shared/profileRestrictions.ts";
import { matchCiqual } from "../_shared/ciqualMatch.ts";
import { computeRecipeTotals, isOverBudget, parseRecipe, scaleToBudget } from "../_shared/sophieRecipe.ts";
import { enforceDailyLimit, requireUser } from "../_shared/requireUser.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  // Seule une utilisatrice connectée peut appeler cette fonction.
  const auth = await requireUser(req, corsHeaders);
  if (auth instanceof Response) return auth;
  const overLimit = await enforceDailyLimit(auth.user.id, "generate-recipes", corsHeaders);
  if (overLimit) return overLimit;

  try {
    const { context, count = 3, exclude = [], budget: rawBudget } = await req.json();
    // Budget calorique du repas, envoyé par l'écran (mêmes chiffres que l'accueil).
    const budget = Number(rawBudget) > 0 ? Math.round(Number(rawBudget)) : null;
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    let alreadyProposed: string[] = [];
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    // Load profile restrictions if user is authenticated
    let restrictionsBlock = "";
    let dietaryCodes: string[] = [];
    const authHeader = req.headers.get("Authorization");
    if (authHeader) {
      try {
        const token = authHeader.replace("Bearer ", "");
        const { data: { user } } = await supabase.auth.getUser(token);
        if (user) {
          const { data: profile } = await supabase
            .from("profiles").select("*").eq("user_id", user.id).single();
          const ctx = buildProfileRestrictionsContext(profile);
          restrictionsBlock = ctx.promptBlock;
          dietaryCodes = ctx.dietaryCodes;
          // Plats déjà proposés par Sophie : à ne pas reprendre.
          const dishes = (profile as any)?.sophie_preferences?.proposed_dishes;
          if (Array.isArray(dishes)) alreadyProposed = dishes.map((d: any) => String(d?.dish_name || "")).filter(Boolean);
        }
      } catch (e) {
        console.warn("generate-recipes: profile fetch failed", e);
      }
    }

    const systemPrompt = `Tu es une nutritionniste spécialisée en ménopause.
Génère ${count} recettes variées, simples et appétissantes adaptées aux besoins nutritionnels de la ménopause.
Contexte: ${context}
Contraintes:
- Ingrédients accessibles en supermarché français
- Temps de préparation max 30 minutes
- Pas de recettes déjà proposées, ni de simple variante : ${[...exclude, ...alreadyProposed].join(", ") || "aucune"}
- Recette pour UNE personne${budget != null ? `, ${budget} kcal au maximum pour le plat entier` : ""}
- Ingrédients en grammes, poids CRUS, matière grasse de cuisson comprise, nommés simplement comme dans une table de composition (« blanc de poulet », « riz basmati cru », « huile d'olive »)
- N'écris aucune calorie ni valeur nutritionnelle : elles sont calculées ensuite
- Pas de tofu ni de produit au soja

${restrictionsBlock}

Réponds UNIQUEMENT en JSON valide:
{"recipes":[{"name":"string","prep_time":"string","cook_time":"string","ingredients":[{"name":"string","grams":number}],"steps":["string"],"addresses":"string"}]}`;

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Génère ${count} recettes pour: ${context}` },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error("AI gateway error", res.status, text);
      return new Response(JSON.stringify({ error: "AI error", status: res.status }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content || "{}";
    let parsed: any;
    try {
      parsed = JSON.parse(content);
    } catch {
      parsed = { recipes: [] };
    }

    // Safety net: post-filter any recipe that slipped through with forbidden ingredients
    if (Array.isArray(parsed?.recipes) && dietaryCodes.length > 0) {
      parsed.recipes = parsed.recipes.filter((r: any) => isRecipeAllowed(r, dietaryCodes));
    }

    // Calories et protéines calculées avec la table CIQUAL, jamais annoncées par le modèle.
    const recipes: any[] = [];
    for (const r of Array.isArray(parsed?.recipes) ? parsed.recipes : []) {
      const recipe = parseRecipe({
        nom: r?.name,
        ingredients: (Array.isArray(r?.ingredients) ? r.ingredients : []).map((i: any) => ({ nom: i?.name, grammes: i?.grams })),
        etapes: r?.steps,
      });
      if (!recipe) continue;
      const rows = await Promise.all(recipe.ingredients.map(async (ing) => {
        try { return (await matchCiqual(supabase, ing.nom, { ingredientsBruts: true }))?.row ?? null; } catch { return null; }
      }));
      let final = recipe;
      let totals = computeRecipeTotals(recipe, rows);
      if (budget != null && totals.missing.length === 0 && isOverBudget(totals.kcal, budget)) {
        const scaled = scaleToBudget(recipe, totals.kcal, budget);
        // Trop au-dessus du budget pour être réduite sans dénaturer le plat : écartée.
        if (!scaled) continue;
        final = scaled;
        totals = computeRecipeTotals(scaled, rows);
      }
      recipes.push({
        ...r,
        ingredients: final.ingredients.map((i) => ({ name: i.nom, grams: i.grammes })),
        calories: totals.kcal,
        proteins: totals.proteins,
        uncounted: [...totals.missing, ...totals.ignored],
        calories_partial: totals.missing.length > 0,
      });
    }
    parsed = { recipes };

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
