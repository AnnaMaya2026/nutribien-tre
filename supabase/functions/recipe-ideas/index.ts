// Edge function: generate 3 recipe ideas for a specific ingredient via OpenAI
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

    const systemPrompt = `Tu es une nutritionniste française spécialisée en ménopause.
Génère 3 idées de recettes simples et appétissantes utilisant "${ingredient}" comme ingrédient principal.${nutrient ? ` Cet aliment est riche en ${nutrient}, particulièrement utile pendant la ménopause.` : ""}
Contraintes:
- Ingrédients accessibles en supermarché français
- Temps de préparation max 30 minutes
- Recettes variées (pas 3 fois la même base)
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
    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch {
      parsed = { recipes: [] };
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
