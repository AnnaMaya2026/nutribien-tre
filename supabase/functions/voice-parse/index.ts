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
            content: `Tu es un assistant nutritionnel français. Analyse cette phrase et identifie les aliments avec leurs quantités. Pour les aliments solides, retourne les quantités en grammes. Pour les liquides, retourne les volumes en millilitres (ml), mais garde la propriété JSON "grams" pour compatibilité. Si aucune quantité n'est précisée, estime une portion standard selon l'aliment. Retourne UNIQUEMENT le mot clé principal de chaque aliment, sans adjectif ni mode de cuisson. Exemples: 'poulet' pas 'poulet rôti', 'oeuf' pas 'oeuf dur', 'pomme' pas 'pomme verte', 'riz' pas 'riz basmati'.

Si l'utilisatrice mentionne des mesures courantes, convertis-les en grammes pour les solides et en ml pour les liquides:
- 1 cuillère à café (cc) = 5g (liquides) ou 3g (poudres)
- 1 cuillère à soupe (cs) = 15g (liquides) ou 10g (poudres)
- 1 verre = 200ml pour les liquides
- 1 bol = 300ml pour soupe/bouillon, 300g pour solides
- 1 tasse = 150ml pour café/thé/tisane/infusion, 250ml pour autres boissons, 250g pour solides
- 1 poignée = 30g
- 1 tranche = 30g (pain) ou 50g (viande/fromage)
- 1 portion = 150g (viande/poisson), 100g (légumes), ou 200ml (liquides)
- 1 filet = 150g
Multiplie par la quantité indiquée (ex: "2 cuillères à soupe d'huile" = 30ml). Pour l'huile, retourne le volume en ml; la conversion nutritionnelle sera faite ensuite.

Réponds UNIQUEMENT en JSON valide, sans markdown ni backticks:
{"foods": [{"name": "mot clé principal", "grams": nombre}]}
Exemples de portions standards: un oeuf = 55g, un yaourt = 125g, une portion de fromage = 30g, un croissant = 50g, une tranche de pain = 30g, une portion de baguette = 60g, un bol de céréales = 40g, une banane = 120g, une pomme = 150g, une orange = 150g, un kiwi = 80g, une portion de fraises = 150g, une carotte = 80g, une tomate = 120g, une courgette = 200g, une portion de poulet = 150g, une portion de saumon = 150g, un steak = 150g, deux tranches de jambon = 45g, une noix de beurre = 10g, une cuillère d'huile = 10ml, une poignée de noix = 30g, un verre de lait = 200ml, une tasse de café = 150ml, un bol de soupe = 300ml, un verre de jus d'orange = 200ml.

Exemples de conversion:
- "2 cuillères à soupe d'huile d'olive" → {"name": "huile olive", "grams": 30}
- "un oeuf" → {"name": "oeuf", "grams": 55}
- "une banane" → {"name": "banane", "grams": 120}
- "1 bol de flocons d'avoine" → {"name": "flocons avoine", "grams": 300}
- "1 verre de lait" → {"name": "lait", "grams": 200}
- "une tasse de café" → {"name": "café", "grams": 150}
- "un bol de soupe" → {"name": "soupe", "grams": 300}
- "un verre de jus d'orange" → {"name": "jus orange", "grams": 200}
- "une poignée de noix" → {"name": "noix", "grams": 30}`,
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
