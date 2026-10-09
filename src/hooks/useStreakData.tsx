import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useEffect, useMemo } from "react";

export type DayStatus = "full" | "partial" | "empty";

export interface DayCell {
  date: string; // YYYY-MM-DD
  label: string; // short weekday letter
  status: DayStatus;
}

/** Date YYYY-MM-DD à Paris, décalée de `offsetDays` jours depuis `from`. */
export function parisKey(offsetDays = 0, from: Date = new Date()): string {
  const d = new Date(from.getTime() + offsetDays * 86400_000);
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris" }).format(d);
}

/** Recule une date YYYY-MM-DD de n jours (calendrier, sans fuseau). */
export function shiftKey(key: string, days: number): string {
  const d = new Date(`${key}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Série de jours « complets » consécutifs, sans limite. Part d'aujourd'hui, ou d'hier si aujourd'hui n'est pas complet. */
export function computeStreak(fullDays: Set<string>, today: string): number {
  let cursor = fullDays.has(today) ? today : shiftKey(today, -1);
  let n = 0;
  while (fullDays.has(cursor)) {
    n++;
    cursor = shiftKey(cursor, -1);
  }
  return n;
}

const CHUNK_DAYS = 90;

async function fetchDays(table: "food_logs" | "symptom_logs", userId: string, from: string, to: string) {
  const days = new Set<string>();
  const page = 1000;
  for (let offset = 0; ; offset += page) {
    const { data, error } = await supabase
      .from(table)
      .select("logged_at")
      .eq("user_id", userId)
      .gte("logged_at", from)
      .lte("logged_at", to)
      .order("logged_at", { ascending: false })
      .range(offset, offset + page - 1);
    if (error) throw error;
    (data || []).forEach((r: any) => days.add(r.logged_at));
    if (!data || data.length < page) break;
  }
  return days;
}

export function useStreakData() {
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["streak_data", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const today = parisKey(0);
      const full = new Set<string>();
      const dayMap: Record<string, DayStatus> = {};

      // Charge par tranches de 90 jours tant que la série atteint le début de la tranche.
      let to = today;
      while (true) {
        const from = shiftKey(to, -(CHUNK_DAYS - 1));
        const [foodDays, sympDays] = await Promise.all([
          fetchDays("food_logs", user.id, from, to),
          fetchDays("symptom_logs", user.id, from, to),
        ]);
        for (let k = to; k >= from; k = shiftKey(k, -1)) {
          const f = foodDays.has(k);
          const s = sympDays.has(k);
          dayMap[k] = f && s ? "full" : f || s ? "partial" : "empty";
          if (f && s) full.add(k);
        }
        const streakSoFar = computeStreak(full, today);
        const streakStart = shiftKey(full.has(today) ? today : shiftKey(today, -1), -streakSoFar);
        // La série s'arrête dans la tranche chargée : terminé.
        if (streakStart >= from || foodDays.size === 0) break;
        to = shiftKey(from, -1);
      }

      const currentStreak = computeStreak(full, today);

      const { data: profile } = await supabase
        .from("profiles")
        .select("current_streak, best_streak, last_streak_date")
        .eq("user_id", user.id)
        .maybeSingle();
      const p = profile as any;
      const storedBest = p?.best_streak ?? 0;
      const bestStreak = Math.max(storedBest, currentStreak);

      // Calendrier des 7 derniers jours (Paris)
      const labels = ["D", "L", "M", "M", "J", "V", "S"];
      const week: DayCell[] = [];
      for (let i = 6; i >= 0; i--) {
        const k = shiftKey(today, -i);
        week.push({ date: k, label: labels[new Date(`${k}T12:00:00Z`).getUTCDay()], status: dayMap[k] || "empty" });
      }

      return {
        currentStreak,
        bestStreak,
        today,
        stored: { current: p?.current_streak ?? null, best: storedBest, date: p?.last_streak_date ?? null },
        week,
        todayStatus: dayMap[today],
      };
    },
    enabled: !!user,
    staleTime: 60_000,
  });

  // Écrit la série du jour en base à chaque calcul (si elle a changé).
  useEffect(() => {
    if (!user || !data) return;
    const s = data.stored;
    if (s.current === data.currentStreak && s.best === data.bestStreak && s.date === data.today) return;
    supabase
      .from("profiles")
      .update({
        current_streak: data.currentStreak,
        best_streak: data.bestStreak,
        last_streak_date: data.today,
      } as any)
      .eq("user_id", user.id)
      .then(() => {});
  }, [user, data]);

  return useMemo(() => ({ ...data, isLoading }), [data, isLoading]);
}
