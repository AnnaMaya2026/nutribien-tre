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

    // Accept either a data URL (data:image/...;base64,...) or raw base64
    const dataUrl = image.startsWith("data:") ? image : `data:image/jpeg;base64,${image}`;

    const systemPrompt = `Tu es un assistant qui analyse des photos de frigo, placard ou garde-manger pour identifier les aliments et ingrédients visibles.

RÈGLES:
- Liste UNIQUEMENT les aliments/ingrédients réellement visibles (pas d'invention).
- Regroupe intelligemment (ex: "yaourts nature", "tomates cerises", "pain complet").
- Nom en français, singulier ou pluriel selon la quantité visible.
- Si l'image est floue, sombre, ou ne montre pas d'aliments: renvoie une liste vide et remplis "issue".
- N'inclus PAS les contenants (bouteilles vides, bocaux vides), ustensiles, marques commerciales seules.

Réponds STRICTEMENT en JSON valide avec ce format:
{
  "foods": ["aliment 1", "aliment 2", ...],
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
              { type: "text", text: "Identifie tous les aliments et ingrédients visibles sur cette photo." },
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
          .filter((f): f is string => typeof f === "string")
          .map((f) => f.trim())
          .filter((f) => f.length > 0 && f.length < 80)
          .slice(0, 40)
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
    console.error("analyze-fridge-photo error:", e);
    return new Response(
      JSON.stringify({ error: "server_error", message: "Erreur serveur." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
