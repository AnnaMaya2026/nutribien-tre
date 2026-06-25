import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SYMPTOM_LABELS: Record<string, string> = {
  fatigue: "Fatigue",
  bouffees_chaleur: "Bouffées de chaleur",
  insomnie: "Insomnie",
  sautes_humeur: "Sautes d'humeur",
  prise_de_poids: "Prise de poids",
  secheresse_cutanee: "Sécheresse cutanée",
  douleurs_articulaires: "Douleurs articulaires",
  brain_fog: "Troubles de la mémoire",
  anxiete: "Anxiété",
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

    const today = new Date().toISOString().split("T")[0];

    const { data: existing } = await supabase
      .from("sophie_evening_messages")
      .select("*")
      .eq("user_id", user.id)
      .eq("message_date", today)
      .maybeSingle();
    if (existing) {
      return new Response(JSON.stringify({ message: existing, cached: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const [profileRes, foodRes, symptomRes, routineDefRes, routineLogsRes] = await Promise.all([
      supabase.from("profiles").select("*").eq("user_id", user.id).maybeSingle(),
      supabase.from("food_logs").select("*").eq("user_id", user.id).eq("logged_at", today),
      supabase.from("symptom_logs").select("*").eq("user_id", user.id).eq("logged_at", today).maybeSingle(),
      supabase.from("routines").select("*").eq("user_id", user.id).eq("active", true),
      supabase.from("routine_logs").select("*").eq("user_id", user.id).eq("logged_at", today),
    ]);

    const profile = profileRes.data;
    const foodLogs = foodRes.data || [];
    const symptomLog = symptomRes.data;
    const routines = routineDefRes.data || [];
    const routineLogs = routineLogsRes.data || [];

    const calorieGoal = profile?.daily_calorie_goal || 1800;
    const totals = foodLogs.reduce((acc: any, l: any) => ({
      calories: acc.calories + (l.calories || 0),
      calcium: acc.calcium + (l.calcium || 0),
      vitamin_d: acc.vitamin_d + (l.vitamin_d || 0),
      magnesium: acc.magnesium + (l.magnesium || 0),
      iron: acc.iron + (l.iron || 0),
      omega3: acc.omega3 + (l.omega3 || 0),
      fibres: acc.fibres + (l.fibres || 0),
      proteins: acc.proteins + (l.proteins || 0),
    }), { calories: 0, calcium: 0, vitamin_d: 0, magnesium: 0, iron: 0, omega3: 0, fibres: 0, proteins: 0 });

    const targets: Record<string, { val: number; goal: number; label: string }> = {
      calcium: { val: totals.calcium, goal: 1200, label: "Calcium" },
      vitamin_d: { val: totals.vitamin_d, goal: 20, label: "Vitamine D" },
      magnesium: { val: totals.magnesium, goal: 320, label: "Magnésium" },
      iron: { val: totals.iron, goal: 18, label: "Fer" },
      omega3: { val: totals.omega3, goal: 2.5, label: "Oméga-3" },
      fibres: { val: totals.fibres, goal: 25, label: "Fibres" },
    };
    const missing = Object.values(targets).filter((t) => t.val < t.goal * 0.6).map((t) => t.label);

    const scores = (symptomLog?.symptom_scores && typeof symptomLog.symptom_scores === "object")
      ? symptomLog.symptom_scores as Record<string, number> : {};
    const selectedSymptoms: string[] = Array.isArray(symptomLog?.selected_symptoms)
      ? symptomLog.selected_symptoms as string[] : [];
    const scored = Object.entries(scores).filter(([, v]) => (v as number) > 0);
    let symptomSummary: string[] = scored.map(([k, v]) => `${SYMPTOM_LABELS[k] || k}: ${v}/10`);
    // Fallback: user picked symptoms in the chips tab but didn't rate them.
    if (symptomSummary.length === 0 && selectedSymptoms.length > 0) {
      symptomSummary = selectedSymptoms.map((k) => SYMPTOM_LABELS[k] || k);
    }

    const routinesDone = routineLogs.length;
    const routinesTotal = routines.length;

    const userPrompt = `Données d'aujourd'hui :
- Calories: ${Math.round(totals.calories)}/${calorieGoal}
- Nutriments manquants: ${missing.length ? missing.join(", ") : "aucun"}
- Symptômes: ${symptomSummary.length ? symptomSummary.join(", ") : "aucun symptôme déclaré"}
- Routines complétées: ${routinesDone}/${routinesTotal}
- Aliments enregistrés: ${foodLogs.length}`;

    const systemPrompt = `Tu es Sophie, nutritionniste spécialisée en ménopause. Analyse les données du jour et génère un message du soir bienveillant pour motiver à revenir demain.

Tu DOIS répondre UNIQUEMENT en JSON valide (sans markdown ni backticks) avec ce format exact :
{
  "summary": "1 phrase qui résume la journée avec bienveillance",
  "insight": "Une observation surprenante ou intéressante sur ses données",
  "challenge": "Un défi nutritionnel concret et motivant pour demain"
}

Ton : chaleureux, encourageant, jamais culpabilisant. Phrases courtes.`;

    const aiResp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${OPENAI_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt }],
        temperature: 0.8,
        max_tokens: 400,
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
    let parsed: { summary: string; insight: string; challenge: string };
    try { parsed = JSON.parse(content); } catch {
      return new Response(JSON.stringify({ error: "Réponse IA invalide" }), { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: inserted } = await supabase.from("sophie_evening_messages").insert({
      user_id: user.id,
      message_date: today,
      summary: parsed.summary,
      insight: parsed.insight,
      challenge: parsed.challenge,
    }).select().single();

    return new Response(JSON.stringify({ message: inserted, cached: false }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("sophie-evening-message error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erreur" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
