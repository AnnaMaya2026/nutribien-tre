import { useState } from "react";
import { MEAL_SUGGESTIONS, DAILY_TARGETS } from "@/lib/mockData";
import { ChefHat, Leaf, Minus, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";

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
    { name: "Quinoa", weight: 80 },
    { name: "Saumon", weight: 150 },
    { name: "Avocat", weight: 60 },
    { name: "Épinards", weight: 40 },
    { name: "Graines de lin", weight: 10 },
    { name: "Assaisonnement", weight: 30 },
  ],
  "Salade de lentilles méditerranéenne": [
    { name: "Lentilles", weight: 150 },
    { name: "Tomates", weight: 80 },
    { name: "Concombre", weight: 60 },
    { name: "Feta", weight: 30 },
    { name: "Huile d'olive", weight: 15 },
    { name: "Assaisonnement", weight: 15 },
  ],
  "Smoothie ménopause boost": [
    { name: "Lait", weight: 200 },
    { name: "Banane", weight: 100 },
    { name: "Graines de lin", weight: 15 },
    { name: "Tofu soyeux", weight: 50 },
    { name: "Épinards", weight: 35 },
  ],
  "Poulet grillé aux brocolis": [
    { name: "Poulet", weight: 150 },
    { name: "Brocoli", weight: 100 },
    { name: "Riz complet", weight: 100 },
    { name: "Amandes", weight: 15 },
    { name: "Assaisonnement", weight: 15 },
  ],
  "Tartine sardines-avocat": [
    { name: "Pain complet", weight: 80 },
    { name: "Sardines", weight: 100 },
    { name: "Avocat", weight: 60 },
    { name: "Citron", weight: 20 },
    { name: "Assaisonnement", weight: 20 },
  ],
  "Soupe miso au tofu": [
    { name: "Bouillon miso", weight: 200 },
    { name: "Tofu ferme", weight: 80 },
    { name: "Algues wakame", weight: 10 },
    { name: "Oignon vert", weight: 30 },
    { name: "Assaisonnement", weight: 30 },
  ],
};

function getNutrientBadges(meal: typeof MEAL_SUGGESTIONS[0], ratio: number) {
  const badges: { label: string }[] = [];
  const n = meal.nutrients;

  if (n.calcium * ratio >= DAILY_TARGETS.calcium * 0.15) badges.push({ label: "✓ Calcium" });
  if (n.vitamin_d * ratio >= DAILY_TARGETS.vitamin_d * 0.15) badges.push({ label: "✓ Vitamine D" });
  if (n.proteins * ratio >= 15) badges.push({ label: "✓ Protéines" });
  if (n.carbs * ratio >= 20) badges.push({ label: "✓ Glucides" });
  if (n.fats * ratio >= 8) badges.push({ label: "✓ Lipides" });

  const ings = meal.ingredients.join(" ").toLowerCase();
  if (ings.includes("saumon") || ings.includes("sardine") || ings.includes("lin"))
    badges.push({ label: "✓ Oméga-3" });
  if (ings.includes("tofu") || ings.includes("soja") || ings.includes("lin") || ings.includes("miso"))
    badges.push({ label: "✓ Phytoestrogènes" });
  if (ings.includes("épinards") || ings.includes("lentilles") || ings.includes("quinoa"))
    badges.push({ label: "✓ Magnésium" });
  if (ings.includes("lentilles") || ings.includes("épinards") || ings.includes("sardine"))
    badges.push({ label: "✓ Fer" });

  const seen = new Set<string>();
  return badges.filter((b) => {
    if (seen.has(b.label)) return false;
    seen.add(b.label);
    return true;
  });
}

export default function RepasPage() {
  const [ingredients, setIngredients] = useState("");
  const [portions, setPortions] = useState<Record<string, number>>({});

  const inputList = ingredients.toLowerCase().split(",").map((s) => s.trim()).filter(Boolean);

  const suggestions = inputList.length > 0
    ? MEAL_SUGGESTIONS.filter((m) =>
        m.ingredients.some((ing) => inputList.some((input) => ing.includes(input)))
      )
    : MEAL_SUGGESTIONS;

  const getWeight = (name: string) => portions[name] ?? DEFAULT_WEIGHTS[name] ?? 350;
  const getDefaultWeight = (name: string) => DEFAULT_WEIGHTS[name] ?? 350;

  const adjustPortion = (name: string, delta: number) => {
    const current = getWeight(name);
    const next = Math.max(50, Math.min(1000, current + delta));
    setPortions((prev) => ({ ...prev, [name]: next }));
  };

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
          const currentWeight = getWeight(meal.name);
          const defaultWeight = getDefaultWeight(meal.name);
          const ratio = currentWeight / defaultWeight;
          const badges = getNutrientBadges(meal, ratio);
          const ingBreakdown = INGREDIENT_WEIGHTS[meal.name] || [];

          return (
            <div key={meal.name} className="bg-card rounded-2xl p-5 card-soft animate-fade-in">
              <div className="flex items-start gap-3 mb-2">
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                  <Leaf className="w-5 h-5 text-primary-foreground" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-foreground">{meal.name}</h3>
                  <p className="text-xs text-muted-foreground">{meal.description}</p>
                </div>
              </div>

              {/* Portion adjuster */}
              <div className="flex items-center justify-between bg-muted/50 rounded-lg px-3 py-2 mb-3">
                <span className="text-xs text-muted-foreground">1 portion • <span className="font-semibold text-foreground">{currentWeight}g</span></span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => adjustPortion(meal.name, -10)}
                    disabled={currentWeight <= 50}
                    className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center disabled:opacity-30 transition-opacity"
                  >
                    <Minus className="w-3.5 h-3.5 text-foreground" />
                  </button>
                  <button
                    onClick={() => adjustPortion(meal.name, 10)}
                    disabled={currentWeight >= 1000}
                    className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center disabled:opacity-30 transition-opacity"
                  >
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
        })}
      </div>
    </div>
  );
}
