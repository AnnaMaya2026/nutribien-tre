import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useFoodLogs } from "@/hooks/useFoodLogs";
import { useSymptomLogs } from "@/hooks/useSymptomLogs";
import { SYMPTOM_RELIEF_FOODS } from "@/lib/symptomReliefFoods";
import { searchCiqual, scaleCiqual, CiqualFood } from "@/lib/ciqual";
import { Activity, Plus, Loader2, Sparkles } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface ResolvedSuggestion {
  name: string;
  nutrient: string;
  food: CiqualFood | null;
}

export function SymptomReliefTab() {
  const { user } = useAuth();
  const { todayLog } = useSymptomLogs();
  const { addLog } = useFoodLogs();
  const [resolved, setResolved] = useState<Record<string, ResolvedSuggestion[]>>({});
  const [loading, setLoading] = useState(false);

  // Pick symptoms with score >= 5 (or all selected ones if no scores)
  const scores = (todayLog?.symptom_scores as Record<string, number>) || {};
  const selected = todayLog?.selected_symptoms || [];
  const activeSymptoms = (Object.keys(SYMPTOM_RELIEF_FOODS).filter((k) => {
    const s = scores[k];
    if (typeof s === "number") return s >= 5;
    return selected.includes(k);
  }));

  // Sort by score desc
  activeSymptoms.sort((a, b) => (scores[b] || 0) - (scores[a] || 0));

  useEffect(() => {
    if (activeSymptoms.length === 0) {
      setResolved({});
      return;
    }
    let cancelled = false;
    setLoading(true);

    (async () => {
      const map: Record<string, ResolvedSuggestion[]> = {};
      for (const symptomKey of activeSymptoms) {
        const cfg = SYMPTOM_RELIEF_FOODS[symptomKey];
        if (!cfg) continue;
        const items = await Promise.all(
          cfg.foods.map(async (f) => {
            try {
              const res = await searchCiqual(f.ciqualSearch);
              return { name: f.name, nutrient: f.nutrient, food: res[0] || null };
            } catch {
              return { name: f.name, nutrient: f.nutrient, food: null };
            }
          })
        );
        map[symptomKey] = items;
      }
      if (!cancelled) {
        setResolved(map);
        setLoading(false);
      }
    })();

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSymptoms.join(",")]);

  const handleAdd = async (suggestion: ResolvedSuggestion) => {
    if (!user || !suggestion.food) return;
    const grams = 100;
    const scaled = scaleCiqual(suggestion.food, grams);
    try {
      await addLog.mutateAsync({
        food_name: suggestion.food.nom,
        portion_size: grams,
        meal_type: "snack",
        ...scaled,
      });
      toast({ title: "Ajouté au journal", description: `${suggestion.food.nom} (${grams}g)` });
    } catch (e: any) {
      toast({ title: "Erreur", description: e.message, variant: "destructive" });
    }
  };

  if (!user) {
    return <p className="text-sm text-muted-foreground text-center py-8">Connectez-vous pour voir vos suggestions.</p>;
  }

  if (activeSymptoms.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="text-5xl mb-4">😊</div>
        <p className="text-sm text-foreground font-medium mb-1">Aucun symptôme à atténuer aujourd'hui</p>
        <p className="text-xs text-muted-foreground">Notez vos symptômes du jour dans l'onglet Symptômes pour obtenir des suggestions ciblées.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-card rounded-2xl p-4 card-soft">
        <div className="flex items-center gap-2 mb-1">
          <Sparkles className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">Suggestions personnalisées</h3>
        </div>
        <p className="text-[11px] text-muted-foreground">
          Aliments adaptés à vos symptômes du jour pour vous aider à vous sentir mieux.
        </p>
      </div>

      {loading && (
        <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" /> Chargement des suggestions...
        </div>
      )}

      {activeSymptoms.map((symptomKey) => {
        const cfg = SYMPTOM_RELIEF_FOODS[symptomKey];
        const items = resolved[symptomKey] || [];
        const score = scores[symptomKey];
        if (!cfg) return null;

        return (
          <div key={symptomKey} className="bg-card rounded-2xl p-4 card-soft">
            <div className="flex items-center gap-2 mb-3">
              <Activity className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-semibold text-foreground">{cfg.label}</h3>
              {typeof score === "number" && (
                <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full bg-warning/20 text-warning font-medium border border-warning/30">
                  Intensité : {score}/10
                </span>
              )}
            </div>

            <div className="space-y-2">
              {items.map((it, i) => (
                <div key={i} className="flex items-center justify-between gap-2 px-3 py-2 bg-muted/30 rounded-lg">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-foreground truncate">{it.name}</p>
                    <p className="text-[10px] text-muted-foreground truncate">
                      {it.food ? `${Math.round(it.food.calories_100g)} kcal/100g · ` : ""}
                      <span className="text-primary/80">{it.nutrient}</span>
                    </p>
                  </div>
                  <button
                    onClick={() => handleAdd(it)}
                    disabled={!it.food || addLog.isPending}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-primary text-primary-foreground text-[10px] font-medium disabled:opacity-50 hover:bg-primary/90 transition"
                  >
                    <Plus className="w-3 h-3" />
                    Ajouter
                  </button>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
