import { useState, useMemo, useEffect } from "react";
import { DAILY_TARGETS } from "@/lib/mockData";
import { useFoodLogs } from "@/hooks/useFoodLogs";
import { useProfile } from "@/hooks/useProfile";
import { isFoodAllowed, getDietaryLabels } from "@/lib/dietaryRestrictions";
import { searchCiqual, searchByNutrient, scaleCiqual, CiqualFood } from "@/lib/ciqual";
import { searchRecipes, Recipe } from "@/lib/recipes";
import { RecipeCard } from "@/components/RecipeCard";
import { SymptomReliefTab } from "@/components/SymptomReliefTab";
import { NutrientGapTab } from "@/components/NutrientGapTab";
import { ChefHat, Leaf, AlertTriangle, Search, Loader2, UtensilsCrossed } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { formatStandardPortionHint, getDefaultPortion, getPortionUnit } from "@/lib/portionUnits";

interface NutrientGap {
  key: string;
  dbCol: keyof CiqualFood;
  label: string;
  current: number;
  target: number;
  pct: number;
  unit: string;
}

function FoodCard({ food, gapsCovered }: { food: CiqualFood; gapsCovered?: string[] }) {
  const [grams, setGrams] = useState(getDefaultPortion(food.nom));
  const scaled = scaleCiqual(food, grams);
  const unit = getPortionUnit(food.nom);

  return (
    <div className="bg-card rounded-2xl p-4 card-soft animate-fade-in">
      <div className="flex items-start gap-3 mb-2">
        <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
          <Leaf className="w-4 h-4 text-primary-foreground" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-sm text-foreground line-clamp-2">{food.nom}</h3>
          {food.groupe && <p className="text-[10px] text-pink-deep/70 line-clamp-1">{food.groupe}</p>}
        </div>
      </div>

      {/* Gap badges */}
      {gapsCovered && gapsCovered.length > 0 && (
        <div className="flex gap-1.5 mb-2 flex-wrap">
          {gapsCovered.map((g) => (
            <span key={g} className="text-[10px] px-2 py-0.5 rounded-full bg-warning/20 text-warning font-medium border border-warning/30">
              Couvre votre manque en {g} ✓
            </span>
          ))}
        </div>
      )}

      {/* Portion selector */}
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xs text-muted-foreground">Portion :</span>
        <div className="flex gap-1">
          {(unit === "ml" ? [100, 150, 200, 250] : [50, 100, 150, 200]).map((g) => (
            <button
              key={g}
              onClick={() => setGrams(g)}
              className={`px-2 py-1 rounded-md text-[10px] font-medium transition-all ${grams === g ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
            >
              {g}{unit}
            </button>
          ))}
        </div>
      </div>
      <p className="text-[11px] text-muted-foreground mb-3">{formatStandardPortionHint(food.nom)}</p>

      {/* Macros */}
      <div className="grid grid-cols-5 gap-1 text-center mb-2">
        {[
          { label: "kcal", value: scaled.calories },
          { label: "Prot", value: `${scaled.proteins}g` },
          { label: "Gluc", value: `${scaled.carbs}g` },
          { label: "Lip", value: `${scaled.fats}g` },
          { label: "Fibres", value: `${scaled.fibres}g` },
        ].map((n) => (
          <div key={n.label} className="bg-muted/50 rounded-lg py-1.5">
            <div className="text-xs font-bold text-foreground">{n.value}</div>
            <div className="text-[9px] text-muted-foreground">{n.label}</div>
          </div>
        ))}
      </div>

      {/* Micros */}
      <div className="grid grid-cols-3 gap-1 text-center">
        {[
          { label: "Calcium", value: scaled.calcium, unit: "mg" },
          { label: "Magnésium", value: scaled.magnesium, unit: "mg" },
          { label: "Fer", value: scaled.iron, unit: "mg" },
          { label: "Vit. D", value: scaled.vitamin_d, unit: "µg" },
          { label: "Oméga-3", value: scaled.omega3, unit: "g" },
          { label: "Vit. B12", value: scaled.vitamin_b12, unit: "µg" },
        ].map((n) => (
          <div key={n.label} className="bg-muted/30 rounded-lg py-1 px-1">
            <div className="text-[10px] font-semibold text-foreground">{n.value}{n.unit}</div>
            <div className="text-[9px] text-muted-foreground">{n.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function RepasPage() {
  const [ingredients, setIngredients] = useState("");
  const [searchResults, setSearchResults] = useState<CiqualFood[]>([]);
  const [searching, setSearching] = useState(false);
  const [gapFoods, setGapFoods] = useState<{ food: CiqualFood; covers: string[] }[]>([]);
  const [loadingGaps, setLoadingGaps] = useState(false);
  const [recipeQuery, setRecipeQuery] = useState("");
  const [recipeResults, setRecipeResults] = useState<Recipe[]>([]);
  const { logs } = useFoodLogs();
  const { profile } = useProfile();
  const restrictions = (profile?.dietary_preferences as string[] | null) || [];
  const restrictionLabels = getDietaryLabels(restrictions);

  // Debounced ingredient search
  useEffect(() => {
    if (ingredients.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    const timer = setTimeout(async () => {
      try {
        const res = await searchCiqual(ingredients.trim());
        setSearchResults(res);
      } catch {
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [ingredients]);

  // Recipe search
  useEffect(() => {
    setRecipeResults(searchRecipes(recipeQuery));
  }, [recipeQuery]);

  // Today's totals
  const todayTotals = useMemo(() => {
    return logs.reduce(
      (acc, log) => ({
        calories: acc.calories + (log.calories || 0),
        proteins: acc.proteins + (log.proteins || 0),
        calcium: acc.calcium + (log.calcium || 0),
        vitamin_d: acc.vitamin_d + (log.vitamin_d || 0),
        magnesium: acc.magnesium + (log.magnesium || 0),
        iron: acc.iron + (log.iron || 0),
        omega3: acc.omega3 + (log.omega3 || 0),
      }),
      { calories: 0, proteins: 0, calcium: 0, vitamin_d: 0, magnesium: 0, iron: 0, omega3: 0 }
    );
  }, [logs]);

  const gaps: NutrientGap[] = useMemo(() => {
    const checks: Omit<NutrientGap, "pct">[] = [
      { key: "calcium", dbCol: "calcium_100g", label: "Calcium", current: todayTotals.calcium, target: DAILY_TARGETS.calcium, unit: "mg" },
      { key: "proteins", dbCol: "proteines_100g", label: "Protéines", current: todayTotals.proteins, target: DAILY_TARGETS.proteins, unit: "g" },
      { key: "magnesium", dbCol: "magnesium_100g", label: "Magnésium", current: todayTotals.magnesium, target: DAILY_TARGETS.magnesium, unit: "mg" },
      { key: "iron", dbCol: "fer_100g", label: "Fer", current: todayTotals.iron, target: DAILY_TARGETS.iron, unit: "mg" },
      { key: "vitamin_d", dbCol: "vitamine_d_100g", label: "Vitamine D", current: todayTotals.vitamin_d, target: DAILY_TARGETS.vitamin_d, unit: "µg" },
      { key: "omega3", dbCol: "omega3_total_100g", label: "Oméga-3", current: todayTotals.omega3, target: DAILY_TARGETS.omega3, unit: "g" },
    ];
    return checks
      .map((c) => ({ ...c, pct: Math.round((c.current / c.target) * 100) }))
      .filter((c) => c.pct < 50)
      .sort((a, b) => a.pct - b.pct);
  }, [todayTotals]);

  // Fetch foods that cover gaps
  useEffect(() => {
    if (gaps.length === 0) {
      setGapFoods([]);
      return;
    }

    let cancelled = false;
    setLoadingGaps(true);

    (async () => {
      try {
        const foodMap = new Map<number, { food: CiqualFood; covers: Set<string> }>();

        // For each gap, fetch more than needed so filtering still leaves good options
        const promises = gaps.map(async (gap) => {
          const foods = await searchByNutrient(gap.dbCol, 20);
          return { gap, foods: foods.filter((f) => isFoodAllowed(f.nom, restrictions)) };
        });

        const results = await Promise.all(promises);
        if (cancelled) return;

        results.forEach(({ gap, foods }) => {
          foods.slice(0, 5).forEach((f) => {
            const existing = foodMap.get(f.id);
            if (existing) {
              existing.covers.add(gap.label);
            } else {
              foodMap.set(f.id, { food: f, covers: new Set([gap.label]) });
            }
          });
        });

        // Sort by number of gaps covered (most first), limit to 10
        const sorted = Array.from(foodMap.values())
          .map((e) => ({ food: e.food, covers: Array.from(e.covers) }))
          .sort((a, b) => b.covers.length - a.covers.length)
          .slice(0, 10);

        setGapFoods(sorted);
      } catch {
        setGapFoods([]);
      } finally {
        if (!cancelled) setLoadingGaps(false);
      }
    })();

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gaps, restrictions.join(",")]);

  return (
    <div className="pb-24 px-4 pt-6 bg-background min-h-screen">
      <h1 className="text-2xl font-bold text-foreground mb-1">Suggestions pour toi</h1>
      <p className="text-muted-foreground text-sm mb-4">Personnalisées selon vos besoins du jour</p>

      <Tabs defaultValue="nutrients" className="w-full">
        <TabsList className="w-full mb-4 h-auto flex-wrap min-h-12 p-1">
          <TabsTrigger value="nutrients" className="flex-1 text-[11px] px-1 py-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">🥕 Par nutriment manquant</TabsTrigger>
          <TabsTrigger value="recipes" className="flex-1 text-[11px] px-1 py-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">🍽️ Par recette</TabsTrigger>
          <TabsTrigger value="symptoms" className="flex-1 text-[11px] px-1 py-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">✨ Atténuer mes symptômes</TabsTrigger>
          <TabsTrigger value="gaps" className="flex-1 text-[11px] px-1 py-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">🎯 Combler mes manques</TabsTrigger>
        </TabsList>

        <TabsContent value="nutrients">
          <NutrientGapTab />
        </TabsContent>

        <TabsContent value="recipes">
          <div className="relative mb-4">
            <UtensilsCrossed className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={recipeQuery}
              onChange={(e) => setRecipeQuery(e.target.value)}
              placeholder="Rechercher : pâtes, salade, soupe..."
              className="pl-10 h-12 bg-card rounded-lg"
            />
          </div>

          {recipeResults.length === 0 && recipeQuery.trim().length >= 2 && (
            <div className="flex flex-col items-center py-8 text-center">
              <Search className="w-8 h-8 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">Aucune recette trouvée pour "{recipeQuery}"</p>
            </div>
          )}

          {recipeQuery.trim().length < 2 && (
            <p className="text-xs text-muted-foreground mb-3 italic">
              💡 Tapez un mot-clé ou parcourez nos recettes adaptées à la ménopause
            </p>
          )}

          <div className="space-y-3">
            {recipeResults.map((recipe) => (
              <RecipeCard key={recipe.id} recipe={recipe} />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="gaps">
          {gaps.length > 0 ? (
            <>
              <div className="bg-card rounded-2xl p-4 card-soft mb-4">
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle className="w-4 h-4 text-warning" />
                  <h3 className="text-sm font-semibold text-foreground">Vos manques aujourd'hui (&lt;50%)</h3>
                </div>
                <div className="space-y-2">
                  {gaps.map((gap) => (
                    <div key={gap.key} className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">{gap.label}</span>
                      <div className="flex items-center gap-2">
                        <div className="w-24 h-1.5 bg-muted rounded-full overflow-hidden">
                          <div className="h-full rounded-full bg-warning transition-all" style={{ width: `${gap.pct}%` }} />
                        </div>
                        <span className="text-[10px] text-muted-foreground w-8 text-right">{gap.pct}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <h3 className="text-sm font-semibold text-foreground mb-3">Aliments suggérés pour combler vos manques</h3>

              {loadingGaps && (
                <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin" /> Chargement des suggestions...
                </div>
              )}

              <div className="space-y-3">
                {gapFoods.map(({ food, covers }) => (
                  <FoodCard key={food.id} food={food} gapsCovered={covers} />
                ))}
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="text-5xl mb-4">✅</div>
              <p className="text-sm text-foreground font-medium mb-1">Bravo !</p>
              <p className="text-xs text-muted-foreground">Vos apports nutritionnels sont bons aujourd'hui</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="symptoms">
          <SymptomReliefTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
