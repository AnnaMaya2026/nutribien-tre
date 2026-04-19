import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
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

    const today = new Date().toISOString().split("T")[0];

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

    // Aggregate today's data
    const [profileRes, foodRes, symptomRes, habitDefRes, habitLogsRes] = await Promise.all([
      supabase.from("profiles").select("*").eq("user_id", user.id).single(),
      supabase.from("food_logs").select("*").eq("user_id", user.id).eq("logged_at", today),
      supabase.from("symptom_logs").select("*").eq("user_id", user.id).eq("logged_at", today).maybeSingle(),
      supabase.from("user_habits").select("*").eq("user_id", user.id).eq("active", true),
      supabase.from("habit_logs").select("*").eq("user_id", user.id).eq("logged_at", today),
    ]);

    const profile = profileRes.data;
    const foodLogs = foodRes.data || [];
    const symptomLog = symptomRes.data;
    const habitDefs = habitDefRes.data || [];
    const habitLogs = habitLogsRes.data || [];

    const calorieGoal = profile?.daily_calorie_goal || 1800;
    const totals = foodLogs.reduce((acc: any, l: any) => ({
      calories: acc.calories + (l.calories || 0),
      proteins: acc.proteins + (l.proteins || 0),
      calcium: acc.calcium + (l.calcium || 0),
      vitamin_d: acc.vitamin_d + (l.vitamin_d || 0),
      magnesium: acc.magnesium + (l.magnesium || 0),
      iron: acc.iron + (l.iron || 0),
      omega3: acc.omega3 + (l.omega3 || 0),
      fibres: acc.fibres + (l.fibres || 0),
    }), { calories: 0, proteins: 0, calcium: 0, vitamin_d: 0, magnesium: 0, iron: 0, omega3: 0, fibres: 0 });

    // Missing nutrients (< 50% goal)
    const targets: Record<string, { val: number; goal: number; unit: string; label: string }> = {
      calcium: { val: totals.calcium, goal: 1200, unit: "mg", label: "Calcium" },
      vitamin_d: { val: totals.vitamin_d, goal: 20, unit: "µg", label: "Vitamine D" },
      magnesium: { val: totals.magnesium, goal: 320, unit: "mg", label: "Magnésium" },
      iron: { val: totals.iron, goal: 18, unit: "mg", label: "Fer" },
      omega3: { val: totals.omega3, goal: 2.5, unit: "g", label: "Oméga-3" },
      fibres: { val: totals.fibres, goal: 25, unit: "g", label: "Fibres" },
    };
    const missing = Object.values(targets)
      .filter((t) => t.val < t.goal * 0.5)
      .map((t) => `${t.label} (${t.val.toFixed(1)}/${t.goal}${t.unit})`);

    // Symptom summary
    const scores = (symptomLog?.symptom_scores && typeof symptomLog.symptom_scores === "object")
      ? symptomLog.symptom_scores as Record<string, number>
      : {};
    const symptomSummary = Object.entries(scores)
      .filter(([, v]) => (v as number) > 0)
      .map(([k, v]) => `${SYMPTOM_LABELS[k] || k}: ${v}/10`);

    // Habits summary
    const habitSummary = habitDefs.map((h: any) => {
      const log = habitLogs.find((l: any) => l.habit_key === h.habit_key);
      const c = log?.count ?? 0;
      if (h.habit_key === "ecrans_lit" || h.goal === 0) {
        return `${h.habit_name}: ${c === 1 ? "respecté ✓" : c === 2 ? "non respecté ✗" : "non renseigné"}`;
      }
      const status = c === 0 ? "non utilisé" : c <= h.goal ? `${c}/${h.goal} ${h.unit} ✓` : `${c}/${h.goal} ${h.unit} dépassé ✗`;
      return `${h.habit_name}: ${status}`;
    });

    const userPrompt = `Données du jour :
- Calories: ${Math.round(totals.calories)}/${calorieGoal} kcal
- Nutriments manquants: ${missing.length ? missing.join(", ") : "aucun déficit majeur"}
- Symptômes du jour: ${symptomSummary.length ? symptomSummary.join(", ") : "aucun symptôme déclaré"}
- Habitudes: ${habitSummary.length ? habitSummary.join(", ") : "aucune habitude suivie"}
- Aliments enregistrés: ${foodLogs.length} entrée(s)`;

    const systemPrompt = `Tu es Sophie, nutritionniste spécialisée en ménopause. Génère un bilan quotidien bienveillant et motivant basé sur les données fournies.

Format obligatoire :
1. Un point positif (toujours commencer par ça)
2. Un point à améliorer demain
3. Un conseil personnalisé pour demain

Ton : chaleureux, encourageant, jamais culpabilisant.
Max 4-5 phrases courtes.
IMPORTANT : Ne termine JAMAIS par des formules de politesse type "Prends soin de toi", "À demain", "Bon courage" etc.`;

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
        temperature: 0.7,
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
