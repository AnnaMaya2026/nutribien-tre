import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { DEFAULT_HABITS } from "@/lib/defaultHabits";

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
};

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
      return (data || []) as UserHabit[];
    },
    enabled: !!user,
  });

  // 2. Seed defaults on first use
  useEffect(() => {
    if (!user || loadingHabits) return;
    if (habits.length > 0) return;
    (async () => {
      const rows = DEFAULT_HABITS.map((h, i) => ({
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
  }, [user, habits.length, loadingHabits, qc]);

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
        active: true,
        sort_order: habits.length,
      });
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
