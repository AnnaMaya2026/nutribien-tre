import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) {
      return new Response(
        JSON.stringify({ error: "missing_api_key", message: "Clé API OpenAI manquante." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { image } = await req.json();
    if (!image || typeof image !== "string") {
      return new Response(
        JSON.stringify({ error: "invalid_input", message: "Image manquante ou invalide." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const dataUrl = image.startsWith("data:") ? image : `data:image/jpeg;base64,${image}`;

    const systemPrompt = `Tu es un nutritionniste qui analyse une photo d'assiette pour identifier chaque aliment visible et estimer sa quantité en grammes.

RÈGLES:
- Liste UNIQUEMENT les aliments réellement visibles sur l'assiette (pas d'invention).
- Pour chaque aliment, estime la portion en grammes en te basant sur la taille visible.
- Nom en français, simple (ex: "poulet grillé", "riz basmati", "haricots verts").
- Regroupe intelligemment (ex: une salade composée → liste les ingrédients principaux).
- N'inclus PAS l'assiette, les couverts, les verres.
- Si l'image est floue, sombre, ou ne montre pas de repas: renvoie foods=[] et remplis "issue".

Réponds STRICTEMENT en JSON valide:
{
  "foods": [{ "name": "nom", "grams": number }, ...],
  "issue": null | "blurry" | "no_food" | "too_dark"
}`;

    const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: [
              { type: "text", text: "Identifie chaque aliment de l'assiette et estime sa quantité en grammes." },
              { type: "image_url", image_url: { url: dataUrl, detail: "high" } },
            ],
          },
        ],
        response_format: { type: "json_object" },
        max_tokens: 800,
      }),
    });

    if (!openaiRes.ok) {
      const errText = await openaiRes.text();
      console.error("OpenAI vision error:", openaiRes.status, errText);
      return new Response(
        JSON.stringify({ error: "openai_error", message: "Analyse impossible pour le moment. Réessayez." }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const json = await openaiRes.json();
    const content: string = json?.choices?.[0]?.message?.content || "{}";
    let parsed: { foods?: unknown; issue?: unknown } = {};
    try {
      parsed = JSON.parse(content);
    } catch {
      parsed = {};
    }

    const foods = Array.isArray(parsed.foods)
      ? parsed.foods
          .map((f: any) => ({
            name: typeof f?.name === "string" ? f.name.trim() : "",
            grams: Math.max(1, Math.round(Number(f?.grams) || 0)),
          }))
          .filter((f) => f.name.length > 0 && f.name.length < 80 && f.grams > 0)
          .slice(0, 20)
      : [];
    const issue =
      parsed.issue === "blurry" || parsed.issue === "no_food" || parsed.issue === "too_dark"
        ? parsed.issue
        : null;

    return new Response(
      JSON.stringify({ foods, issue: foods.length === 0 ? (issue || "no_food") : null }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("analyze-meal-photo error:", e);
    return new Response(
      JSON.stringify({ error: "server_error", message: "Erreur serveur." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
