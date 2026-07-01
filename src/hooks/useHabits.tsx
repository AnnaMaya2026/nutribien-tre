import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { DEFAULT_HABITS, getDefaultHabits } from "@/lib/defaultHabits";
import { calculateHydration } from "@/lib/habitsCalculator";
import { useSelectedDate } from "./useSelectedDate";

export type HabitType = "limiter" | "atteindre";

export type UserHabit = {
  id: string;
  habit_key: string;
  habit_name: string;
  habit_emoji: string;
  goal: number;
  unit: string;
  symptom_warning: string | null;
  active: boolean;
  sort_order: number;
  habit_type: HabitType;
};

// Auto-detect type from name/key when DB row is missing the column or
// when a legacy default of "limiter" doesn't fit the habit.
export function detectHabitType(
  key: string,
  name: string,
  fallback: HabitType = "limiter"
): HabitType {
  const text = `${key} ${name}`.toLowerCase();
  if (/(eau|hydrat|activit|sport|l[ée]gume|fruit|marche|step)/.test(text)) {
    return "atteindre";
  }
  if (/(caf[ée]|alcool|[ée]cran|[ée]pic|sucre|soda|bi[èe]re|vin)/.test(text)) {
    return "limiter";
  }
  return fallback;
}

export type HabitLog = {
  id: string;
  habit_key: string;
  habit_name: string;
  habit_emoji: string;
  goal: number;
  unit: string;
  count: number;
  logged_at: string;
};

export function useHabits() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const today = new Date().toISOString().split("T")[0];
  const [weightKg, setWeightKg] = useState<number | undefined>(undefined);
  const [weightLoaded, setWeightLoaded] = useState(false);

  // Fetch user's weight once so hydration can be tailored to body weight.
  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("weight")
      .eq("user_id", user.id)
      .single()
      .then(({ data, error }) => {
        setWeightLoaded(true);
        if (error) return;
        const w = data?.weight ? Number(data.weight) : undefined;
        setWeightKg(w && w > 0 ? w : undefined);
      });
  }, [user]);

  // 1. Fetch user habit definitions
  const { data: habits = [], isLoading: loadingHabits } = useQuery({
    queryKey: ["user_habits", user?.id],
    queryFn: async () => {
      if (!user) return [] as UserHabit[];
      const { data, error } = await supabase
        .from("user_habits")
        .select("*")
        .eq("user_id", user.id)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return (data || []).map((row: any) => ({
        ...row,
        habit_type:
          (row.habit_type as HabitType) ||
          detectHabitType(row.habit_key, row.habit_name),
      })) as UserHabit[];
    },
    enabled: !!user,
  });

  // 2. Seed defaults on first use (hydration is tailored to current weight)
  useEffect(() => {
    if (!user || loadingHabits || !weightLoaded) return;
    if (habits.length > 0) return;
    (async () => {
      const defaults = getDefaultHabits(weightKg);
      const rows = defaults.map((h, i) => ({
        user_id: user.id,
        habit_key: h.habit_key,
        habit_name: h.habit_name,
        habit_emoji: h.habit_emoji,
        goal: h.goal,
        unit: h.unit,
        symptom_warning: h.symptom_warning ?? null,
        active: true,
        sort_order: i,
      }));
      await supabase.from("user_habits").insert(rows);
      qc.invalidateQueries({ queryKey: ["user_habits", user.id] });
    })();
  }, [user, habits.length, loadingHabits, qc, weightKg, weightLoaded]);

  // 2b. Keep existing hydration goal in sync with profile weight changes
  useEffect(() => {
    if (!user || loadingHabits || !weightLoaded || weightKg === undefined) return;
    const hydrationHabit = habits.find((h) => h.habit_key === "hydratation");
    if (!hydrationHabit) return;
    const { target } = calculateHydration(weightKg);
    if (hydrationHabit.goal === target) return;
    (async () => {
      const waterLiters = Number((weightKg * 0.035).toFixed(1));
      await supabase
        .from("user_habits")
        .update({
          goal: target,
          unit: `${target} verres/jour (${waterLiters}L)`,
        })
        .eq("id", hydrationHabit.id);
      qc.invalidateQueries({ queryKey: ["user_habits", user.id] });
    })();
  }, [user, habits, loadingHabits, qc, weightKg, weightLoaded]);

  // 3. Fetch last 7 days of habit logs
  const sevenDaysAgo = (() => {
    const d = new Date();
    d.setDate(d.getDate() - 6);
    return d.toISOString().split("T")[0];
  })();

  const { data: logs = [] } = useQuery({
    queryKey: ["habit_logs", user?.id, sevenDaysAgo],
    queryFn: async () => {
      if (!user) return [] as HabitLog[];
      const { data, error } = await supabase
        .from("habit_logs")
        .select("*")
        .eq("user_id", user.id)
        .gte("logged_at", sevenDaysAgo)
        .order("logged_at", { ascending: true });
      if (error) throw error;
      return (data || []) as HabitLog[];
    },
    enabled: !!user,
  });

  // 4. Increment / decrement today's count
  const setCount = useMutation({
    mutationFn: async ({
      habit,
      count,
    }: {
      habit: UserHabit;
      count: number;
    }) => {
      if (!user) throw new Error("Not authenticated");
      const safeCount = Math.max(0, count);
      const existing = logs.find(
        (l) => l.habit_key === habit.habit_key && l.logged_at === today
      );
      if (existing) {
        const { error } = await supabase
          .from("habit_logs")
          .update({ count: safeCount, goal: habit.goal })
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("habit_logs").insert({
          user_id: user.id,
          habit_key: habit.habit_key,
          habit_name: habit.habit_name,
          habit_emoji: habit.habit_emoji,
          goal: habit.goal,
          unit: habit.unit,
          count: safeCount,
          logged_at: today,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["habit_logs", user?.id] });
    },
  });

  const addHabit = useMutation({
    mutationFn: async (h: {
      habit_name: string;
      habit_emoji: string;
      goal: number;
      unit: string;
      habit_type: HabitType;
    }) => {
      if (!user) throw new Error("Not authenticated");
      const habit_key = `custom_${Date.now()}`;
      const { error } = await supabase.from("user_habits").insert({
        user_id: user.id,
        habit_key,
        habit_name: h.habit_name,
        habit_emoji: h.habit_emoji || "•",
        goal: h.goal,
        unit: h.unit || "fois",
        habit_type: h.habit_type,
        active: true,
        sort_order: habits.length,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["user_habits", user?.id] }),
  });

  const deleteHabit = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("user_habits").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["user_habits", user?.id] }),
  });

  return {
    habits: habits.filter((h) => h.active),
    logs,
    today,
    setCount,
    addHabit,
    deleteHabit,
    isLoading: loadingHabits,
  };
}
