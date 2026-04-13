import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) throw new Error("OPENAI_API_KEY not configured");

    const authHeader = req.headers.get("Authorization");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user from JWT
    let userId: string | null = null;
    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { data: { user } } = await supabase.auth.getUser(token);
      userId = user?.id ?? null;
    }

    const { messages } = await req.json();
    if (!messages || !Array.isArray(messages)) {
      return new Response(JSON.stringify({ error: "Messages requis" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch user context
    let profileContext = "";
    let nutritionContext = "";
    const today = new Date().toISOString().split("T")[0];

    if (userId) {
      const [profileRes, logsRes] = await Promise.all([
        supabase.from("profiles").select("*").eq("user_id", userId).single(),
        supabase.from("food_logs").select("*").eq("user_id", userId).eq("logged_at", today),
      ]);

      if (profileRes.data) {
        const p = profileRes.data;
        profileContext = `
Profil utilisatrice:
- Stade: ${p.menopause_stage || "Non renseigné"}
- Symptômes principaux: ${(p.symptoms || []).join(", ") || "Aucun renseigné"}
- Objectif calorique: ${p.daily_calorie_goal || 1800} kcal`;
      }

      if (logsRes.data && logsRes.data.length > 0) {
        const totals = logsRes.data.reduce((acc: any, log: any) => ({
          calories: acc.calories + (log.calories || 0),
          proteins: acc.proteins + (log.proteins || 0),
          calcium: acc.calcium + (log.calcium || 0),
          vitamin_d: acc.vitamin_d + (log.vitamin_d || 0),
          magnesium: acc.magnesium + (log.magnesium || 0),
          iron: acc.iron + (log.iron || 0),
          fibres: acc.fibres + (log.fibres || 0),
        }), { calories: 0, proteins: 0, calcium: 0, vitamin_d: 0, magnesium: 0, iron: 0, fibres: 0 });

        const calorieGoal = profileRes.data?.daily_calorie_goal || 1800;
        nutritionContext = `
Données nutritionnelles du jour:
- Calories consommées: ${Math.round(totals.calories)} kcal / ${calorieGoal} kcal
- Protéines: ${Math.round(totals.proteins)}g / 60g
- Calcium: ${Math.round(totals.calcium)}mg / 1200mg
- Vitamine D: ${totals.vitamin_d.toFixed(1)}µg / 20µg
- Magnésium: ${Math.round(totals.magnesium)}mg / 320mg
- Fer: ${Math.round(totals.iron)}mg / 18mg
- Fibres: ${Math.round(totals.fibres)}g / 25g`;
      } else {
        nutritionContext = "\nAucun aliment enregistré aujourd'hui.";
      }
    }

    const systemPrompt = `Tu es Sophie, une nutritionniste spécialisée dans la nutrition pour la ménopause. Tu as accès au profil de l'utilisatrice et à ses données nutritionnelles du jour.
${profileContext}
${nutritionContext}

Règles:
- Réponds toujours en français
- Sois chaleureuse, encourageante et bienveillante
- Donne des conseils pratiques et accessibles
- Base tes conseils sur les données nutritionnelles du jour de l'utilisatrice
- Ne remplace pas un médecin, rappelle-le si besoin
- Réponds en maximum 3-4 phrases courtes`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        temperature: 0.7,
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      const t = await response.text();
      console.error("OpenAI error:", response.status, t);
      return new Response(JSON.stringify({ error: "Erreur IA" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const result = await response.json();
    const content = result.choices?.[0]?.message?.content?.trim();

    return new Response(JSON.stringify({ reply: content || "Je n'ai pas pu formuler de réponse." }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("chat-nutritionist error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Erreur inconnue" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
