import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `Tu es un assistant nutritionnel expert français.

Analyse la phrase de l'utilisatrice et identifie TOUS les aliments mentionnés
avec leurs quantités. Retourne TOUJOURS le poids en grammes (g) pour les solides
et en millilitres (ml) pour les liquides — dans les deux cas, place la valeur
numérique dans la clé "grams" du JSON.

RÈGLES IMPORTANTES :

1. PAS DE QUANTITÉ → utilise les portions standard :
   • 1 œuf = 55g
   • 1 tranche de pain = 30g
   • 1 bol = 300g (solide) / 300ml (liquide)
   • 1 verre = 200ml
   • 1 tasse de café/thé = 150ml
   • 1 yaourt = 125g
   • 1 portion fromage = 30g
   • 1 portion viande/poisson = 150g
   • 1 cuillère à soupe = 15ml
   • 1 cuillère à café = 5ml
   • 1 poignée = 30g

2. DESCRIPTIONS VAGUES → interprète intelligemment :
   • "un peu de beurre" → beurre 10g
   • "une grosse salade" → salade 200g
   • "quelques noix" → noix 30g
   • "un petit yaourt" → yaourt 100g
   • "un grand verre" → 300ml
   • "une grosse portion" → +50% de la portion standard
   • "une petite portion" → -50% de la portion standard

3. PLATS COMPOSÉS → décompose en ingrédients :
   • "sandwich jambon fromage" → pain 60g + jambon 45g + fromage 30g + beurre 5g
   • "salade niçoise" → salade verte 100g + thon 80g + œuf 55g + tomate 100g + olives 20g + haricots verts 50g
   • "pâtes bolognaise" → pâtes 200g + sauce tomate 100g + viande hachée 80g
   • "croque-monsieur" → pain 60g + jambon 45g + fromage 40g
   • "salade césar" → salade 100g + poulet 80g + parmesan 20g + croûtons 20g

4. BOISSONS → toujours en ml, place dans "grams".

5. NIVEAU DE CONFIANCE — pour CHAQUE aliment, ajoute un champ "confidence" :
   • "high"   → quantité claire OU portion standard évidente OU plat composé bien connu
   • "medium" → quantité estimée à partir d'une description vague ("un peu", "quelques")
   • "low"    → aliment ambigu, plat inconnu, ou quantité totalement inférée

6. NOM → retourne UNIQUEMENT le mot-clé principal de chaque aliment,
   sans adjectif ni mode de cuisson :
   ✅ "poulet"   ❌ "poulet rôti"
   ✅ "œuf"      ❌ "œuf dur"
   ✅ "pomme"    ❌ "pomme verte"

Réponds UNIQUEMENT en JSON valide, sans markdown ni backticks :
{
  "foods": [
    { "name": "nom court", "grams": <number>, "confidence": "high"|"medium"|"low" }
  ]
}

EXEMPLES :
- "j'ai mangé un sandwich jambon fromage"
  → {"foods":[
       {"name":"pain","grams":60,"confidence":"high"},
       {"name":"jambon","grams":45,"confidence":"high"},
       {"name":"fromage","grams":30,"confidence":"high"}
     ]}
- "un peu de beurre sur du pain"
  → {"foods":[
       {"name":"beurre","grams":10,"confidence":"medium"},
       {"name":"pain","grams":30,"confidence":"high"}
     ]}
- "deux cuillères à soupe d'huile d'olive"
  → {"foods":[{"name":"huile olive","grams":30,"confidence":"high"}]}
- "un grand verre de jus d'orange"
  → {"foods":[{"name":"jus orange","grams":300,"confidence":"medium"}]}
- "quelques noix"
  → {"foods":[{"name":"noix","grams":30,"confidence":"medium"}]}`;

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
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: transcript },
        ],
        temperature: 0.2,
        max_tokens: 700,
        response_format: { type: "json_object" },
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

    // Normalize confidence values
    parsed.foods = parsed.foods.map((f: any) => ({
      name: String(f.name || "").trim(),
      grams: Number(f.grams) || 100,
      confidence: ["high", "medium", "low"].includes(f.confidence) ? f.confidence : "medium",
    })).filter((f: any) => f.name.length > 0);

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
