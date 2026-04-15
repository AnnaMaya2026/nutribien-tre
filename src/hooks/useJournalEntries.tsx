import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface JournalEntry {
  id: string;
  user_id: string;
  category: string;
  content: string;
  entry_date: string;
  created_at: string;
  updated_at: string;
}

export const JOURNAL_CATEGORIES = [
  { value: "complement", label: "💊 Complément alimentaire" },
  { value: "sport", label: "🏃 Sport" },
  { value: "alimentation", label: "🥗 Alimentation" },
  { value: "medecin", label: "👩‍⚕️ Médecin / Santé" },
  { value: "autre", label: "📝 Autre" },
] as const;

export function useJournalEntries() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ["journal_entries", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("journal_entries" as any)
        .select("*")
        .eq("user_id", user.id)
        .order("entry_date", { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data || []) as unknown as JournalEntry[];
    },
    enabled: !!user,
  });

  const addEntry = useMutation({
    mutationFn: async (entry: { category: string; content: string; entry_date: string }) => {
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase
        .from("journal_entries" as any)
        .insert({ ...entry, user_id: user.id } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["journal_entries"] });
    },
  });

  const deleteEntry = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("journal_entries" as any)
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["journal_entries"] });
    },
  });

  return { entries, isLoading, addEntry, deleteEntry };
}
