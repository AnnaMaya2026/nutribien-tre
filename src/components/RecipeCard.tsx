import { useState, useEffect } from "react";
import { searchCiqual, scaleCiqual, CiqualFood } from "@/lib/ciqual";
import { Recipe } from "@/lib/recipes";
import { ChefHat, Leaf, ChevronDown, ChevronUp, Clock, Flame, UtensilsCrossed } from "lucide-react";

interface ResolvedIngredient {
  name: string;
  grams: number;
  food: CiqualFood | null;
  scaled: ReturnType<typeof scaleCiqual> | null;
}

export function RecipeCard({ recipe }: { recipe: Recipe }) {
  const [portionMultiplier, setPortionMultiplier] = useState(1);
  const [expanded, setExpanded] = useState(false);
  const [resolvedIngredients, setResolvedIngredients] = useState<ResolvedIngredient[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    (async () => {
      const results = await Promise.all(
        recipe.ingredients.map(async (ing) => {
          try {
            const foods = await searchCiqual(ing.ciqualSearch);
            const food = foods.length > 0 ? foods[0] : null;
            return {
              name: ing.name,
              grams: ing.grams,
              food,
              scaled: food ? scaleCiqual(food, ing.grams) : null,
            };
          } catch {
            return { name: ing.name, grams: ing.grams, food: null, scaled: null };
          }
        })
      );
      if (!cancelled) {
        setResolvedIngredients(results);
        setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [recipe]);

  const totals = resolvedIngredients.reduce(
    (acc, ing) => {
      if (!ing.scaled) return acc;
      const m = portionMultiplier;
      return {
        calories: acc.calories + Math.round(ing.scaled.calories * m),
        proteins: acc.proteins + Math.round(ing.scaled.proteins * m),
        carbs: acc.carbs + Math.round(ing.scaled.carbs * m),
        fats: acc.fats + Math.round(ing.scaled.fats * m),
        fibres: acc.fibres + Math.round(ing.scaled.fibres * m),
        calcium: acc.calcium + Math.round(ing.scaled.calcium * m),
        vitamin_d: acc.vitamin_d + +(ing.scaled.vitamin_d * m).toFixed(1),
        magnesium: acc.magnesium + Math.round(ing.scaled.magnesium * m),
        iron: acc.iron + +(ing.scaled.iron * m).toFixed(1),
        omega3: acc.omega3 + +(ing.scaled.omega3 * m).toFixed(1),
      };
    },
    { calories: 0, proteins: 0, carbs: 0, fats: 0, fibres: 0, calcium: 0, vitamin_d: 0, magnesium: 0, iron: 0, omega3: 0 }
  );

  return (
    <div className="bg-card rounded-2xl p-4 card-soft animate-fade-in">
      <div className="flex items-start gap-3 mb-2">
        <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
          <ChefHat className="w-4 h-4 text-primary-foreground" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-sm text-foreground">{recipe.name}</h3>
          <p className="text-[10px] text-muted-foreground">{recipe.description}</p>
          <div className="flex items-center gap-3 mt-1 text-[10px] text-muted-foreground">
            <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> Préparation : {recipe.prepTime} min</span>
            {recipe.cookTime > 0 && (
              <span className="flex items-center gap-1"><Flame className="w-3 h-3" /> Cuisson : {recipe.cookTime} min</span>
            )}
          </div>
        </div>
      </div>

      {/* Menopause nutrient badges */}
      <div className="flex gap-1.5 mb-3 flex-wrap">
        {recipe.menopauseNutrients.map((n) => (
          <span key={n} className="text-[10px] px-2 py-0.5 rounded-full bg-primary/15 text-pink-deep font-medium border border-primary/25">
            {n}
          </span>
        ))}
      </div>

      {/* Portion multiplier */}
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xs text-muted-foreground">Portions :</span>
        <div className="flex gap-1">
          {[0.5, 1, 1.5, 2].map((m) => (
            <button
              key={m}
              onClick={() => setPortionMultiplier(m)}
              className={`px-2 py-1 rounded-md text-[10px] font-medium transition-all ${portionMultiplier === m ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
            >
              {m === 0.5 ? "½" : m === 1.5 ? "1½" : m}
            </button>
          ))}
        </div>
      </div>

      {/* Total macros */}
      {!loading && (
        <div className="grid grid-cols-5 gap-1 text-center mb-2">
          {[
            { label: "kcal", value: totals.calories },
            { label: "Prot", value: `${totals.proteins}g` },
            { label: "Gluc", value: `${totals.carbs}g` },
            { label: "Lip", value: `${totals.fats}g` },
            { label: "Fibres", value: `${totals.fibres}g` },
          ].map((n) => (
            <div key={n.label} className="bg-muted/50 rounded-lg py-1.5">
              <div className="text-xs font-bold text-foreground">{n.value}</div>
              <div className="text-[9px] text-muted-foreground">{n.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Micros */}
      {!loading && (
        <div className="grid grid-cols-3 gap-1 text-center mb-3">
          {[
            { label: "Calcium", value: totals.calcium, unit: "mg" },
            { label: "Magnésium", value: totals.magnesium, unit: "mg" },
            { label: "Fer", value: totals.iron, unit: "mg" },
            { label: "Vit. D", value: totals.vitamin_d, unit: "µg" },
            { label: "Oméga-3", value: totals.omega3, unit: "g" },
          ].map((n) => (
            <div key={n.label} className="bg-muted/30 rounded-lg py-1 px-1">
              <div className="text-[10px] font-semibold text-foreground">{n.value}{n.unit}</div>
              <div className="text-[9px] text-muted-foreground">{n.label}</div>
            </div>
          ))}
        </div>
      )}

      {loading && (
        <div className="text-center py-3 text-xs text-muted-foreground">Calcul nutritionnel...</div>
      )}

      {/* Expandable ingredients */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1 text-xs text-pink-deep font-medium w-full justify-center py-1"
      >
        {expanded ? "Masquer les ingrédients" : "Voir les ingrédients"}
        {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
      </button>

      {expanded && (
        <div className="mt-2 space-y-1.5">
          {resolvedIngredients.map((ing, i) => (
            <div key={i} className="flex items-center justify-between px-2 py-1.5 bg-muted/30 rounded-lg">
              <div className="flex items-center gap-2">
                <Leaf className="w-3 h-3 text-pink-deep/60" />
                <span className="text-xs text-foreground">{ing.name}</span>
              </div>
              <span className="text-[10px] text-muted-foreground font-medium">
                {Math.round(ing.grams * portionMultiplier)}g
                {ing.scaled && ` · ${Math.round(ing.scaled.calories * portionMultiplier)} kcal`}
              </span>
            </div>
          ))}

          {recipe.steps && recipe.steps.length > 0 && (
            <div className="mt-3 pt-3 border-t border-border">
              <div className="flex items-center gap-1.5 mb-2">
                <UtensilsCrossed className="w-3.5 h-3.5 text-pink-deep" />
                <h4 className="text-xs font-semibold text-foreground">Préparation</h4>
              </div>
              <ol className="space-y-1.5">
                {recipe.steps.map((step, i) => (
                  <li key={i} className="flex gap-2 text-[11px] text-foreground">
                    <span className="flex-shrink-0 w-4 h-4 rounded-full bg-primary/15 text-pink-deep font-semibold flex items-center justify-center text-[10px]">
                      {i + 1}
                    </span>
                    <span className="leading-relaxed">{step}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
