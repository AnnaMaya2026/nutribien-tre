import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export interface Supplement {
  id: string;
  user_id: string;
  nom: string;
  marque: string | null;
  dose_par_prise: number | null;
  unite_dose: string | null;
  poids_dose_g: number | null;
  actif: boolean;
  quotidien: boolean;
  composition_incomplete: boolean;
  created_at: string;
}

/** Unités de dose autorisées. Celles marquées needsWeight exigent un poids en grammes. */
export const DOSE_UNITS = [
  { value: "g", label: "g", needsWeight: false },
  { value: "ml", label: "ml", needsWeight: false },
  { value: "dosette", label: "dosette", needsWeight: true },
  { value: "gélule", label: "gélule", needsWeight: false },
  { value: "comprimé", label: "comprimé", needsWeight: false },
  { value: "cuillère", label: "cuillère", needsWeight: true },
] as const;

export function doseUnitNeedsWeight(unit: string) {
  return DOSE_UNITS.some((u) => u.value === unit && u.needsWeight);
}

export interface SupplementNutrient {
  id: string;
  supplement_id: string;
  nutrient_key: string;
  amount: number;
  unit: string;
}

export interface SupplementLog {
  id: string;
  user_id: string;
  supplement_id: string;
  logged_at: string;
  taken: boolean;
  quantite: number;
}


export interface NutrientReference {
  nutrient_key: string;
  unite: string;
  rnp_anses: number | null;
  limite_haute: number | null;
}

/** Libellés FR des clés de nutriments utilisées par les compléments. */
export const NUTRIENT_KEY_LABELS: Record<string, string> = {
  calcium: "Calcium",
  magnesium: "Magnésium",
  iron: "Fer",
  zinc: "Zinc",
  selenium: "Sélénium",
  omega3: "Oméga-3",
  proteins: "Protéines",
  vitamin_c: "Vitamine C",
  vitamin_d: "Vitamine D",
  vitamin_e: "Vitamine E",
  vitamin_k: "Vitamine K",
  vitamin_b1: "Vitamine B1",
  vitamin_b2: "Vitamine B2",
  vitamin_b3: "Vitamine B3",
  vitamin_b5: "Vitamine B5",
  vitamin_b6: "Vitamine B6",
  vitamin_b8: "Biotine (B8)",
  vitamin_b9: "Vitamine B9",
  vitamin_b12: "Vitamine B12",
  l_cystine: "L-cystine",
  l_methionine: "L-méthionine",
  collagene_type_i: "Collagène type I",
};

export function nutrientLabel(key: string) {
  return NUTRIENT_KEY_LABELS[key] || key;
}

export type Contribution = {
  amount: number;
  unit: string;
  sources: { nom: string; amount: number }[];
};

export function useSupplements(dateStr: string) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const userId = user?.id;

  const supplementsQuery = useQuery({
    queryKey: ["supplements", userId],
    enabled: !!userId,
    queryFn: async (): Promise<Supplement[]> => {
      const { data, error } = await (supabase as any)
        .from("supplements")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data || []) as Supplement[];
    },
  });

  const nutrientsQuery = useQuery({
    queryKey: ["supplement_nutrients", userId],
    enabled: !!userId,
    queryFn: async (): Promise<SupplementNutrient[]> => {
      const { data, error } = await (supabase as any)
        .from("supplement_nutrients")
        .select("*");
      if (error) throw error;
      return (data || []) as SupplementNutrient[];
    },
  });

  const logsQuery = useQuery({
    queryKey: ["supplement_logs", userId],
    enabled: !!userId,
    queryFn: async (): Promise<SupplementLog[]> => {
      const since = new Date();
      since.setDate(since.getDate() - 120);
      const { data, error } = await (supabase as any)
        .from("supplement_logs")
        .select("*")
        .eq("user_id", userId)
        .gte("logged_at", since.toISOString().split("T")[0]);
      if (error) throw error;
      return (data || []) as SupplementLog[];
    },
  });

  const referencesQuery = useQuery({
    queryKey: ["nutrient_references"],
    queryFn: async (): Promise<NutrientReference[]> => {
      const { data, error } = await (supabase as any)
        .from("nutrient_references")
        .select("*");
      if (error) throw error;
      return (data || []) as NutrientReference[];
    },
  });

  const supplements = supplementsQuery.data || [];
  const allNutrients = nutrientsQuery.data || [];
  const logs = logsQuery.data || [];

  const nutrientsBySupplement = useMemo(() => {
    const map: Record<string, SupplementNutrient[]> = {};
    for (const n of allNutrients) (map[n.supplement_id] ||= []).push(n);
    return map;
  }, [allNutrients]);

  const references = useMemo(() => {
    const map: Record<string, NutrientReference> = {};
    for (const r of referencesQuery.data || []) map[r.nutrient_key] = r;
    return map;
  }, [referencesQuery.data]);

  /**
   * Un complément quotidien est PRÉ-COCHÉ : il compte tant que l'utilisatrice
   * ne l'a pas explicitement décoché pour ce jour-là. Les autres ne comptent
   * que s'ils sont cochés. Fonctionne pour n'importe quelle date passée.
   */
  const isTaken = (s: Supplement, day: string = dateStr) => {
    const log = logs.find((l) => l.supplement_id === s.id && l.logged_at === day);
    if (log) return log.taken;
    return s.quotidien && day <= new Date().toISOString().split("T")[0];
  };

  /** Quantité prise ce jour-là (nombre de doses). 1 par défaut. */
  const takenQuantity = (s: Supplement, day: string = dateStr) => {
    const log = logs.find((l) => l.supplement_id === s.id && l.logged_at === day);
    return log?.quantite != null ? Number(log.quantite) : 1;
  };

  const activeSupplements = supplements.filter((s) => s.actif);

  const takenSupplements = useMemo(
    () => activeSupplements.filter((s) => isTaken(s)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [supplements, logs, dateStr]
  );

  /**
   * Apports des compléments cochés pour le jour affiché : clé → total + sources.
   * Chaque apport est multiplié par la QUANTITÉ réellement saisie ce jour-là
   * (une dosette ou quatre ne donnent pas le même résultat).
   */
  const contributions = useMemo(() => {
    const out: Record<string, Contribution> = {};
    for (const s of takenSupplements) {
      const qty = takenQuantity(s);
      for (const n of nutrientsBySupplement[s.id] || []) {
        const amount = (Number(n.amount) || 0) * (qty > 0 ? qty : 1);
        const c = (out[n.nutrient_key] ||= { amount: 0, unit: n.unit, sources: [] });
        c.amount += amount;
        c.sources.push({ nom: s.nom, amount });
      }
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [takenSupplements, nutrientsBySupplement, logs, dateStr]);


  const toggleTaken = useMutation({
    mutationFn: async ({ supplementId, taken, day, quantite }: { supplementId: string; taken: boolean; day?: string; quantite?: number }) => {
      if (!userId) throw new Error("not authenticated");
      const { error } = await (supabase as any)
        .from("supplement_logs")
        .upsert(
          { user_id: userId, supplement_id: supplementId, logged_at: day || dateStr, taken, quantite: quantite ?? 1 },
          { onConflict: "supplement_id,logged_at" }
        );
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["supplement_logs", userId] }),
    onError: (e: any) => toast.error(e.message || "Erreur d'enregistrement"),
  });

  const addSupplement = useMutation({
    mutationFn: async (input: {
      nom: string;
      marque?: string | null;
      dose_par_prise: number;
      unite_dose: string;
      poids_dose_g?: number | null;
      quotidien: boolean;
      nutrients: { nutrient_key: string; amount: number; unit: string }[];
    }) => {
      if (!userId) throw new Error("not authenticated");
      if (!(Number(input.dose_par_prise) > 0)) throw new Error("La dose est requise.");
      if (!input.unite_dose) throw new Error("L'unité de dose est requise.");
      if (doseUnitNeedsWeight(input.unite_dose) && !(Number(input.poids_dose_g) > 0))
        throw new Error("Le poids en grammes d'une dose est requis pour cette unité.");
      const { data, error } = await (supabase as any)
        .from("supplements")
        .insert({
          user_id: userId,
          nom: input.nom,
          marque: input.marque || null,
          dose_par_prise: Number(input.dose_par_prise),
          unite_dose: input.unite_dose,
          poids_dose_g: doseUnitNeedsWeight(input.unite_dose) ? Number(input.poids_dose_g) : null,
          actif: true,
          quotidien: input.quotidien,
        })
        .select("id")
        .single();
      if (error) throw error;

      if (input.nutrients.length) {
        const { error: e2 } = await (supabase as any)
          .from("supplement_nutrients")
          .insert(input.nutrients.map((n) => ({ ...n, supplement_id: data.id })));
        if (e2) throw e2;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["supplements", userId] });
      qc.invalidateQueries({ queryKey: ["supplement_nutrients", userId] });
      toast.success("Complément ajouté");
    },
    onError: (e: any) => toast.error(e.message || "Erreur"),
  });

  const setActive = useMutation({
    mutationFn: async ({ id, actif }: { id: string; actif: boolean }) => {
      const { error } = await (supabase as any).from("supplements").update({ actif }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["supplements", userId] }),
  });

  const setQuotidien = useMutation({
    mutationFn: async ({ id, quotidien }: { id: string; quotidien: boolean }) => {
      const { error } = await (supabase as any).from("supplements").update({ quotidien }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["supplements", userId] }),
  });

  const deleteSupplement = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("supplements").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["supplements", userId] });
      toast.success("Complément supprimé");
    },
  });

  return {
    supplements,
    activeSupplements,
    nutrientsBySupplement,
    logs,
    references,
    contributions,
    takenSupplements,
    isTaken,
    takenQuantity,

    toggleTaken,
    addSupplement,
    setActive,
    setQuotidien,
    deleteSupplement,
    isLoading: supplementsQuery.isLoading || nutrientsQuery.isLoading || logsQuery.isLoading,
  };
}

/**
 * Statut d'un nutriment : apport alimentaire seul vs total compléments inclus.
 * La couverture est toujours comparée à la RNP ANSES (rnp_anses), jamais aux
 * apports de référence d'étiquetage.
 */
export function nutrientStatus(opts: {
  food: number;
  contribution?: Contribution;
  reference?: NutrientReference;
  fallbackTarget?: number;
}) {
  const supplement = opts.contribution?.amount || 0;
  const total = opts.food + supplement;
  const target = opts.reference?.rnp_anses ?? opts.fallbackTarget ?? 0;
  const limit = opts.reference?.limite_haute ?? null;
  return {
    food: opts.food,
    supplement,
    total,
    target,
    foodPct: target ? (opts.food / target) * 100 : 0,
    totalPct: target ? (total / target) * 100 : 0,
    limit,
    overLimit: limit != null && total > limit,
    sources: opts.contribution?.sources || [],
  };
}
