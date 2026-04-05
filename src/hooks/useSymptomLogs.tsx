import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

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

  const upsertLog = useMutation({
    mutationFn: async (log: {
      fatigue: number;
      bouffees_chaleur: number;
      insomnie: number;
      sautes_humeur: number;
      notes?: string;
    }) => {
      if (!user) throw new Error("Not authenticated");
      
      if (todayLog) {
        const { error } = await supabase
          .from("symptom_logs")
          .update(log)
          .eq("id", todayLog.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("symptom_logs").insert({
          ...log,
          user_id: user.id,
          logged_at: today,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["symptom_log"] });
    },
  });

  return { todayLog, isLoading, upsertLog };
}
