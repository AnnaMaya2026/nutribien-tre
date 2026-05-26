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

// Returns Monday (start) of the ISO week containing `d`
function getMondayOf(d: Date): Date {
  const date = new Date(d);
  const day = date.getDay(); // 0=Sun..6=Sat
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

const toKey = (d: Date) => d.toISOString().split("T")[0];

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
      return new Response(JSON.stringify({ error: "Non autorisé" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const token = authHeader.replace("Bearer ", "");
    const { data: { user } } = await supabase.auth.getUser(token);
    if (!user) {
      return new Response(JSON.stringify({ error: "Non autorisé" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Target week = previous completed week (Mon..Sun)
    const now = new Date();
    const thisMonday = getMondayOf(now);
    const lastMonday = new Date(thisMonday);
    lastMonday.setDate(thisMonday.getDate() - 7);
    const lastSunday = new Date(thisMonday);
    lastSunday.setDate(thisMonday.getDate() - 1);
    const weekStart = toKey(lastMonday);
    const weekEnd = toKey(lastSunday);

    const { data: existing } = await supabase
      .from("weekly_reports")
      .select("report_text, week_start, created_at")
      .eq("user_id", user.id)
      .eq("week_start", weekStart)
      .maybeSingle();

    if (existing?.report_text) {
      return new Response(JSON.stringify({ report: existing.report_text, week_start: weekStart, week_end: weekEnd, cached: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const [profileRes, foodRes, symptomRes, routineDefRes, routineLogsRes, habitDefRes, habitLogsRes] = await Promise.all([
      supabase.from("profiles").select("*").eq("user_id", user.id).single(),
      supabase.from("food_logs").select("*").eq("user_id", user.id).gte("logged_at", weekStart).lte("logged_at", weekEnd),
      supabase.from("symptom_logs").select("*").eq("user_id", user.id).gte("logged_at", weekStart).lte("logged_at", weekEnd),
      supabase.from("routines").select("*").eq("user_id", user.id).eq("active", true),
      supabase.from("routine_logs").select("*").eq("user_id", user.id).gte("logged_at", weekStart).lte("logged_at", weekEnd),
      supabase.from("user_habits").select("*").eq("user_id", user.id).eq("active", true),
      supabase.from("habit_logs").select("*").eq("user_id", user.id).gte("logged_at", weekStart).lte("logged_at", weekEnd),
    ]);

    const profile = profileRes.data;
    const foodLogs = foodRes.data || [];
    const symptomLogs = symptomRes.data || [];
    const routines = routineDefRes.data || [];
    const routineLogs = routineLogsRes.data || [];
    const habits = habitDefRes.data || [];
    const habitLogs = habitLogsRes.data || [];

    const calorieGoal = profile?.daily_calorie_goal || 1800;

    // Per-day calories
    const byDay: Record<string, number> = {};
    for (const f of foodLogs) {
      byDay[f.logged_at] = (byDay[f.logged_at] || 0) + (f.calories || 0);
    }
    const dayKeys: string[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(lastMonday);
      d.setDate(d.getDate() + i);
      dayKeys.push(toKey(d));
    }
    const dailyCal = dayKeys.map((k) => byDay[k] || 0);
    const avgCal = Math.round(dailyCal.reduce((a, b) => a + b, 0) / 7);
    const bestDay = dayKeys[dailyCal.indexOf(Math.max(...dailyCal))];
    const worstDay = dayKeys[dailyCal.indexOf(Math.min(...dailyCal.filter((c) => c > 0).length ? dailyCal.map((c) => c || Infinity) : dailyCal))];

    // Recurring nutrient gaps (avg below 50% goal across days with data)
    const nutrientGoals: Record<string, { goal: number; label: string; unit: string }> = {
      calcium: { goal: 1200, label: "Calcium", unit: "mg" },
      vitamin_d: { goal: 20, label: "Vitamine D", unit: "µg" },
      magnesium: { goal: 320, label: "Magnésium", unit: "mg" },
      iron: { goal: 18, label: "Fer", unit: "mg" },
      omega3: { goal: 2.5, label: "Oméga-3", unit: "g" },
      fibres: { goal: 25, label: "Fibres", unit: "g" },
    };
    const nutrientTotals: Record<string, number> = {};
    for (const f of foodLogs) {
      for (const k of Object.keys(nutrientGoals)) {
        nutrientTotals[k] = (nutrientTotals[k] || 0) + (Number((f as any)[k]) || 0);
      }
    }
    const gaps = Object.entries(nutrientGoals)
      .map(([k, m]) => ({ k, label: m.label, avg: (nutrientTotals[k] || 0) / 7, goal: m.goal, unit: m.unit }))
      .filter((n) => n.avg < n.goal * 0.5)
      .map((n) => `${n.label} (${n.avg.toFixed(1)}/${n.goal}${n.unit} en moyenne)`);

    // Symptom evolution: first 3 vs last 3 days
    const sumScores = (logs: any[]) => {
      const acc: Record<string, { total: number; count: number }> = {};
      for (const l of logs) {
        const scores = (l.symptom_scores && typeof l.symptom_scores === "object") ? l.symptom_scores : {};
        for (const [k, v] of Object.entries(scores)) {
          const n = Number(v);
          if (!isFinite(n)) continue;
          if (!acc[k]) acc[k] = { total: 0, count: 0 };
          acc[k].total += n;
          acc[k].count += 1;
        }
      }
      const out: Record<string, number> = {};
      for (const [k, v] of Object.entries(acc)) out[k] = v.total / v.count;
      return out;
    };
    const firstHalf = symptomLogs.filter((l) => dayKeys.slice(0, 3).includes(l.logged_at));
    const lastHalf = symptomLogs.filter((l) => dayKeys.slice(4).includes(l.logged_at));
    const firstAvg = sumScores(firstHalf);
    const lastAvg = sumScores(lastHalf);
    const symptomEvo = Object.keys({ ...firstAvg, ...lastAvg }).map((k) => {
      const a = firstAvg[k] ?? 0;
      const b = lastAvg[k] ?? 0;
      const delta = b - a;
      const trend = Math.abs(delta) < 0.5 ? "stable" : delta < 0 ? "amélioration" : "aggravation";
      return `${SYMPTOM_LABELS[k] || k}: ${a.toFixed(1)} → ${b.toFixed(1)} (${trend})`;
    });

    // Routines compliance
    const routineCompliance = routines.map((r: any) => {
      const completed = routineLogs.filter((l: any) => l.routine_id === r.id && l.completed).length;
      const pct = Math.round((completed / 7) * 100);
      return `${r.name}: ${completed}/7 jours (${pct}%)`;
    });

    // Habits
    const habitSummary = habits.map((h: any) => {
      const logs = habitLogs.filter((l: any) => l.habit_key === h.habit_key);
      const total = logs.reduce((a: number, l: any) => a + Number(l.count || 0), 0);
      const expected = Number(h.goal || 0) * 7;
      const pct = expected > 0 ? Math.round((total / expected) * 100) : 0;
      return `${h.habit_name}: ${total}/${expected} ${h.unit} (${pct}%)`;
    });

    const userPrompt = `Données de la semaine du ${weekStart} au ${weekEnd} :
- Calories moyennes: ${avgCal}/${calorieGoal} kcal
- Meilleur jour calorique: ${bestDay} (${Math.round(byDay[bestDay] || 0)} kcal)
- Pire jour calorique: ${worstDay} (${Math.round(byDay[worstDay] || 0)} kcal)
- Carences récurrentes: ${gaps.length ? gaps.join(", ") : "aucune carence majeure"}
- Évolution symptômes: ${symptomEvo.length ? symptomEvo.join(", ") : "pas de données"}
- Routines: ${routineCompliance.length ? routineCompliance.join(", ") : "aucune routine"}
- Habitudes: ${habitSummary.length ? habitSummary.join(", ") : "aucune habitude"}`;

    const systemPrompt = `Tu es Sophie, nutritionniste spécialisée en ménopause. Génère un bilan hebdomadaire bienveillant et motivant.

Format OBLIGATOIRE (exactement ces 4 lignes, avec ces emojis) :
🌟 Point positif: [un vrai point positif observé]
⚠️ À améliorer: [une seule chose à travailler]
💡 Conseil de la semaine: [un conseil personnalisé concret]
📈 Tendance symptômes: [synthèse de l'évolution]

Ton chaleureux, jamais culpabilisant. Une à deux phrases par ligne maximum.`;

    const aiResp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${OPENAI_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.7,
        max_tokens: 500,
      }),
    });

    if (!aiResp.ok) {
      const errText = await aiResp.text();
      console.error("OpenAI error:", aiResp.status, errText);
      return new Response(JSON.stringify({ error: `OpenAI ${aiResp.status}` }), { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const result = await aiResp.json();
    const report = result.choices?.[0]?.message?.content?.trim();
    if (!report) {
      return new Response(JSON.stringify({ error: "Réponse IA vide" }), { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    await supabase.from("weekly_reports").insert({
      user_id: user.id,
      week_start: weekStart,
      report_text: report,
    });

    return new Response(JSON.stringify({ report, week_start: weekStart, week_end: weekEnd, cached: false }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("weekly-report error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erreur inconnue" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
