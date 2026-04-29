import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export interface Routine {
  id: string;
  user_id: string;
  name: string;
  category: string;
  frequency: string;
  active: boolean;
  sort_order: number;
  created_at: string;
  reminder_enabled?: boolean;
  reminder_time?: string | null;
}

export interface RoutineLog {
  id: string;
  user_id: string;
  routine_id: string;
  logged_at: string;
  completed: boolean;
}

export const ROUTINE_CATEGORIES = [
  { value: "complement", label: "💊 Complément" },
  { value: "sport", label: "🏃 Sport" },
  { value: "alimentation", label: "🥗 Alimentation" },
  { value: "bien-etre", label: "💆 Bien-être" },
  { value: "autre", label: "📝 Autre" },
];

export const ROUTINE_CATEGORY_COLORS: Record<string, string> = {
  complement: "#a78bfa",
  sport: "#fb923c",
  alimentation: "#34d399",
  "bien-etre": "#22d3ee",
  autre: "#94a3b8",
};

export const ROUTINE_FREQUENCIES = [
  { value: "quotidien", label: "Quotidien" },
  { value: "hebdomadaire", label: "Hebdomadaire" },
];

const todayStr = () => new Date().toISOString().split("T")[0];

export function useRoutines() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const userId = user?.id;

  const routinesQuery = useQuery({
    queryKey: ["routines", userId],
    enabled: !!userId,
    queryFn: async (): Promise<Routine[]> => {
      const { data, error } = await (supabase as any)
        .from("routines")
        .select("*")
        .eq("user_id", userId)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data || []) as Routine[];
    },
  });

  // Last 60 days of logs (enough for streaks + chart markers)
  const logsQuery = useQuery({
    queryKey: ["routine_logs", userId],
    enabled: !!userId,
    queryFn: async (): Promise<RoutineLog[]> => {
      const since = new Date();
      since.setDate(since.getDate() - 90);
      const { data, error } = await (supabase as any)
        .from("routine_logs")
        .select("*")
        .eq("user_id", userId)
        .gte("logged_at", since.toISOString().split("T")[0])
        .order("logged_at", { ascending: false });
      if (error) throw error;
      return (data || []) as RoutineLog[];
    },
  });

  const addRoutine = useMutation({
    mutationFn: async (input: {
      name: string;
      category: string;
      frequency: string;
      reminder_enabled?: boolean;
      reminder_time?: string | null;
    }) => {
      if (!userId) throw new Error("not authenticated");
      const { error } = await (supabase as any).from("routines").insert({
        user_id: userId,
        name: input.name,
        category: input.category,
        frequency: input.frequency,
        reminder_enabled: input.reminder_enabled ?? false,
        reminder_time: input.reminder_enabled ? input.reminder_time ?? "08:00" : null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["routines", userId] });
      toast.success("Routine ajoutée");
    },
    onError: (e: any) => toast.error(e.message || "Erreur"),
  });

  const deleteRoutine = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("routines").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["routines", userId] });
      qc.invalidateQueries({ queryKey: ["routine_logs", userId] });
    },
  });

  const toggleToday = useMutation({
    mutationFn: async ({ routineId, completed }: { routineId: string; completed: boolean }) => {
      if (!userId) throw new Error("not authenticated");
      const date = todayStr();
      if (completed) {
        const { error } = await (supabase as any)
          .from("routine_logs")
          .upsert(
            { user_id: userId, routine_id: routineId, logged_at: date, completed: true },
            { onConflict: "routine_id,logged_at" }
          );
        if (error) throw error;
      } else {
        const { error } = await (supabase as any)
          .from("routine_logs")
          .delete()
          .eq("routine_id", routineId)
          .eq("logged_at", date);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["routine_logs", userId] });
    },
    onError: (e: any) => toast.error(e.message || "Erreur"),
  });

  return {
    routines: (routinesQuery.data || []).filter((r) => r.active),
    allRoutines: routinesQuery.data || [],
    logs: logsQuery.data || [],
    isLoading: routinesQuery.isLoading || logsQuery.isLoading,
    addRoutine,
    deleteRoutine,
    toggleToday,
  };
}

export function calculateStreak(logs: RoutineLog[], routineId: string): number {
  const dates = new Set(
    logs.filter((l) => l.routine_id === routineId && l.completed).map((l) => l.logged_at)
  );
  let streak = 0;
  const cur = new Date();
  // If today not done, check from yesterday
  if (!dates.has(cur.toISOString().split("T")[0])) {
    cur.setDate(cur.getDate() - 1);
  }
  while (dates.has(cur.toISOString().split("T")[0])) {
    streak++;
    cur.setDate(cur.getDate() - 1);
  }
  return streak;
}

export function weekCompletionCount(logs: RoutineLog[], routineId: string): number {
  const today = new Date();
  const start = new Date(today);
  start.setDate(today.getDate() - 6);
  const startStr = start.toISOString().split("T")[0];
  const todayStrV = today.toISOString().split("T")[0];
  return logs.filter(
    (l) =>
      l.routine_id === routineId &&
      l.completed &&
      l.logged_at >= startStr &&
      l.logged_at <= todayStrV
  ).length;
}
