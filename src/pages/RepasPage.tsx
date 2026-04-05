import { useState } from "react";
import { MEAL_SUGGESTIONS } from "@/lib/mockData";
import { ChefHat, Leaf } from "lucide-react";
import { Input } from "@/components/ui/input";

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
        {suggestions.map((meal) => (
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
        ))}
      </div>
    </div>
  );
}
