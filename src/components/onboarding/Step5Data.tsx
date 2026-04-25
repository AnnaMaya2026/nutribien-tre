import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const ACTIVITY_OPTIONS = [
  { value: "sedentaire", emoji: "🛋️", label: "Sédentaire", description: "Peu ou pas d'exercice" },
  { value: "leger", emoji: "🚶", label: "Légèrement active", description: "Exercice léger 1-3 fois/semaine" },
  { value: "modere", emoji: "🏃", label: "Modérément active", description: "Exercice modéré 3-5 fois/semaine" },
  { value: "actif", emoji: "💪", label: "Très active", description: "Exercice intense 6-7 fois/semaine" },
] as const;

export default function Step5Data({
  age,
  setAge,
  height,
  setHeight,
  weight,
  setWeight,
  activityLevel,
  setActivityLevel,
  onNext,
}: {
  age: string;
  setAge: (v: string) => void;
  height: string;
  setHeight: (v: string) => void;
  weight: string;
  setWeight: (v: string) => void;
  activityLevel: string;
  setActivityLevel: (v: string) => void;
  onNext: () => void;
}) {
  const valid =
    Number(age) > 0 &&
    Number(height) > 0 &&
    Number(weight) > 0 &&
    !!activityLevel;

  return (
    <div className="flex-1 flex flex-col max-w-md mx-auto w-full">
      <h2 className="text-2xl font-bold text-foreground mb-2 leading-snug">
        Pour te donner une lecture fiable, on va affiner quelques paramètres
      </h2>
      <p className="text-sm italic text-muted-foreground mb-6">
        Ces données restent privées et servent uniquement à personnaliser tes besoins
        nutritionnels.
      </p>

      <div className="space-y-5 flex-1">
        <div>
          <label className="text-sm font-medium text-foreground mb-1.5 block">Ton âge</label>
          <Input
            type="number"
            inputMode="numeric"
            placeholder="52"
            value={age}
            onChange={(e) => setAge(e.target.value)}
            className="h-12 bg-card text-base"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-foreground mb-1.5 block">
            Ta taille (cm)
          </label>
          <Input
            type="number"
            inputMode="numeric"
            placeholder="165"
            value={height}
            onChange={(e) => setHeight(e.target.value)}
            className="h-12 bg-card text-base"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-foreground mb-1.5 block">
            Ton poids (kg)
          </label>
          <Input
            type="number"
            inputMode="decimal"
            step="0.1"
            placeholder="65"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            className="h-12 bg-card text-base"
          />
        </div>

        <div>
          <label className="text-sm font-medium text-foreground mb-2 block">
            Quel est ton niveau d'activité physique ?
          </label>
          <div className="grid grid-cols-1 gap-2">
            {ACTIVITY_OPTIONS.map((opt) => {
              const selected = activityLevel === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setActivityLevel(opt.value)}
                  className={`flex items-center gap-3 p-3 rounded-xl text-left transition-all border ${
                    selected
                      ? "bg-primary/15 border-primary"
                      : "bg-card border-border hover:border-primary/50"
                  }`}
                >
                  <span className="text-2xl shrink-0">{opt.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-foreground">{opt.label}</div>
                    <div className="text-xs text-muted-foreground">{opt.description}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <Button
        onClick={onNext}
        disabled={!valid}
        className="w-full h-14 rounded-xl text-base font-semibold mt-6"
      >
        Calculer mes besoins →
      </Button>
    </div>
  );
}
