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
    const prompt = `Tu es Sophie, nutritionniste spécialisée en ménopause avec une expertise pointue.

Profil: âge ${p.age ?? "non renseigné"}, stade: ${p.menopause_stage ?? "non renseigné"}, symptômes: ${(p.symptoms || []).join(", ") || "aucun"}, poids: ${p.weight ?? "?"}kg, taille: ${p.height ?? "?"}cm, activité: ${p.activity_level ?? "non renseignée"}.

Génère 3 insights nutritionnels SURPRENANTS et peu connus pour ce profil exact.

Pas de conseils évidents. Chaque insight doit:
- Expliquer un mécanisme biologique précis
- Connecter directement aux symptômes déclarés
- Apporter une information que la femme n'a probablement jamais entendue

Exemples du niveau attendu:
- Lien entre oestrogène et absorption du magnésium qui change en ménopause
- Rôle de la vitamine K2 souvent oubliée
- Impact du microbiote sur les phytoestrogènes
- Lien entre cortisol et carences en B6

Format JSON:
{
  insights: [{
    title: string (6 mots max, accrocheur),
    explanation: string (2-3 phrases, mécanisme précis),
    action: string (conseil spécifique et non-évident),
    emoji: string
  }],
  empathy_message: string (1 phrase qui montre qu'on comprend vraiment leur vécu),
  promise_message: string (1 phrase sur ce que NutriMéno va faire concrètement)
}

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
            description: "Return personalized surprising nutritional insights",
            parameters: {
              type: "object",
              properties: {
                insights: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      title: { type: "string" },
                      explanation: { type: "string" },
                      action: { type: "string" },
                      emoji: { type: "string" },
                    },
                    required: ["title", "explanation", "action", "emoji"],
                  },
                },
                empathy_message: { type: "string" },
                promise_message: { type: "string" },
              },
              required: ["insights", "empathy_message", "promise_message"],
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
