import { useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { FULL_SYMPTOMS_LIST } from "@/lib/symptoms";

const SYMPTOM_LABEL: Record<string, string> = Object.fromEntries(
  FULL_SYMPTOMS_LIST.map((s) => [s.value, s.label])
);

const toKey = (d: Date) => d.toISOString().split("T")[0];

// Keywords to detect foods/habits worth correlating
const FOOD_KEYWORDS = [
  { key: "saumon", label: "saumon", emoji: "🐟" },
  { key: "café", label: "café", emoji: "☕", threshold: 3 },
  { key: "cafe", label: "café", emoji: "☕", threshold: 3 },
  { key: "vin", label: "vin", emoji: "🍷" },
  { key: "alcool", label: "alcool", emoji: "🍷" },
  { key: "sucre", label: "sucre", emoji: "🍬" },
  { key: "chocolat", label: "chocolat", emoji: "🍫" },
  { key: "fromage", label: "fromage", emoji: "🧀" },
  { key: "lait", label: "lait", emoji: "🥛" },
  { key: "épinard", label: "épinards", emoji: "🥬" },
  { key: "epinard", label: "épinards", emoji: "🥬" },
  { key: "tofu", label: "tofu", emoji: "🌱" },
  { key: "soja", label: "soja", emoji: "🌱" },
  { key: "noix", label: "noix", emoji: "🌰" },
  { key: "amande", label: "amandes", emoji: "🌰" },
];

type Correlation = {
  id: string;
  text: string;
  delta: number;
};

export default function CorrelationsSection() {
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["correlations", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const since = new Date();
      since.setDate(since.getDate() - 30);
      const sinceKey = toKey(since);

      const [foods, symptoms, routines, routineLogs, habits, habitLogs] = await Promise.all([
        supabase.from("food_logs").select("food_name, logged_at").eq("user_id", user.id).gte("logged_at", sinceKey),
        supabase.from("symptom_logs").select("logged_at, symptom_scores").eq("user_id", user.id).gte("logged_at", sinceKey),
        supabase.from("routines").select("id, name").eq("user_id", user.id).eq("active", true),
        supabase.from("routine_logs").select("routine_id, logged_at, completed").eq("user_id", user.id).gte("logged_at", sinceKey),
        supabase.from("user_habits").select("habit_key, habit_name").eq("user_id", user.id).eq("active", true),
        supabase.from("habit_logs").select("habit_key, logged_at, count").eq("user_id", user.id).gte("logged_at", sinceKey),
      ]);

      const foodDates = new Set((foods.data || []).map((f) => f.logged_at));
      const symptomDates = new Set((symptoms.data || []).map((s) => s.logged_at));
      const overlapCount = Array.from(foodDates).filter((d) => symptomDates.has(d)).length;

      return {
        foods: foods.data || [],
        symptoms: symptoms.data || [],
        routines: routines.data || [],
        routineLogs: routineLogs.data || [],
        habits: habits.data || [],
        habitLogs: habitLogs.data || [],
        overlapCount,
      };
    },
    enabled: !!user,
  });

  const correlations = useMemo<Correlation[]>(() => {
    if (!data) return [];
    const { foods, symptoms, routines, routineLogs, habits, habitLogs } = data;

    // Map date -> per-symptom score
    const scoresByDate: Record<string, Record<string, number>> = {};
    for (const s of symptoms) {
      const map = (s.symptom_scores && typeof s.symptom_scores === "object") ? s.symptom_scores as Record<string, number> : {};
      scoresByDate[s.logged_at] = map;
    }
    const allDates = Object.keys(scoresByDate);
    if (allDates.length < 7) return [];

    const symptomKeys = Array.from(new Set(allDates.flatMap((d) => Object.keys(scoresByDate[d] || {}))));

    // For each "event" (boolean per day), compute avg symptom on days WITH vs WITHOUT
    const evaluate = (eventDates: Set<string>, label: string, emoji: string, id: string): Correlation[] => {
      const out: Correlation[] = [];
      const datesWith = allDates.filter((d) => eventDates.has(d));
      const datesWithout = allDates.filter((d) => !eventDates.has(d));
      if (datesWith.length < 3 || datesWithout.length < 3) return out;

      for (const sym of symptomKeys) {
        const withScores = datesWith.map((d) => scoresByDate[d]?.[sym]).filter((v): v is number => typeof v === "number" && v > 0);
        const withoutScores = datesWithout.map((d) => scoresByDate[d]?.[sym]).filter((v): v is number => typeof v === "number" && v > 0);
        if (withScores.length < 3 || withoutScores.length < 3) continue;
        const avgWith = withScores.reduce((a, b) => a + b, 0) / withScores.length;
        const avgWithout = withoutScores.reduce((a, b) => a + b, 0) / withoutScores.length;
        const delta = avgWith - avgWithout;
        if (Math.abs(delta) < 1.0) continue;
        const symLabel = SYMPTOM_LABEL[sym] || sym;
        if (delta < 0) {
          out.push({
            id: `${id}-${sym}`,
            delta,
            text: `${emoji} Les jours où tu consommes du ${label}, ton score de "${symLabel}" est en moyenne ${Math.abs(delta).toFixed(1)} point${Math.abs(delta) > 1 ? "s" : ""} plus bas.`,
          });
        } else {
          out.push({
            id: `${id}-${sym}`,
            delta,
            text: `${emoji} Les jours avec ${label}, ton score de "${symLabel}" est en moyenne ${delta.toFixed(1)} point${delta > 1 ? "s" : ""} plus élevé.`,
          });
        }
      }
      return out;
    };

    const results: Correlation[] = [];

    // Food keywords
    for (const kw of FOOD_KEYWORDS) {
      const datesByCount: Record<string, number> = {};
      for (const f of foods) {
        if (f.food_name?.toLowerCase().includes(kw.key)) {
          datesByCount[f.logged_at] = (datesByCount[f.logged_at] || 0) + 1;
        }
      }
      const threshold = (kw as any).threshold ?? 1;
      const dates = new Set(Object.entries(datesByCount).filter(([, c]) => c >= threshold).map(([d]) => d));
      if (dates.size < 3) continue;
      const label = threshold > 1 ? `${threshold}+ ${kw.label}` : kw.label;
      results.push(...evaluate(dates, label, kw.emoji, `food-${kw.key}-${threshold}`));
    }

    // Routines
    for (const r of routines) {
      const dates = new Set(routineLogs.filter((l) => l.routine_id === r.id && l.completed).map((l) => l.logged_at));
      if (dates.size < 3) continue;
      results.push(...evaluate(dates, r.name, "✅", `routine-${r.id}`));
    }

    // Habits (days where count > 0)
    for (const h of habits) {
      const dates = new Set(habitLogs.filter((l) => l.habit_key === h.habit_key && Number(l.count) > 0).map((l) => l.logged_at));
      if (dates.size < 3) continue;
      results.push(...evaluate(dates, h.habit_name, "📌", `habit-${h.habit_key}`));
    }

    // Sort by absolute delta, keep top 5
    return results.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta)).slice(0, 5);
  }, [data]);

  if (isLoading) return null;
  if ((data?.overlapCount ?? 0) < 7) return null;

  return (
    <section className="bg-card rounded-2xl p-5 card-soft mb-4 animate-fade-in">
      <h3 className="text-base font-semibold text-foreground mb-3">🔗 Corrélations détectées</h3>
      {correlations.length === 0 ? (
        <p className="text-sm text-muted-foreground">Aucune corrélation marquante détectée sur les 30 derniers jours.</p>
      ) : (
        <ul className="space-y-2">
          {correlations.map((c) => (
            <li key={c.id} className={`text-sm rounded-xl px-3 py-2 ${c.delta < 0 ? "bg-green-50 text-green-900" : "bg-orange-50 text-orange-900"}`}>
              {c.text}
            </li>
          ))}
        </ul>
      )}
      <p className="mt-3 text-[11px] text-muted-foreground italic">
        ⚠️ Corrélations indicatives — pas un avis médical.
      </p>
    </section>
  );
}
