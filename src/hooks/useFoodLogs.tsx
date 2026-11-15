import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { parisDayKey } from "@/lib/parisDate";
import { toast } from "sonner";

export function useFoodLogs(date?: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const today = date || parisDayKey();

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
        .gte("logged_at", parisDayKey(weekAgo))
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
      calcium: number | null;
      vitamin_d: number | null;
      magnesium: number | null;
      iron: number | null;
      omega3: number | null;
      phytoestrogens: number | null;
      vitamin_b12: number | null;
      potassium: number | null;
      zinc: number | null;
      vitamin_k: number | null;
      vitamin_b6: number | null;
      vitamin_b9: number | null;
      vitamin_e: number | null;
      meal_type: string;
    }) => {
      if (!user) throw new Error("Not authenticated");
      const entry = {
        ...log,
        user_id: user.id,
        logged_at: today,
      };
      const { error } = await supabase.from("food_logs").insert(entry);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["food_logs"] });
      queryClient.invalidateQueries({ queryKey: ["food_logs_week"] });
    },
  });

  const updateLog = useMutation({
    mutationFn: async ({
      id,
      ...updates
    }: {
      id: string;
      meal_type?: string;
      portion_size?: number;
      calories?: number;
      proteins?: number;
      carbs?: number;
      fats?: number;
      fibres?: number;
      sel?: number;
      sodium?: number;
      sucres?: number;
      acides_gras_satures?: number;
      calcium?: number;
      vitamin_d?: number;
      magnesium?: number;
      iron?: number;
      omega3?: number;
      phytoestrogens?: number;
      vitamin_b12?: number;
      potassium?: number;
      zinc?: number;
      vitamin_k?: number;
      vitamin_b6?: number;
      vitamin_b9?: number;
      vitamin_e?: number;
    }) => {
      const { error } = await supabase.from("food_logs").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["food_logs"] });
      queryClient.invalidateQueries({ queryKey: ["food_logs_week"] });
    },
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["food_logs"] });
    queryClient.invalidateQueries({ queryKey: ["food_logs_week"] });
  };

  /** Supprime un aliment et propose « Annuler » pendant quelques secondes. */
  const deleteLog = useMutation({
    mutationFn: async (id: string) => {
      // La ligne complète est lue avant suppression pour pouvoir la remettre telle quelle.
      const { data: row } = await supabase.from("food_logs").select("*").eq("id", id).maybeSingle();
      const { error } = await supabase.from("food_logs").delete().eq("id", id);
      if (error) throw error;
      return row;
    },
    onSuccess: (row) => {
      refresh();
      if (!row) return;
      toast(`« ${row.food_name} » supprimé`, {
        duration: 6000,
        action: {
          label: "Annuler",
          onClick: async () => {
            const { error } = await supabase.from("food_logs").insert(row);
            if (error) toast.error("Impossible de remettre cet aliment. Ajoute-le à nouveau.");
            refresh();
          },
        },
      });
    },
    onError: () => toast.error("La suppression n'a pas fonctionné. Réessaie."),
  });

  return { logs, isLoading, addLog, updateLog, deleteLog, weekLogs: weekLogs.data || [] };
}
