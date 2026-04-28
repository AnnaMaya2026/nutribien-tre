import { useState, useEffect, useMemo } from "react";
import { DAILY_TARGETS } from "@/lib/mockData";
import { useFoodLogs } from "@/hooks/useFoodLogs";
import { searchByNutrient, CiqualFood } from "@/lib/ciqual";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/useProfile";
import { isFoodAllowed, getAlternativesForRestrictions, getDietaryLabels } from "@/lib/dietaryRestrictions";
import { Loader2, Sparkles, ChevronLeft, RotateCw, Leaf } from "lucide-react";
import { Button } from "@/components/ui/button";

interface NutrientGap {
  key: string;
  dbCol: keyof CiqualFood;
  label: string;
  current: number;
  target: number;
  pct: number;
  unit: string;
  emoji: string;
}

interface GeneratedRecipe {
  name: string;
  prep_time: string;
  cook_time: string;
  ingredients: { name: string; grams: number }[];
  steps: string[];
  calories: number;
  proteins: number;
  addresses: string;
}

export function NutrientGapTab() {
  const { logs } = useFoodLogs();
  const { profile } = useProfile();
  const restrictions = (profile?.dietary_preferences as string[] | null) || [];
  const restrictionLabels = getDietaryLabels(restrictions);
  const alternatives = getAlternativesForRestrictions(restrictions);
  const [selected, setSelected] = useState<NutrientGap | null>(null);
  const [foods, setFoods] = useState<CiqualFood[]>([]);
  const [loadingFoods, setLoadingFoods] = useState(false);
  const [recipes, setRecipes] = useState<GeneratedRecipe[]>([]);
  const [loadingRecipes, setLoadingRecipes] = useState(false);

  const todayTotals = useMemo(() => {
    return logs.reduce(
      (acc, log) => ({
        proteins: acc.proteins + (log.proteins || 0),
        calcium: acc.calcium + (log.calcium || 0),
        vitamin_d: acc.vitamin_d + (log.vitamin_d || 0),
        magnesium: acc.magnesium + (log.magnesium || 0),
        iron: acc.iron + (log.iron || 0),
        omega3: acc.omega3 + (log.omega3 || 0),
      }),
      { proteins: 0, calcium: 0, vitamin_d: 0, magnesium: 0, iron: 0, omega3: 0 }
    );
  }, [logs]);

  const gaps: NutrientGap[] = useMemo(() => {
    const checks: Omit<NutrientGap, "pct">[] = [
      { key: "calcium", dbCol: "calcium_100g", label: "Calcium", current: todayTotals.calcium, target: DAILY_TARGETS.calcium, unit: "mg", emoji: "🦴" },
      { key: "proteins", dbCol: "proteines_100g", label: "Protéines", current: todayTotals.proteins, target: DAILY_TARGETS.proteins, unit: "g", emoji: "💪" },
      { key: "magnesium", dbCol: "magnesium_100g", label: "Magnésium", current: todayTotals.magnesium, target: DAILY_TARGETS.magnesium, unit: "mg", emoji: "🌿" },
      { key: "iron", dbCol: "fer_100g", label: "Fer", current: todayTotals.iron, target: DAILY_TARGETS.iron, unit: "mg", emoji: "🩸" },
      { key: "vitamin_d", dbCol: "vitamine_d_100g", label: "Vitamine D", current: todayTotals.vitamin_d, target: DAILY_TARGETS.vitamin_d, unit: "µg", emoji: "☀️" },
      { key: "omega3", dbCol: "omega3_total_100g", label: "Oméga-3", current: todayTotals.omega3, target: DAILY_TARGETS.omega3, unit: "g", emoji: "🐟" },
    ];
    return checks
      .map((c) => ({ ...c, pct: Math.round((c.current / c.target) * 100) }))
      .filter((c) => c.pct < 80)
      .sort((a, b) => a.pct - b.pct);
  }, [todayTotals]);

  // Load foods + recipes when nutrient is selected
  useEffect(() => {
    if (!selected) return;
    let cancelled = false;
    setLoadingFoods(true);
    setFoods([]);
    setRecipes([]);

    (async () => {
      try {
        // Fetch more than needed so we can keep 5 even after filtering
        const res = await searchByNutrient(selected.dbCol, 20);
        const filtered = res.filter((f) => isFoodAllowed(f.nom, restrictions)).slice(0, 5);
        if (!cancelled) setFoods(filtered);
      } finally {
        if (!cancelled) setLoadingFoods(false);
      }
      // Generate recipes
      generateRecipes(selected, []);
    })();

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected]);

  const generateRecipes = async (gap: NutrientGap, exclude: string[]) => {
    setLoadingRecipes(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-recipes", {
        body: {
          context: `Recettes riches en ${gap.label} pour combler un manque (apport actuel: ${gap.pct}% de l'objectif quotidien).`,
          count: 4,
          exclude,
        },
      });
      if (error) throw error;
      setRecipes(data?.recipes || []);
    } catch (e) {
      console.error("Recipe generation failed", e);
      setRecipes([]);
    } finally {
      setLoadingRecipes(false);
    }
  };

  // ---------- DETAIL VIEW ----------
  if (selected) {
    return (
      <div className="animate-fade-in">
        <button
          onClick={() => setSelected(null)}
          className="flex items-center gap-1 text-sm text-muted-foreground mb-3 hover:text-foreground"
        >
          <ChevronLeft className="w-4 h-4" /> Retour
        </button>

        <div className="bg-card rounded-2xl p-4 card-soft mb-4">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-2xl">{selected.emoji}</span>
            <h2 className="text-lg font-bold text-foreground">{selected.label}</h2>
          </div>
          <p className="text-xs text-muted-foreground">
            Vous êtes à <span className="font-semibold text-warning">{selected.pct}%</span> de votre objectif quotidien
            ({Math.round(selected.current)}{selected.unit} / {selected.target}{selected.unit})
          </p>
        </div>

        <h3 className="text-sm font-semibold text-foreground mb-2">🥗 Top 5 aliments riches en {selected.label}</h3>
        {loadingFoods ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-2 mb-6">
            {foods.map((f) => (
              <div key={f.id} className="bg-card rounded-xl p-3 card-soft flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                  <Leaf className="w-3.5 h-3.5 text-primary-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground line-clamp-1">{f.nom}</p>
                  {f.groupe && <p className="text-[10px] text-muted-foreground line-clamp-1">{f.groupe}</p>}
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold text-primary-foreground">
                    {Math.round(Number(f[selected.dbCol] as number) * 10) / 10}{selected.unit}
                  </div>
                  <div className="text-[9px] text-muted-foreground">/100g</div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-foreground">✨ Idées de recettes</h3>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => generateRecipes(selected, recipes.map((r) => r.name))}
            disabled={loadingRecipes}
            className="h-7 text-[10px]"
          >
            <RotateCw className={`w-3 h-3 mr-1 ${loadingRecipes ? "animate-spin" : ""}`} />
            Autres idées
          </Button>
        </div>

        {loadingRecipes && recipes.length === 0 ? (
          <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" /> Sophie cherche des recettes...
          </div>
        ) : (
          <div className="space-y-3">
            {recipes.map((r, idx) => (
              <div key={`${r.name}-${idx}`} className="bg-card rounded-2xl p-4 card-soft animate-fade-in">
                <div className="flex items-start gap-2 mb-2">
                  <Sparkles className="w-4 h-4 text-primary-foreground mt-0.5 flex-shrink-0" />
                  <h4 className="text-sm font-bold text-foreground flex-1">{r.name}</h4>
                </div>
                <div className="flex gap-2 mb-2 text-[10px] text-muted-foreground">
                  <span>⏱ Prép: {r.prep_time}</span>
                  <span>🔥 Cuisson: {r.cook_time}</span>
                  <span>🔥 {r.calories} kcal</span>
                </div>
                {r.addresses && (
                  <p className="text-[10px] text-pink-deep/80 italic mb-2">{r.addresses}</p>
                )}
                <div className="mb-2">
                  <p className="text-[11px] font-semibold text-foreground mb-1">Ingrédients :</p>
                  <ul className="text-[11px] text-muted-foreground space-y-0.5">
                    {r.ingredients?.map((ing, i) => (
                      <li key={i}>• {ing.name} — {ing.grams}g</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="text-[11px] font-semibold text-foreground mb-1">Étapes :</p>
                  <ol className="text-[11px] text-muted-foreground space-y-0.5 list-decimal list-inside">
                    {r.steps?.map((s, i) => (
                      <li key={i}>{s}</li>
                    ))}
                  </ol>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ---------- LIST VIEW ----------
  if (gaps.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center animate-fade-in">
        <div className="text-5xl mb-4">✅</div>
        <p className="text-sm text-foreground font-medium mb-1">Bravo !</p>
        <p className="text-xs text-muted-foreground">Tous vos nutriments sont au-dessus de 80% aujourd'hui</p>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <p className="text-xs text-muted-foreground mb-3 italic">
        💡 Vos nutriments sous les 80% aujourd'hui. Touchez-en un pour voir les aliments et recettes adaptés.
      </p>
      <div className="space-y-2">
        {gaps.map((gap) => (
          <button
            key={gap.key}
            onClick={() => setSelected(gap)}
            className="w-full bg-card rounded-2xl p-4 card-soft text-left hover:scale-[1.01] transition-transform"
          >
            <div className="flex items-center gap-3 mb-2">
              <span className="text-2xl">{gap.emoji}</span>
              <div className="flex-1">
                <p className="text-sm font-semibold text-foreground">{gap.label}</p>
                <p className="text-[11px] text-muted-foreground">
                  {gap.pct}% de votre objectif
                </p>
              </div>
              <ChevronLeft className="w-4 h-4 text-muted-foreground rotate-180" />
            </div>
            <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-warning transition-all"
                style={{ width: `${Math.min(gap.pct, 100)}%` }}
              />
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
