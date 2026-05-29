import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) throw new Error("OPENAI_API_KEY missing");

    const authHeader = req.headers.get("Authorization") || "";
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
    const { data: { user } } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    if (!user) {
      return new Response(JSON.stringify({ error: "Non authentifié" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: profile } = await supabase
      .from("profiles").select("*").eq("user_id", user.id).single();

    // Return cached
    if (profile?.nutritional_diagnosis) {
      return new Response(JSON.stringify(profile.nutritional_diagnosis), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const p: any = profile || {};
    const prompt = `Tu es Sophie, nutritionniste spécialisée en ménopause. Basé sur ce profil:
- Âge: ${p.age ?? "non renseigné"} ans
- Poids: ${p.weight ?? "non renseigné"} kg
- Taille: ${p.height ?? "non renseignée"} cm
- Stade: ${p.menopause_stage ?? "non renseigné"}
- Symptômes principaux: ${(p.symptoms || []).join(", ") || "aucun"}
- Activité: ${p.activity_level ?? "non renseignée"}

Génère un diagnostic nutritionnel personnalisé:
1. Les 3 carences les plus probables pour ce profil (avec une explication courte et un emoji par nutriment).
2. Un message d'empathie et de réassurance chaleureux (2-3 phrases).
3. Ce que NutriMéno va faire pour aider (2-3 phrases).

Réponds UNIQUEMENT via l'appel d'outil.`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        tools: [{
          type: "function",
          function: {
            name: "diagnosis",
            description: "Return personalized nutritional diagnosis",
            parameters: {
              type: "object",
              properties: {
                likely_deficiencies: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      nutrient: { type: "string" },
                      reason: { type: "string" },
                      emoji: { type: "string" },
                    },
                    required: ["nutrient", "reason", "emoji"],
                  },
                },
                empathy_message: { type: "string" },
                promise_message: { type: "string" },
              },
              required: ["likely_deficiencies", "empathy_message", "promise_message"],
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "diagnosis" } },
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const t = await response.text();
      throw new Error(`OpenAI ${response.status}: ${t}`);
    }
    const result = await response.json();
    const args = result.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    if (!args) throw new Error("Réponse invalide");
    const diagnosis = JSON.parse(args);

    await supabase.from("profiles").update({ nutritional_diagnosis: diagnosis }).eq("user_id", user.id);

    return new Response(JSON.stringify(diagnosis), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-diagnosis:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erreur" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
