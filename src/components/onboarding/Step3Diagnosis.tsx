import { Button } from "@/components/ui/button";
import { SYMPTOM_OPTIONS, SymptomKey } from "@/lib/onboardingMessages";

const DURATIONS = [
  { value: "recent", label: "Récemment (moins de 6 mois)" },
  { value: "progressive", label: "Progressivement (6 mois à 2 ans)" },
  { value: "installed", label: "C'est installé depuis un moment" },
];

export default function Step3Diagnosis({
  duration,
  setDuration,
  symptom,
  setSymptom,
  onNext,
}: {
  duration: string;
  setDuration: (v: string) => void;
  symptom: SymptomKey | "";
  setSymptom: (v: SymptomKey) => void;
  onNext: () => void;
}) {
  return (
    <div className="flex-1 flex flex-col max-w-md mx-auto w-full">
      <h2 className="text-2xl font-bold text-foreground mb-1">Deux questions rapides</h2>
      <p className="text-sm text-muted-foreground mb-6">Moins de 20 secondes</p>

      <div className="mb-6">
        <p className="font-medium text-foreground mb-3">
          Depuis quand ressens-tu ces changements&nbsp;?
        </p>
        <div className="space-y-2">
          {DURATIONS.map((d) => (
            <button
              key={d.value}
              onClick={() => setDuration(d.value)}
              className={`w-full text-left p-3.5 rounded-xl border-2 transition-all ${
                duration === d.value
                  ? "border-primary bg-primary/10"
                  : "border-border bg-card hover:border-primary/40"
              }`}
            >
              {d.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1">
        <p className="font-medium text-foreground mb-3">
          Quel symptôme te gêne le plus en ce moment&nbsp;?
        </p>
        <div className="flex flex-wrap gap-2">
          {SYMPTOM_OPTIONS.map((s) => (
            <button
              key={s.value}
              onClick={() => setSymptom(s.value)}
              className={`px-4 py-2 rounded-full border-2 text-sm transition-all ${
                symptom === s.value
                  ? "border-primary bg-primary/15 text-foreground font-medium"
                  : "border-border bg-card text-muted-foreground hover:border-primary/40"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <Button
        onClick={onNext}
        disabled={!duration || !symptom}
        className="w-full h-14 rounded-xl text-base font-semibold mt-6"
      >
        Continuer →
      </Button>
    </div>
  );
}
