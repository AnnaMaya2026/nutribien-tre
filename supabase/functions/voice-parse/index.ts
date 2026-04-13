import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { transcript } = await req.json();
    if (!transcript || typeof transcript !== "string" || transcript.trim().length < 2) {
      return new Response(JSON.stringify({ error: "Transcription invalide" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) throw new Error("OPENAI_API_KEY is not configured");

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `Tu es un assistant nutritionnel français. Analyse cette phrase et identifie les aliments avec leurs quantités en grammes. Si aucune quantité n'est précisée, estime une portion standard. Retourne UNIQUEMENT le mot clé principal de chaque aliment, sans adjectif ni mode de cuisson. Exemples: 'poulet' pas 'poulet rôti', 'oeuf' pas 'oeuf dur', 'pomme' pas 'pomme verte', 'riz' pas 'riz basmati'. Réponds UNIQUEMENT en JSON valide, sans markdown ni backticks:
{"foods": [{"name": "mot clé principal", "grams": nombre}]}
Exemples de portions standards: un oeuf = 60g, une pomme = 150g, un verre de lait = 200g, une tranche de pain = 30g, un yaourt = 125g.`,
          },
          { role: "user", content: transcript },
        ],
        temperature: 0.3,
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      const t = await response.text();
      console.error("OpenAI error:", response.status, t);
      return new Response(JSON.stringify({ error: "Erreur IA" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const result = await response.json();
    const content = result.choices?.[0]?.message?.content?.trim();

    if (!content) {
      return new Response(JSON.stringify({ error: "Pas de réponse IA" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Parse the JSON response
    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch {
      console.error("Failed to parse AI response:", content);
      return new Response(JSON.stringify({ error: "Je n'ai pas compris, réessayez" }), {
        status: 422,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!parsed.foods || !Array.isArray(parsed.foods) || parsed.foods.length === 0) {
      return new Response(JSON.stringify({ error: "Je n'ai pas compris, réessayez" }), {
        status: 422,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("voice-parse error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Erreur inconnue" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
