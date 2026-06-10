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

function toKey(d: Date) {
  return d.toISOString().split("T")[0];
}

export function useStreakData() {
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["streak_data", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const start = new Date();
      start.setDate(start.getDate() - 29); // 30-day window
      const startKey = toKey(start);

      const [foodRes, sympRes, profileRes] = await Promise.all([
        supabase.from("food_logs").select("logged_at").eq("user_id", user.id).gte("logged_at", startKey),
        supabase.from("symptom_logs").select("logged_at").eq("user_id", user.id).gte("logged_at", startKey),
        supabase.from("profiles").select("current_streak, best_streak, last_streak_date").eq("user_id", user.id).maybeSingle(),
      ]);

      const foodDays = new Set((foodRes.data || []).map((r: any) => r.logged_at));
      const sympDays = new Set((sympRes.data || []).map((r: any) => r.logged_at));

      // Build last 30 day map
      const dayMap: Record<string, DayStatus> = {};
      for (let i = 29; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const k = toKey(d);
        const f = foodDays.has(k);
        const s = sympDays.has(k);
        dayMap[k] = f && s ? "full" : f || s ? "partial" : "empty";
      }

      // Compute current streak: consecutive "full" days ending today (or yesterday if today not full yet)
      const today = toKey(new Date());
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yKey = toKey(yesterday);

      let currentStreak = 0;
      let cursor = new Date();
      // Allow today not yet full; start streak from yesterday if today is empty
      if (dayMap[today] !== "full") cursor = yesterday;
      while (true) {
        const k = toKey(cursor);
        if (dayMap[k] === "full") {
          currentStreak += 1;
          cursor.setDate(cursor.getDate() - 1);
        } else break;
        if (currentStreak >= 30) break;
      }
      // If today is full, prepend it (already counted in loop if it's full)
      // The loop above also counts today if full.
      if (dayMap[today] !== "full" && currentStreak > 0) {
        // streak ended yesterday, not broken
      }

      const profile = profileRes.data as any;
      const storedBest = profile?.best_streak ?? 0;
      const bestStreak = Math.max(storedBest, currentStreak);

      // 7-day calendar (last 7 days)
      const labels = ["D", "L", "M", "M", "J", "V", "S"];
      const week: DayCell[] = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const k = toKey(d);
        week.push({ date: k, label: labels[d.getDay()], status: dayMap[k] || "empty" });
      }

      return { currentStreak, bestStreak, storedBest, week, todayStatus: dayMap[today] };
    },
    enabled: !!user,
    staleTime: 60_000,
  });

  // Sync current/best streak back to profile if changed
  useEffect(() => {
    if (!user || !data) return;
    const needsUpdate = data.bestStreak > (data.storedBest || 0);
    if (needsUpdate) {
      supabase
        .from("profiles")
        .update({
          current_streak: data.currentStreak,
          best_streak: data.bestStreak,
          last_streak_date: new Date().toISOString().split("T")[0],
        } as any)
        .eq("user_id", user.id)
        .then(() => {});
    }
  }, [user, data]);

  return useMemo(() => ({ ...data, isLoading }), [data, isLoading]);
}
