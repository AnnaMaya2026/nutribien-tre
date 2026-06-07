import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) {
      return new Response(JSON.stringify({ error: "API key missing" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { recommendation } = await req.json();
    if (!recommendation || typeof recommendation !== "string") {
      return new Response(JSON.stringify({ error: "recommendation requise" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const prompt = `Développe cette recommandation nutritionnelle pour une femme ménopausée:
"${recommendation}"

Génère une fiche détaillée avec:
1. Top 5 aliments sources avec teneurs exactes
2. Quantité quotidienne recommandée précise
3. Meilleur moment de consommation
4. Astuce pour maximiser l'absorption
5. Alternative si aliment difficile à trouver
6. Ce qu'il faut éviter qui bloque l'absorption

Réponds UNIQUEMENT en JSON valide avec ce format exact:
{
  "top_foods": [{"name": "string", "amount": "string (teneur ex: 87mg/100g)", "quantity": "string (portion ex: 200g)"}],
  "daily_dose": "string",
  "best_timing": "string",
  "absorption_tip": "string",
  "alternative": "string",
  "avoid": "string"
}`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${OPENAI_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "Tu es une nutritionniste experte spécialisée en ménopause. Tu réponds toujours en JSON valide, en français." },
          { role: "user", content: prompt },
        ],
        temperature: 0.5,
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      const txt = await response.text();
      console.error("OpenAI error:", response.status, txt);
      return new Response(JSON.stringify({ error: `OpenAI ${response.status}` }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const result = await response.json();
    const content = result.choices?.[0]?.message?.content?.trim();
    const parsed = JSON.parse(content);

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("expand-recommendation error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erreur" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
