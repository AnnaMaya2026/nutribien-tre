import { useState, useMemo } from "react";
import { MEAL_SUGGESTIONS, DAILY_TARGETS } from "@/lib/mockData";
import { useFoodLogs } from "@/hooks/useFoodLogs";
import { ChefHat, Leaf, Minus, Plus, AlertTriangle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

// Default total weight per meal (grams)
const DEFAULT_WEIGHTS: Record<string, number> = {
  "Bowl de quinoa au saumon": 370,
  "Salade de lentilles méditerranéenne": 350,
  "Smoothie ménopause boost": 400,
  "Poulet grillé aux brocolis": 380,
  "Tartine sardines-avocat": 280,
  "Soupe miso au tofu": 350,
};

// Ingredient breakdowns with weights (grams)
const INGREDIENT_WEIGHTS: Record<string, { name: string; weight: number }[]> = {
  "Bowl de quinoa au saumon": [
    { name: "Quinoa", weight: 80 }, { name: "Saumon", weight: 150 }, { name: "Avocat", weight: 60 },
    { name: "Épinards", weight: 40 }, { name: "Graines de lin", weight: 10 }, { name: "Assaisonnement", weight: 30 },
  ],
  "Salade de lentilles méditerranéenne": [
    { name: "Lentilles", weight: 150 }, { name: "Tomates", weight: 80 }, { name: "Concombre", weight: 60 },
    { name: "Feta", weight: 30 }, { name: "Huile d'olive", weight: 15 }, { name: "Assaisonnement", weight: 15 },
  ],
  "Smoothie ménopause boost": [
    { name: "Lait", weight: 200 }, { name: "Banane", weight: 100 }, { name: "Graines de lin", weight: 15 },
    { name: "Tofu soyeux", weight: 50 }, { name: "Épinards", weight: 35 },
  ],
  "Poulet grillé aux brocolis": [
    { name: "Poulet", weight: 150 }, { name: "Brocoli", weight: 100 }, { name: "Riz complet", weight: 100 },
    { name: "Amandes", weight: 15 }, { name: "Assaisonnement", weight: 15 },
  ],
  "Tartine sardines-avocat": [
    { name: "Pain complet", weight: 80 }, { name: "Sardines", weight: 100 }, { name: "Avocat", weight: 60 },
    { name: "Citron", weight: 20 }, { name: "Assaisonnement", weight: 20 },
  ],
  "Soupe miso au tofu": [
    { name: "Bouillon miso", weight: 200 }, { name: "Tofu ferme", weight: 80 }, { name: "Algues wakame", weight: 10 },
    { name: "Oignon vert", weight: 30 }, { name: "Assaisonnement", weight: 30 },
  ],
};

// Nutrient-to-meal mapping for "combler mes manques"
const NUTRIENT_MEAL_MAP: Record<string, string[]> = {
  calcium: ["Smoothie ménopause boost", "Tartine sardines-avocat", "Salade de lentilles méditerranéenne"],
  vitamin_d: ["Bowl de quinoa au saumon", "Tartine sardines-avocat"],
  magnesium: ["Salade de lentilles méditerranéenne", "Bowl de quinoa au saumon", "Poulet grillé aux brocolis"],
  iron: ["Salade de lentilles méditerranéenne", "Soupe miso au tofu"],
  omega3: ["Bowl de quinoa au saumon", "Tartine sardines-avocat"],
  proteins: ["Bowl de quinoa au saumon", "Poulet grillé aux brocolis", "Tartine sardines-avocat"],
  phytoestrogens: ["Soupe miso au tofu", "Smoothie ménopause boost"],
};

interface NutrientGap {
  key: string;
  label: string;
  current: number;
  target: number;
  pct: number;
  unit: string;
}

function getNutrientBadges(meal: typeof MEAL_SUGGESTIONS[0], ratio: number) {
  const badges: { label: string }[] = [];
  const n = meal.nutrients;
  if (n.calcium * ratio >= DAILY_TARGETS.calcium * 0.15) badges.push({ label: "✓ Calcium" });
  if (n.vitamin_d * ratio >= DAILY_TARGETS.vitamin_d * 0.15) badges.push({ label: "✓ Vitamine D" });
  if (n.proteins * ratio >= 15) badges.push({ label: "✓ Protéines" });
  if (n.carbs * ratio >= 20) badges.push({ label: "✓ Glucides" });
  if (n.fats * ratio >= 8) badges.push({ label: "✓ Lipides" });
  const ings = meal.ingredients.join(" ").toLowerCase();
  if (ings.includes("saumon") || ings.includes("sardine") || ings.includes("lin")) badges.push({ label: "✓ Oméga-3" });
  if (ings.includes("tofu") || ings.includes("soja") || ings.includes("lin") || ings.includes("miso")) badges.push({ label: "✓ Phytoestrogènes" });
  if (ings.includes("épinards") || ings.includes("lentilles") || ings.includes("quinoa")) badges.push({ label: "✓ Magnésium" });
  if (ings.includes("lentilles") || ings.includes("épinards") || ings.includes("sardine")) badges.push({ label: "✓ Fer" });
  const seen = new Set<string>();
  return badges.filter((b) => { if (seen.has(b.label)) return false; seen.add(b.label); return true; });
}

function MealCard({ meal, portions, adjustPortion, getWeight, getDefaultWeight, gapsCovered }: {
  meal: typeof MEAL_SUGGESTIONS[0];
  portions: Record<string, number>;
  adjustPortion: (name: string, delta: number) => void;
  getWeight: (name: string) => number;
  getDefaultWeight: (name: string) => number;
  gapsCovered?: string[];
}) {
  const currentWeight = getWeight(meal.name);
  const defaultWeight = getDefaultWeight(meal.name);
  const ratio = currentWeight / defaultWeight;
  const badges = getNutrientBadges(meal, ratio);
  const ingBreakdown = INGREDIENT_WEIGHTS[meal.name] || [];

  return (
    <div className="bg-card rounded-2xl p-5 card-soft animate-fade-in">
      <div className="flex items-start gap-3 mb-2">
        <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
          <Leaf className="w-5 h-5 text-primary-foreground" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-foreground">{meal.name}</h3>
          <p className="text-xs text-muted-foreground">{meal.description}</p>
        </div>
      </div>

      {/* Gaps covered */}
      {gapsCovered && gapsCovered.length > 0 && (
        <div className="flex gap-1.5 mb-2 flex-wrap">
          {gapsCovered.map((g) => (
            <span key={g} className="text-[10px] px-2 py-0.5 rounded-full bg-warning/20 text-warning font-medium border border-warning/30">
              ↑ {g}
            </span>
          ))}
        </div>
      )}

      {/* Portion adjuster */}
      <div className="flex items-center justify-between bg-muted/50 rounded-lg px-3 py-2 mb-3">
        <span className="text-xs text-muted-foreground">1 portion • <span className="font-semibold text-foreground">{currentWeight}g</span></span>
        <div className="flex items-center gap-2">
          <button onClick={() => adjustPortion(meal.name, -10)} disabled={currentWeight <= 50} className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center disabled:opacity-30 transition-opacity">
            <Minus className="w-3.5 h-3.5 text-foreground" />
          </button>
          <button onClick={() => adjustPortion(meal.name, 10)} disabled={currentWeight >= 1000} className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center disabled:opacity-30 transition-opacity">
            <Plus className="w-3.5 h-3.5 text-foreground" />
          </button>
        </div>
      </div>

      {/* Ingredient breakdown */}
      {ingBreakdown.length > 0 && (
        <p className="text-[10px] text-muted-foreground mb-3 leading-relaxed">
          {ingBreakdown.map((ing, i) => (
            <span key={ing.name}>
              {ing.name} {Math.round(ing.weight * ratio)}g{i < ingBreakdown.length - 1 ? " • " : ""}
            </span>
          ))}
        </p>
      )}

      {/* Nutrient badges */}
      {badges.length > 0 && (
        <div className="flex gap-1.5 mb-3 flex-wrap">
          {badges.map((b) => (
            <span key={b.label} className="text-[10px] px-2 py-0.5 rounded-full bg-progress-high/20 text-progress-high font-medium border border-progress-high/30">
              {b.label}
            </span>
          ))}
        </div>
      )}

      <div className="grid grid-cols-5 gap-1 text-center">
        {[
          { label: "kcal", value: Math.round(meal.calories * ratio) },
          { label: "Prot", value: `${Math.round(meal.nutrients.proteins * ratio)}g` },
          { label: "Gluc", value: `${Math.round(meal.nutrients.carbs * ratio)}g` },
          { label: "Lip", value: `${Math.round(meal.nutrients.fats * ratio)}g` },
          { label: "Ca", value: `${Math.round(meal.nutrients.calcium * ratio)}mg` },
        ].map((n) => (
          <div key={n.label} className="bg-muted/50 rounded-lg py-1.5">
            <div className="text-xs font-bold text-foreground">{n.value}</div>
            <div className="text-[9px] text-muted-foreground">{n.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function RepasPage() {
  const [ingredients, setIngredients] = useState("");
  const [portions, setPortions] = useState<Record<string, number>>({});
  const { logs } = useFoodLogs();

  const inputList = ingredients.toLowerCase().split(",").map((s) => s.trim()).filter(Boolean);
  const suggestions = inputList.length > 0
    ? MEAL_SUGGESTIONS.filter((m) => m.ingredients.some((ing) => inputList.some((input) => ing.includes(input))))
    : MEAL_SUGGESTIONS;

  const getWeight = (name: string) => portions[name] ?? DEFAULT_WEIGHTS[name] ?? 350;
  const getDefaultWeight = (name: string) => DEFAULT_WEIGHTS[name] ?? 350;
  const adjustPortion = (name: string, delta: number) => {
    const current = getWeight(name);
    const next = Math.max(50, Math.min(1000, current + delta));
    setPortions((prev) => ({ ...prev, [name]: next }));
  };

  // Calculate today's nutrient gaps
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
        phytoestrogens: acc.phytoestrogens + (log.phytoestrogens || 0),
      }),
      { calories: 0, proteins: 0, calcium: 0, vitamin_d: 0, magnesium: 0, iron: 0, omega3: 0, phytoestrogens: 0 }
    );
  }, [logs]);

  const gaps: NutrientGap[] = useMemo(() => {
    const checks = [
      { key: "calcium", label: "Calcium", current: todayTotals.calcium, target: DAILY_TARGETS.calcium, unit: "mg" },
      { key: "vitamin_d", label: "Vitamine D", current: todayTotals.vitamin_d, target: DAILY_TARGETS.vitamin_d, unit: "µg" },
      { key: "magnesium", label: "Magnésium", current: todayTotals.magnesium, target: DAILY_TARGETS.magnesium, unit: "mg" },
      { key: "iron", label: "Fer", current: todayTotals.iron, target: DAILY_TARGETS.iron, unit: "mg" },
      { key: "omega3", label: "Oméga-3", current: todayTotals.omega3, target: DAILY_TARGETS.omega3, unit: "g" },
      { key: "proteins", label: "Protéines", current: todayTotals.proteins, target: DAILY_TARGETS.proteins, unit: "g" },
      { key: "phytoestrogens", label: "Phytoestrogènes", current: todayTotals.phytoestrogens, target: DAILY_TARGETS.phytoestrogens, unit: "mg" },
    ];
    return checks
      .map((c) => ({ ...c, pct: Math.round((c.current / c.target) * 100) }))
      .filter((c) => c.pct < 80)
      .sort((a, b) => a.pct - b.pct);
  }, [todayTotals]);

  // Get meals that cover the gaps
  const gapMeals = useMemo(() => {
    const mealNames = new Set<string>();
    const mealGaps: Record<string, string[]> = {};
    gaps.forEach((gap) => {
      const meals = NUTRIENT_MEAL_MAP[gap.key] || [];
      meals.forEach((name) => {
        mealNames.add(name);
        if (!mealGaps[name]) mealGaps[name] = [];
        mealGaps[name].push(gap.label);
      });
    });
    return MEAL_SUGGESTIONS.filter((m) => mealNames.has(m.name)).map((m) => ({
      meal: m,
      covers: mealGaps[m.name] || [],
    }));
  }, [gaps]);

  return (
    <div className="pb-24 px-4 pt-6 bg-background min-h-screen">
      <h1 className="text-2xl font-bold text-foreground mb-1">Suggestions de repas</h1>
      <p className="text-muted-foreground text-sm mb-4">Trouvez des idées adaptées à vos besoins</p>

      <Tabs defaultValue="ingredients" className="w-full">
        <TabsList className="w-full mb-4">
          <TabsTrigger value="ingredients" className="flex-1 text-xs">Par ingrédients</TabsTrigger>
          <TabsTrigger value="gaps" className="flex-1 text-xs">Combler mes manques</TabsTrigger>
        </TabsList>

        <TabsContent value="ingredients">
          <div className="relative mb-6">
            <ChefHat className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={ingredients}
              onChange={(e) => setIngredients(e.target.value)}
              placeholder="Vos ingrédients : saumon, quinoa..."
              className="pl-10 h-12 bg-card rounded-lg"
            />
          </div>
          <div className="space-y-3">
            {suggestions.map((meal) => (
              <MealCard key={meal.name} meal={meal} portions={portions} adjustPortion={adjustPortion} getWeight={getWeight} getDefaultWeight={getDefaultWeight} />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="gaps">
          {/* Show current gaps */}
          {gaps.length > 0 ? (
            <>
              <div className="bg-card rounded-2xl p-4 card-soft mb-4">
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle className="w-4 h-4 text-warning" />
                  <h3 className="text-sm font-semibold text-foreground">Vos manques aujourd'hui</h3>
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

              <h3 className="text-sm font-semibold text-foreground mb-3">Repas suggérés pour combler vos manques</h3>
              <div className="space-y-3">
                {gapMeals.map(({ meal, covers }) => (
                  <MealCard key={meal.name} meal={meal} portions={portions} adjustPortion={adjustPortion} getWeight={getWeight} getDefaultWeight={getDefaultWeight} gapsCovered={covers} />
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
      </Tabs>
    </div>
  );
}
