import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { useSymptomLogs } from "@/hooks/useSymptomLogs";
import { SYMPTOM_RELIEF_FOODS } from "@/lib/symptomReliefFoods";
import { searchCiqual, CiqualFood } from "@/lib/ciqual";
import { supabase } from "@/integrations/supabase/client";
import { isFoodAllowed, getDietaryLabels } from "@/lib/dietaryRestrictions";
import { Activity, Loader2, Sparkles, ChefHat, Clock, X } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";

interface ResolvedSuggestion {
  name: string;
  nutrient: string;
  food: CiqualFood | null;
}

interface RecipeIdea {
  name: string;
  prep_time: string;
  description: string;
  ingredients: string[];
  steps: string[];
}

export function SymptomReliefTab() {
  const { user } = useAuth();
  const { profile } = useProfile();
  const restrictions = (profile?.dietary_preferences as string[] | null) || [];
  const restrictionLabels = getDietaryLabels(restrictions);
  const { todayLog } = useSymptomLogs();
  const [resolved, setResolved] = useState<Record<string, ResolvedSuggestion[]>>({});
  const [loading, setLoading] = useState(false);

  // Recipe ideas panel state
  const [sheetOpen, setSheetOpen] = useState(false);
  const [activeIngredient, setActiveIngredient] = useState<ResolvedSuggestion | null>(null);
  const [recipes, setRecipes] = useState<RecipeIdea[]>([]);
  const [recipesLoading, setRecipesLoading] = useState(false);

  const scores = (todayLog?.symptom_scores as Record<string, number>) || {};
  const selected = todayLog?.selected_symptoms || [];

  // 🔍 Debug: compare DB symptom keys with code keys
  console.log("[SymptomReliefTab] DB symptoms (todayLog):", todayLog);
  console.log("[SymptomReliefTab] DB scores keys:", Object.keys(scores));
  console.log("[SymptomReliefTab] DB selected_symptoms:", selected);
  console.log("[SymptomReliefTab] Relief foods keys:", Object.keys(SYMPTOM_RELIEF_FOODS));

  // Collect ALL symptom keys that are active today (score >= 5 OR present in selected_symptoms)
  const allCandidateKeys = Array.from(
    new Set<string>([...Object.keys(scores), ...selected])
  );
  const activeSymptoms = allCandidateKeys
    .filter((k) => {
      if (!SYMPTOM_RELIEF_FOODS[k]) {
        console.warn(`[SymptomReliefTab] No relief foods mapping for symptom key: "${k}"`);
        return false;
      }
      const s = scores[k];
      // Show if score >= 5, OR if symptom was selected today (even with lower score)
      if (typeof s === "number" && s >= 5) return true;
      return selected.includes(k);
    })
    .sort((a, b) => (scores[b] || 0) - (scores[a] || 0));

  console.log("[SymptomReliefTab] Active symptoms to display:", activeSymptoms);

  // Stable signature for effect deps (include restrictions so list refreshes when profile changes)
  const activeKey = activeSymptoms.join("|") + "::" + restrictions.join(",");

  useEffect(() => {
    if (activeSymptoms.length === 0) {
      setResolved({});
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);

    (async () => {
      // Resolve ALL symptoms in parallel so one slow lookup doesn't block others
      const entries = await Promise.all(
        activeSymptoms.map(async (symptomKey) => {
          const cfg = SYMPTOM_RELIEF_FOODS[symptomKey];
          // Drop foods incompatible with the user's dietary restrictions
          const allowedFoods = cfg.foods.filter((f) => isFoodAllowed(f.name, restrictions));
          const items: ResolvedSuggestion[] = await Promise.all(
            allowedFoods.map(async (f) => {
              try {
                const res = await searchCiqual(f.ciqualSearch);
                return { name: f.name, nutrient: f.nutrient, food: res[0] || null };
              } catch {
                return { name: f.name, nutrient: f.nutrient, food: null };
              }
            })
          );
          return [symptomKey, items] as const;
        })
      );
      if (!cancelled) {
        const map: Record<string, ResolvedSuggestion[]> = {};
        for (const [k, v] of entries) map[k] = v;
        setResolved(map);
        setLoading(false);
      }
    })();

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeKey]);

  const openRecipeIdeas = async (suggestion: ResolvedSuggestion) => {
    setActiveIngredient(suggestion);
    setSheetOpen(true);
    setRecipes([]);
    setRecipesLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("recipe-ideas", {
        body: { ingredient: suggestion.name, nutrient: suggestion.nutrient },
      });
      if (error) throw error;
      setRecipes(data?.recipes || []);
    } catch (e: any) {
      toast({ title: "Erreur", description: e.message || "Impossible de charger les recettes", variant: "destructive" });
    } finally {
      setRecipesLoading(false);
    }
  };

  if (!user) {
    return <p className="text-sm text-muted-foreground text-center py-8">Connectez-vous pour voir vos suggestions.</p>;
  }

  if (activeSymptoms.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center px-4">
        <div className="text-5xl mb-4">🎉</div>
        <p className="text-sm text-foreground font-medium mb-1">Aucun symptôme élevé aujourd'hui</p>
        <p className="text-xs text-muted-foreground max-w-xs">
          Revenez après avoir rempli votre bilan de symptômes pour obtenir des suggestions ciblées.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-card rounded-2xl p-4 card-soft">
        <div className="flex items-center gap-2 mb-1">
          <Sparkles className="w-4 h-4 text-pink-deep" />
          <h3 className="text-sm font-semibold text-foreground">Suggestions personnalisées</h3>
        </div>
        <p className="text-[11px] text-muted-foreground">
          Aliments inspirants adaptés à vos symptômes. Cliquez pour découvrir des idées de recettes ✨
        </p>
        {restrictionLabels.length > 0 && (
          <p className="mt-2 text-[11px] text-foreground bg-primary/10 rounded-md px-2 py-1">
            ✅ Filtré selon votre profil : <span className="font-semibold">{restrictionLabels.join(", ")}</span>
          </p>
        )}
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
              <Activity className="w-4 h-4 text-pink-deep" />
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
                      <span className="text-pink-deep/80">{it.nutrient}</span>
                    </p>
                  </div>
                  <button
                    onClick={() => openRecipeIdeas(it)}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-primary text-primary-foreground text-[10px] font-medium hover:bg-primary/90 transition whitespace-nowrap"
                  >
                    🍽️ Idées recettes
                  </button>
                </div>
              ))}
            </div>
          </div>
        );
      })}

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="bottom" className="rounded-t-3xl max-h-[85vh] overflow-y-auto">
          <SheetHeader className="text-left">
            <SheetTitle className="flex items-center gap-2 text-base">
              <ChefHat className="w-4 h-4 text-pink-deep" />
              Idées recettes avec {activeIngredient?.name}
            </SheetTitle>
            <SheetDescription className="text-xs">
              {activeIngredient?.nutrient && (
                <span className="text-pink-deep/80">Riche en {activeIngredient.nutrient}</span>
              )}
              {" · "}Inspirations pour vos repas — à logger ensuite dans le Journal.
            </SheetDescription>
          </SheetHeader>

          <div className="mt-4 space-y-3">
            {recipesLoading && (
              <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" /> Génération des idées recettes...
              </div>
            )}

            {!recipesLoading && recipes.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-8">
                Aucune recette générée pour le moment.
              </p>
            )}

            {!recipesLoading && recipes.map((r, i) => (
              <div key={i} className="bg-muted/30 rounded-2xl p-4 border border-border">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h4 className="text-sm font-semibold text-foreground flex-1">{r.name}</h4>
                  {r.prep_time && (
                    <span className="flex items-center gap-1 text-[10px] text-muted-foreground whitespace-nowrap">
                      <Clock className="w-3 h-3" /> {r.prep_time}
                    </span>
                  )}
                </div>
                {r.description && (
                  <p className="text-xs text-muted-foreground mb-3 italic">{r.description}</p>
                )}

                {r.ingredients?.length > 0 && (
                  <div className="mb-3">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-pink-deep mb-1">Ingrédients</p>
                    <ul className="text-xs text-foreground space-y-0.5 list-disc list-inside">
                      {r.ingredients.map((ing, j) => (
                        <li key={j}>{ing}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {r.steps?.length > 0 && (
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-pink-deep mb-1">Préparation</p>
                    <ol className="text-xs text-foreground space-y-1 list-decimal list-inside">
                      {r.steps.map((s, j) => (
                        <li key={j}>{s}</li>
                      ))}
                    </ol>
                  </div>
                )}
              </div>
            ))}

            {!recipesLoading && recipes.length > 0 && (
              <div className="bg-primary/10 rounded-xl p-3 text-center">
                <p className="text-[11px] text-foreground">
                  💡 Une fois cuisinée, n'oubliez pas de logger votre repas dans le <span className="font-semibold text-pink-deep">Journal</span>.
                </p>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
