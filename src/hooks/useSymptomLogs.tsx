import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export type SymptomScores = Record<string, number>;

export function useSymptomLogs() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const today = new Date().toISOString().split("T")[0];

  const { data: todayLog, isLoading } = useQuery({
    queryKey: ["symptom_log", user?.id, today],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from("symptom_logs")
        .select("*")
        .eq("user_id", user.id)
        .eq("logged_at", today)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Fetch last 7 days of symptom logs for trends
  const { data: weekLogs = [] } = useQuery({
    queryKey: ["symptom_logs_week", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 6);
      const { data, error } = await supabase
        .from("symptom_logs")
        .select("*")
        .eq("user_id", user.id)
        .gte("logged_at", weekAgo.toISOString().split("T")[0])
        .order("logged_at", { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  const upsertLog = useMutation({
    mutationFn: async (log: {
      selected_symptoms: string[];
      symptom_scores?: SymptomScores;
    }) => {
      if (!user) throw new Error("Not authenticated");

      const payload: any = {
        selected_symptoms: log.selected_symptoms,
      };
      if (log.symptom_scores) {
        payload.symptom_scores = log.symptom_scores;
      }
      
      if (todayLog) {
        const { error } = await supabase
          .from("symptom_logs")
          .update(payload)
          .eq("id", todayLog.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("symptom_logs").insert({
          ...payload,
          user_id: user.id,
          logged_at: today,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["symptom_log"] });
      queryClient.invalidateQueries({ queryKey: ["symptom_logs_week"] });
    },
  });

  return { todayLog, isLoading, upsertLog, weekLogs };
}
