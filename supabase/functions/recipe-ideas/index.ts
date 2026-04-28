// Edge function: generate 3 recipe ideas for a specific ingredient via OpenAI,
// filtered by the user's profile (dietary restrictions, health conditions).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import {
  buildProfileRestrictionsContext,
  isRecipeAllowed,
  isFoodAllowed,
} from "../_shared/profileRestrictions.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { ingredient, nutrient } = await req.json();
    if (!ingredient) {
      return new Response(JSON.stringify({ error: "ingredient required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) throw new Error("OPENAI_API_KEY not configured");

    // Load profile restrictions
    let restrictionsBlock = "";
    let dietaryCodes: string[] = [];
    const authHeader = req.headers.get("Authorization");
    if (authHeader) {
      try {
        const supabase = createClient(
          Deno.env.get("SUPABASE_URL")!,
          Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
        );
        const token = authHeader.replace("Bearer ", "");
        const { data: { user } } = await supabase.auth.getUser(token);
        if (user) {
          const { data: profile } = await supabase
            .from("profiles").select("*").eq("user_id", user.id).single();
          const ctx = buildProfileRestrictionsContext(profile);
          restrictionsBlock = ctx.promptBlock;
          dietaryCodes = ctx.dietaryCodes;
        }
      } catch (e) {
        console.warn("recipe-ideas: profile fetch failed", e);
      }
    }

    // If the requested ingredient itself violates the user's restrictions,
    // don't propose it — return an empty list so the UI can fall back.
    if (!isFoodAllowed(ingredient, dietaryCodes)) {
      return new Response(
        JSON.stringify({
          recipes: [],
          excluded: true,
          reason: `${ingredient} est exclu par vos restrictions alimentaires.`,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const systemPrompt = `Tu es une nutritionniste française spécialisée en ménopause.
Génère 3 idées de recettes simples et appétissantes utilisant "${ingredient}" comme ingrédient principal.${nutrient ? ` Cet aliment est riche en ${nutrient}, particulièrement utile pendant la ménopause.` : ""}
Contraintes:
- Ingrédients accessibles en supermarché français
- Temps de préparation max 30 minutes
- Recettes variées (pas 3 fois la même base)

${restrictionsBlock}

Réponds UNIQUEMENT en JSON valide:
{"recipes":[{"name":"string","prep_time":"string","description":"string (1-2 phrases courtes décrivant la recette)","ingredients":["string"],"steps":["string"]}]}`;

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Donne-moi 3 idées de recettes avec ${ingredient}.` },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error("OpenAI error", res.status, text);
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

    // Safety net post-filter
    if (Array.isArray(parsed?.recipes) && dietaryCodes.length > 0) {
      parsed.recipes = parsed.recipes.filter((r: any) => isRecipeAllowed(r, dietaryCodes));
    }

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
