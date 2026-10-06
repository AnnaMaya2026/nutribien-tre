import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { buildProfileRestrictionsContext } from "../_shared/profileRestrictions.ts";
import { buildSymptomContext, parisDate, SYMPTOM_RULE } from "../_shared/symptomContext.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) throw new Error("OPENAI_API_KEY not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Non autorisé" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const token = authHeader.replace("Bearer ", "");
    const { data: { user } } = await supabase.auth.getUser(token);
    if (!user) {
      return new Response(JSON.stringify({ error: "Non autorisé" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const today = parisDate(0);
    const body = await req.json().catch(() => ({}));
    const dash = body?.dashboard;
    if (!dash || !Array.isArray(dash.nutrients) || typeof dash.calories !== "number" || typeof dash.calorieGoal !== "number") {
      return new Response(JSON.stringify({ error: "Données du tableau de bord manquantes" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Return cached recap if it already exists for today
    const { data: existing } = await supabase
      .from("daily_recaps")
      .select("recap_text, created_at")
      .eq("user_id", user.id)
      .eq("recap_date", today)
      .maybeSingle();

    if (existing?.recap_text) {
      return new Response(
        JSON.stringify({ recap: existing.recap_text, cached: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const [profileRes, habitDefRes, habitLogsRes] = await Promise.all([
      supabase.from("profiles").select("*").eq("user_id", user.id).single(),
      supabase.from("user_habits").select("*").eq("user_id", user.id).eq("active", true),
      supabase.from("habit_logs").select("*").eq("user_id", user.id).eq("logged_at", today),
    ]);
    const profile = profileRes.data;
    const habitDefs = habitDefRes.data || [];
    const habitLogs = habitLogsRes.data || [];

    // Totaux = EXACTEMENT ceux du tableau de bord (alimentation + compléments + plats estimés).
    const fmtN = (n: any) => `${n.label} ${String(n.value).replace(".", ",")}/${String(n.goal).replace(".", ",")} ${n.unit}`;
    const below = dash.nutrients.filter((n: any) => !n.reached);
    const reached = dash.nutrients.filter((n: any) => n.reached);

    const symptomCtx = await buildSymptomContext(supabase, user.id);

    const habitSummary = habitDefs.map((h: any) => {
      const log = habitLogs.find((l: any) => l.habit_key === h.habit_key);
      const c = log?.count ?? 0;
      if (h.habit_key === "ecrans_lit" || h.goal === 0) {
        return `${h.habit_name}: ${c === 1 ? "respecté" : c === 2 ? "non respecté" : "non renseigné"}`;
      }
      return `${h.habit_name}: ${c}/${h.goal} ${h.unit ?? ""}`.trim();
    });

    const userPrompt = `Données du jour (identiques à l'écran de l'utilisatrice) :
- Calories : ${dash.calories} kcal sur ${dash.calorieGoal} kcal d'objectif
- Nutriments SOUS l'objectif : ${below.length ? below.map(fmtN).join(", ") : "AUCUN — tous les objectifs sont atteints"}
- Nutriments atteints : ${reached.length ? reached.map(fmtN).join(", ") : "aucun"}
${symptomCtx.text}
- Habitudes : ${habitSummary.length ? habitSummary.join(", ") : "aucune habitude suivie"}
- Aliments enregistrés : ${dash.foodCount} entrée(s)`;

    const restrictionsCtx = buildProfileRestrictionsContext(profile);

    const systemPrompt = `Tu es Sophie, nutritionniste spécialisée en ménopause. Génère un bilan quotidien factuel et bienveillant basé UNIQUEMENT sur les données fournies.

${restrictionsCtx.promptBlock}

RÈGLES ABSOLUES :
- Calories : donne seulement le fait, sous la forme « X kcal sur Y kcal d'objectif ». N'encourage JAMAIS à manger plus ni moins, et ne félicite JAMAIS pour un nombre de calories.
- Ne recommande un nutriment (ou des aliments riches en ce nutriment) QUE s'il figure dans « Nutriments SOUS l'objectif ». Ne parle jamais d'un nutriment atteint comme d'un manque. Si aucun n'est sous l'objectif, dis simplement que tous les objectifs nutritionnels sont atteints.
- Aucun conseil général sans donnée précise (pas de « hydrate-toi », « dors bien »…). Ne relie un conseil à un symptôme que s'il figure dans les symptômes saisis aujourd'hui.
- N'invente aucune donnée absente.
${SYMPTOM_RULE}

Format : 1. un fait positif réel ; 2. un point à améliorer demain seulement s'il existe un nutriment sous l'objectif ; 3. un conseil concret lié à ce nutriment. Max 4-5 phrases courtes. Ne termine JAMAIS par une formule de politesse.`;

    const aiResp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.4,
        max_tokens: 350,
      }),
    });

    if (!aiResp.ok) {
      const errText = await aiResp.text();
      console.error("OpenAI error:", aiResp.status, errText);
      return new Response(JSON.stringify({ error: `OpenAI ${aiResp.status}` }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const result = await aiResp.json();
    const recap = result.choices?.[0]?.message?.content?.trim();
    if (!recap) {
      return new Response(JSON.stringify({ error: "Réponse IA vide" }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Save to DB
    await supabase.from("daily_recaps").insert({
      user_id: user.id,
      recap_date: today,
      recap_text: recap,
    });

    return new Response(
      JSON.stringify({ recap, cached: false }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("daily-recap error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Erreur inconnue" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
