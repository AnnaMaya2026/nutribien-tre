import { useState } from "react";
import { MEAL_SUGGESTIONS, DAILY_TARGETS } from "@/lib/mockData";
import { ChefHat, Leaf } from "lucide-react";
import { Input } from "@/components/ui/input";

function getNutrientBadges(meal: typeof MEAL_SUGGESTIONS[0]) {
  const badges: { label: string; covered: boolean }[] = [];
  const { nutrients, calories } = meal;

  if (nutrients.calcium >= DAILY_TARGETS.calcium * 0.15) badges.push({ label: "✓ Calcium", covered: true });
  if (nutrients.vitamin_d >= DAILY_TARGETS.vitamin_d * 0.15) badges.push({ label: "✓ Vitamine D", covered: true });
  if (nutrients.proteins >= 15) badges.push({ label: "✓ Protéines", covered: true });
  if (nutrients.carbs >= 20) badges.push({ label: "✓ Glucides", covered: true });
  if (nutrients.fats >= 8) badges.push({ label: "✓ Lipides", covered: true });

  // Check ingredient-based nutrients
  const ings = meal.ingredients.join(" ").toLowerCase();
  if (ings.includes("saumon") || ings.includes("sardine") || ings.includes("lin"))
    badges.push({ label: "✓ Oméga-3", covered: true });
  if (ings.includes("tofu") || ings.includes("soja") || ings.includes("lin") || ings.includes("miso"))
    badges.push({ label: "✓ Phytoestrogènes", covered: true });
  if (ings.includes("épinards") || ings.includes("lentilles") || ings.includes("quinoa"))
    badges.push({ label: "✓ Magnésium", covered: true });
  if (ings.includes("lentilles") || ings.includes("épinards") || ings.includes("sardine"))
    badges.push({ label: "✓ Fer", covered: true });

  // deduplicate
  const seen = new Set<string>();
  return badges.filter((b) => {
    if (seen.has(b.label)) return false;
    seen.add(b.label);
    return true;
  });
}

export default function RepasPage() {
  const [ingredients, setIngredients] = useState("");

  const inputList = ingredients.toLowerCase().split(",").map((s) => s.trim()).filter(Boolean);

  const suggestions = inputList.length > 0
    ? MEAL_SUGGESTIONS.filter((m) =>
        m.ingredients.some((ing) => inputList.some((input) => ing.includes(input)))
      )
    : MEAL_SUGGESTIONS;

  return (
    <div className="pb-24 px-4 pt-6 bg-background min-h-screen">
      <h1 className="text-2xl font-bold text-foreground mb-1">Suggestions de repas</h1>
      <p className="text-muted-foreground text-sm mb-4">Trouvez des idées adaptées à vos besoins</p>

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
        {suggestions.map((meal) => {
          const badges = getNutrientBadges(meal);
          return (
            <div key={meal.name} className="bg-card rounded-2xl p-5 card-soft animate-fade-in">
              <div className="flex items-start gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                  <Leaf className="w-5 h-5 text-primary-foreground" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">{meal.name}</h3>
                  <p className="text-xs text-muted-foreground">{meal.description}</p>
                </div>
              </div>

              <div className="flex gap-2 mb-3 flex-wrap">
                {meal.ingredients.map((ing) => (
                  <span key={ing} className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                    {ing}
                  </span>
                ))}
              </div>

              {/* Nutrient coverage badges */}
              {badges.length > 0 && (
                <div className="flex gap-1.5 mb-3 flex-wrap">
                  {badges.map((b) => (
                    <span
                      key={b.label}
                      className="text-[10px] px-2 py-0.5 rounded-full bg-progress-high/20 text-progress-high font-medium border border-progress-high/30"
                    >
                      {b.label}
                    </span>
                  ))}
                </div>
              )}

              <div className="grid grid-cols-5 gap-1 text-center">
                {[
                  { label: "kcal", value: meal.calories },
                  { label: "Prot", value: `${meal.nutrients.proteins}g` },
                  { label: "Gluc", value: `${meal.nutrients.carbs}g` },
                  { label: "Lip", value: `${meal.nutrients.fats}g` },
                  { label: "Ca", value: `${meal.nutrients.calcium}mg` },
                ].map((n) => (
                  <div key={n.label} className="bg-muted/50 rounded-lg py-1.5">
                    <div className="text-xs font-bold text-foreground">{n.value}</div>
                    <div className="text-[9px] text-muted-foreground">{n.label}</div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
