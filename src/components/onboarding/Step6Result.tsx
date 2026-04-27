import { Button } from "@/components/ui/button";
import { PRIORITY_NUTRIENTS, SymptomKey } from "@/lib/onboardingMessages";
import { calculateCalorieGoal } from "@/lib/calorieGoal";
import { Flame, Sparkles, LineChart } from "lucide-react";

export default function Step6Result({
  age,
  height,
  weight,
  activityLevel,
  symptom,
  onNext,
}: {
  age: number;
  height: number;
  weight: number;
  activityLevel?: string;
  symptom: SymptomKey;
  onNext: () => void;
}) {
  const calories = calculateCalorieGoal({ age, weight, height, activityLevel });
  const nutrients = PRIORITY_NUTRIENTS[symptom] ?? PRIORITY_NUTRIENTS.autre;

  return (
    <div className="flex-1 flex flex-col max-w-md mx-auto w-full">
      <h2 className="text-2xl font-bold text-foreground mb-6 leading-snug">
        Voici ce que NutriMéno a préparé pour toi
      </h2>

      <div className="space-y-4 flex-1">
        <div className="bg-card rounded-2xl p-5 border border-border flex gap-4 items-center">
          <div className="w-12 h-12 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
            <Flame className="w-6 h-6 text-pink-deep" />
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">
              Objectif calorique estimé
            </p>
            <p className="text-2xl font-bold text-foreground">{calories} kcal/jour</p>
          </div>
        </div>

        <div className="bg-card rounded-2xl p-5 border border-border flex gap-4 items-center">
          <div className="w-12 h-12 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
            <Sparkles className="w-6 h-6 text-pink-deep" />
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">
              Tes priorités nutritionnelles
            </p>
            <p className="text-base font-semibold text-foreground">{nutrients}</p>
          </div>
        </div>

        <div className="bg-primary/10 rounded-2xl p-5 border border-primary/20 flex gap-4 items-center">
          <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
            <LineChart className="w-6 h-6 text-pink-deep" />
          </div>
          <p className="text-base font-medium text-foreground leading-snug">
            NutriMéno va suivre ces nutriments pour toi chaque jour 📊
          </p>
        </div>
      </div>

      <Button
        onClick={onNext}
        className="w-full h-14 rounded-xl text-base font-semibold mt-6"
      >
        Voir mon premier aperçu
      </Button>
      <p className="text-xs text-center text-muted-foreground mt-3">
        Pas de carte bancaire requise. 7 jours gratuits pour explorer.
      </p>
    </div>
  );
}
