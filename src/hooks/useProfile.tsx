import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

const currentYear = () => Number(new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris", year: "numeric" }).format(new Date()));

/** Âge atteint dans l'année en cours, d'après l'année de naissance ; null si elle est inconnue. */
export function ageFromBirthYear(birthYear?: number | null, year: number = currentYear()): number | null {
  const y = Number(birthYear);
  return Number.isFinite(y) && y > 1900 && y <= year ? year - y : null;
}

/** Année de naissance déduite d'un âge saisi ; null si l'âge est vide. */
export function birthYearFromAge(age?: number | null, year: number = currentYear()): number | null {
  const a = Number(age);
  return age != null && Number.isFinite(a) && a > 0 ? year - Math.round(a) : null;
}

export function useProfile() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: profile, isLoading } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .single();
      if (error) throw error;
      // L'âge affiché et utilisé dans les calculs vient de l'année de naissance :
      // il avance tout seul d'année en année. La colonne age est tenue à jour
      // pour les fonctions serveur qui la lisent.
      const age = ageFromBirthYear(data?.birth_year);
      if (data && age != null && age !== data.age) {
        supabase.from("profiles").update({ age }).eq("user_id", user.id).then(() => {});
        return { ...data, age };
      }
      return data;
    },
    enabled: !!user,
  });

  const updateProfile = useMutation({
    mutationFn: async (updates: Partial<Omit<import("@/integrations/supabase/types").Tables<"profiles">, "id" | "created_at" | "user_id">>) => {
      if (!user) throw new Error("Not authenticated");
      // Un âge saisi est enregistré comme année de naissance.
      const payload = "age" in updates && !("birth_year" in updates)
        ? { ...updates, birth_year: birthYearFromAge(updates.age) }
        : updates;
      const { error } = await supabase
        .from("profiles")
        .update(payload)
        .eq("user_id", user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile", user?.id] });
    },
  });

  return { profile, isLoading, updateProfile };
}
