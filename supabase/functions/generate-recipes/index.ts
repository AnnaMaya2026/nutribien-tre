// Edge function: generate recipes via Lovable AI Gateway, filtered by user profile
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import {
  buildProfileRestrictionsContext,
  isRecipeAllowed,
} from "../_shared/profileRestrictions.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { context, count = 3, exclude = [] } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    // Load profile restrictions if user is authenticated
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
        console.warn("generate-recipes: profile fetch failed", e);
      }
    }

    const systemPrompt = `Tu es une nutritionniste spécialisée en ménopause.
Génère ${count} recettes variées, simples et appétissantes adaptées aux besoins nutritionnels de la ménopause.
Contexte: ${context}
Contraintes:
- Ingrédients accessibles en supermarché français
- Temps de préparation max 30 minutes
- Pas de recettes déjà proposées: ${exclude.join(", ") || "aucune"}

${restrictionsBlock}

Réponds UNIQUEMENT en JSON valide:
{"recipes":[{"name":"string","prep_time":"string","cook_time":"string","ingredients":[{"name":"string","grams":number}],"steps":["string"],"calories":number,"proteins":number,"addresses":"string"}]}`;

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
