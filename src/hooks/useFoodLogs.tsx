import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export function useFoodLogs(date?: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const today = date || new Date().toISOString().split("T")[0];

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ["food_logs", user?.id, today],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("food_logs")
        .select("*")
        .eq("user_id", user.id)
        .eq("logged_at", today)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const weekLogs = useQuery({
    queryKey: ["food_logs_week", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 6);
      const { data, error } = await supabase
        .from("food_logs")
        .select("*")
        .eq("user_id", user.id)
        .gte("logged_at", weekAgo.toISOString().split("T")[0])
        .order("logged_at", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const addLog = useMutation({
    mutationFn: async (log: {
      food_name: string;
      portion_size: number;
      calories: number;
      proteins: number;
      carbs: number;
      fats: number;
      fibres: number;
      calcium: number;
      vitamin_d: number;
      magnesium: number;
      iron: number;
      omega3: number;
      phytoestrogens: number;
      vitamin_b12: number;
      meal_type: string;
    }) => {
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase.from("food_logs").insert({
        ...log,
        user_id: user.id,
        logged_at: today,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["food_logs"] });
      queryClient.invalidateQueries({ queryKey: ["food_logs_week"] });
    },
  });

  const updateLog = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Record<string, any> }) => {
      const { error } = await supabase.from("food_logs").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["food_logs"] });
      queryClient.invalidateQueries({ queryKey: ["food_logs_week"] });
    },
  });

  const deleteLog = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("food_logs").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["food_logs"] });
      queryClient.invalidateQueries({ queryKey: ["food_logs_week"] });
    },
  });

  return { logs, isLoading, addLog, updateLog, deleteLog, weekLogs: weekLogs.data || [] };
}
