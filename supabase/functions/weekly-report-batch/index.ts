// Batch worker: generates weekly reports for all active users.
// Triggered every Sunday at 20:00 (Europe/Paris) via pg_cron.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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

function getMondayOf(d: Date): Date {
  const date = new Date(d);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  date.setHours(0, 0, 0, 0);
  return date;
}
const toKey = (d: Date) => d.toISOString().split("T")[0];

async function generateForUser(
  supabase: any,
  OPENAI_API_KEY: string,
  userId: string,
  weekStart: string,
  weekEnd: string,
  lastMonday: Date,
): Promise<{ ok: boolean; reason?: string }> {
  const { data: existing } = await supabase
    .from("weekly_reports")
    .select("id")
    .eq("user_id", userId)
    .eq("week_start", weekStart)
    .maybeSingle();
  if (existing) return { ok: false, reason: "already_exists" };

  const [profileRes, foodRes, symptomRes, routineDefRes, routineLogsRes, habitDefRes, habitLogsRes] =
    await Promise.all([
      supabase.from("profiles").select("*").eq("user_id", userId).maybeSingle(),
      supabase.from("food_logs").select("*").eq("user_id", userId).gte("logged_at", weekStart).lte("logged_at", weekEnd),
      supabase.from("symptom_logs").select("*").eq("user_id", userId).gte("logged_at", weekStart).lte("logged_at", weekEnd),
      supabase.from("routines").select("*").eq("user_id", userId).eq("active", true),
      supabase.from("routine_logs").select("*").eq("user_id", userId).gte("logged_at", weekStart).lte("logged_at", weekEnd),
      supabase.from("user_habits").select("*").eq("user_id", userId).eq("active", true),
      supabase.from("habit_logs").select("*").eq("user_id", userId).gte("logged_at", weekStart).lte("logged_at", weekEnd),
    ]);

  const foodLogs = foodRes.data || [];
  if (foodLogs.length === 0) return { ok: false, reason: "no_activity" };

  const profile = profileRes.data;
  const symptomLogs = symptomRes.data || [];
  const routines = routineDefRes.data || [];
  const routineLogs = routineLogsRes.data || [];
  const habits = habitDefRes.data || [];
  const habitLogs = habitLogsRes.data || [];
  const calorieGoal = profile?.daily_calorie_goal || 1800;

  const byDay: Record<string, number> = {};
  for (const f of foodLogs) byDay[f.logged_at] = (byDay[f.logged_at] || 0) + (f.calories || 0);
  const dayKeys: string[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(lastMonday);
    d.setDate(d.getDate() + i);
    dayKeys.push(toKey(d));
  }
  const dailyCal = dayKeys.map((k) => byDay[k] || 0);
  const avgCal = Math.round(dailyCal.reduce((a, b) => a + b, 0) / 7);
  const bestDay = dayKeys[dailyCal.indexOf(Math.max(...dailyCal))];
  const worstDay = dayKeys[dailyCal.indexOf(Math.min(...dailyCal.map((c) => (c || Infinity))))];

  const nutrientGoals: Record<string, { goal: number; label: string; unit: string }> = {
    calcium: { goal: 1200, label: "Calcium", unit: "mg" },
    vitamin_d: { goal: 20, label: "Vitamine D", unit: "µg" },
    magnesium: { goal: 320, label: "Magnésium", unit: "mg" },
    iron: { goal: 18, label: "Fer", unit: "mg" },
    omega3: { goal: 2.5, label: "Oméga-3", unit: "g" },
    fibres: { goal: 25, label: "Fibres", unit: "g" },
  };
  const totals: Record<string, number> = {};
  for (const f of foodLogs)
    for (const k of Object.keys(nutrientGoals))
      totals[k] = (totals[k] || 0) + (Number((f as any)[k]) || 0);
  const gaps = Object.entries(nutrientGoals)
    .map(([k, m]) => ({ label: m.label, avg: (totals[k] || 0) / 7, goal: m.goal, unit: m.unit }))
    .filter((n) => n.avg < n.goal * 0.5)
    .map((n) => `${n.label} (${n.avg.toFixed(1)}/${n.goal}${n.unit} en moyenne)`);

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
  const firstAvg = sumScores(symptomLogs.filter((l: any) => dayKeys.slice(0, 3).includes(l.logged_at)));
  const lastAvg = sumScores(symptomLogs.filter((l: any) => dayKeys.slice(4).includes(l.logged_at)));
  const symptomEvo = Object.keys({ ...firstAvg, ...lastAvg }).map((k) => {
    const a = firstAvg[k] ?? 0;
    const b = lastAvg[k] ?? 0;
    const delta = b - a;
    const trend = Math.abs(delta) < 0.5 ? "stable" : delta < 0 ? "amélioration" : "aggravation";
    return `${SYMPTOM_LABELS[k] || k}: ${a.toFixed(1)} → ${b.toFixed(1)} (${trend})`;
  });

  const routineCompliance = routines.map((r: any) => {
    const completed = routineLogs.filter((l: any) => l.routine_id === r.id && l.completed).length;
    return `${r.name}: ${completed}/7 jours (${Math.round((completed / 7) * 100)}%)`;
  });
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

Réponds UNIQUEMENT par un objet JSON valide (sans markdown) avec EXACTEMENT ces champs :
{
  "positive_point": string,
  "to_improve": string,
  "weekly_tip": string (surprenant et non-évident, spécifique ménopause),
  "symptom_trend": "amélioration" | "stable" | "dégradation",
  "symptom_comment": string,
  "score_this_week": number (1-10),
  "score_last_week": number (1-10)
}

Ton chaleureux, jamais culpabilisant.`;

  const aiResp = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${OPENAI_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: 600,
    }),
  });
  if (!aiResp.ok) return { ok: false, reason: `openai_${aiResp.status}` };
  const result = await aiResp.json();
  const raw = result.choices?.[0]?.message?.content?.trim();
  if (!raw) return { ok: false, reason: "empty_report" };
  let reportData: any;
  try { reportData = JSON.parse(raw); } catch { return { ok: false, reason: "invalid_json" }; }

  await supabase.from("weekly_reports").upsert({
    user_id: userId,
    week_start: weekStart,
    week_end: weekEnd,
    report_data: reportData,
    report_text: null,
  }, { onConflict: "user_id,week_start" });
  return { ok: true };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) throw new Error("OPENAI_API_KEY not configured");
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const now = new Date();
    const thisMonday = getMondayOf(now);
    const lastMonday = new Date(thisMonday);
    lastMonday.setDate(thisMonday.getDate() - 7);
    const lastSunday = new Date(thisMonday);
    lastSunday.setDate(thisMonday.getDate() - 1);
    const weekStart = toKey(lastMonday);
    const weekEnd = toKey(lastSunday);

    // Active users = anyone with food_logs in the target week
    const { data: activeRows, error: activeErr } = await supabase
      .from("food_logs")
      .select("user_id")
      .gte("logged_at", weekStart)
      .lte("logged_at", weekEnd);
    if (activeErr) throw activeErr;
    const userIds = Array.from(new Set((activeRows || []).map((r: any) => r.user_id)));

    let generated = 0;
    let skipped = 0;
    let errors = 0;
    for (const uid of userIds) {
      try {
        const r = await generateForUser(supabase, OPENAI_API_KEY, uid, weekStart, weekEnd, lastMonday);
        if (r.ok) generated++;
        else skipped++;
      } catch (e) {
        console.error("user error", uid, e);
        errors++;
      }
    }

    return new Response(
      JSON.stringify({ week_start: weekStart, total: userIds.length, generated, skipped, errors }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("weekly-report-batch error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
