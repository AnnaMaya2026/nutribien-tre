import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) throw new Error("OPENAI_API_KEY not configured");
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return new Response(JSON.stringify({ error: "Non autorisé" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const { data: { user } } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    if (!user) return new Response(JSON.stringify({ error: "Non autorisé" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    const todayDefault = new Date().toISOString().split("T")[0];
    const targetDate = typeof body?.target_date === "string" ? body.target_date : todayDefault;

    // Reference day used for symptom/food context = day BEFORE the targeted day.
    const refDate = new Date(targetDate + "T00:00:00");
    refDate.setDate(refDate.getDate() - 1);
    const yKey = refDate.toISOString().split("T")[0];

    const { data: existing } = await supabase
      .from("daily_challenges")
      .select("*")
      .eq("user_id", user.id)
      .eq("challenge_date", targetDate)
      .maybeSingle();
    if (existing) {
      return new Response(JSON.stringify({ challenge: existing, cached: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Last 7 challenges to avoid repetition
    const { data: recent } = await supabase
      .from("daily_challenges")
      .select("challenge_text")
      .eq("user_id", user.id)
      .order("challenge_date", { ascending: false })
      .limit(7);
    const recentTexts = (recent || []).map((r: any) => r.challenge_text).filter(Boolean);

    const [foodRes, symptomRes] = await Promise.all([
      supabase.from("food_logs").select("*").eq("user_id", user.id).eq("logged_at", yKey),
      supabase.from("symptom_logs").select("*").eq("user_id", user.id).eq("logged_at", yKey).maybeSingle(),
    ]);
    const foodLogs = foodRes.data || [];

    const totals = foodLogs.reduce((acc: any, l: any) => ({
      calcium: acc.calcium + (l.calcium || 0),
      vitamin_d: acc.vitamin_d + (l.vitamin_d || 0),
      magnesium: acc.magnesium + (l.magnesium || 0),
      iron: acc.iron + (l.iron || 0),
      omega3: acc.omega3 + (l.omega3 || 0),
      fibres: acc.fibres + (l.fibres || 0),
    }), { calcium: 0, vitamin_d: 0, magnesium: 0, iron: 0, omega3: 0, fibres: 0 });

    const goals: Record<string, { goal: number; label: string }> = {
      calcium: { goal: 1200, label: "Calcium" },
      vitamin_d: { goal: 20, label: "Vitamine D" },
      magnesium: { goal: 320, label: "Magnésium" },
      iron: { goal: 18, label: "Fer" },
      omega3: { goal: 2.5, label: "Oméga-3" },
      fibres: { goal: 25, label: "Fibres" },
    };
    let weakest = "calcium";
    let weakestRatio = 1;
    for (const [key, g] of Object.entries(goals)) {
      const ratio = (totals as any)[key] / g.goal;
      if (ratio < weakestRatio) { weakestRatio = ratio; weakest = key; }
    }

    const symptomLog = symptomRes.data;
    const scores = (symptomLog?.symptom_scores && typeof symptomLog.symptom_scores === "object")
      ? symptomLog.symptom_scores as Record<string, number> : {};
    const activeSymptoms = Object.entries(scores).filter(([, v]) => (v as number) >= 5).map(([k]) => k);

    const days = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];
    const month = new Date().getMonth();
    const season = month <= 1 || month === 11 ? "hiver" : month <= 4 ? "printemps" : month <= 7 ? "été" : "automne";

    const userPrompt = `Hier le nutriment le plus déficitaire était : ${goals[weakest].label} (${Math.round(weakestRatio * 100)}% de l'objectif atteint).
Symptômes actuels : ${activeSymptoms.length ? activeSymptoms.join(", ") : "aucun particulier"}
Jour: ${days[new Date().getDay()]}, saison: ${season}.

Génère UN défi nutritionnel pour aujourd'hui, concret, simple, en 1-2 phrases courtes, motivant.
Exemple de ton: "Aujourd'hui: ajoute 30g de graines de lin à ton yaourt — tu couvriras 50% de tes oméga-3 !"
Réponds UNIQUEMENT en JSON: { "challenge": "..." }`;

    const aiResp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${OPENAI_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "Tu es Sophie, nutritionniste spécialisée en ménopause. Tu réponds uniquement en JSON valide, en français." },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.85,
        max_tokens: 200,
        response_format: { type: "json_object" },
      }),
    });

    if (!aiResp.ok) {
      const errText = await aiResp.text();
      console.error("OpenAI error:", aiResp.status, errText);
      return new Response(JSON.stringify({ error: `OpenAI ${aiResp.status}` }), { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const result = await aiResp.json();
    const content = result.choices?.[0]?.message?.content?.trim();
    let parsed: { challenge: string };
    try { parsed = JSON.parse(content); } catch {
      return new Response(JSON.stringify({ error: "Réponse IA invalide" }), { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: inserted } = await supabase.from("daily_challenges").insert({
      user_id: user.id,
      challenge_date: today,
      challenge_text: parsed.challenge,
      nutrient_key: weakest,
    }).select().single();

    return new Response(JSON.stringify({ challenge: inserted, cached: false }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("daily-challenge error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erreur" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
