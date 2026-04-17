import { Button } from "@/components/ui/button";
import { REASSURANCE, SymptomKey } from "@/lib/onboardingMessages";

export default function Step4Truth({
  symptom,
  onNext,
}: {
  symptom: SymptomKey;
  onNext: () => void;
}) {
  const text = REASSURANCE[symptom] ?? REASSURANCE.autre;

  return (
    <div className="flex-1 flex flex-col justify-center max-w-md mx-auto w-full">
      <div className="bg-card border border-primary/20 rounded-2xl p-6 mb-6 shadow-sm">
        {text.split("\n\n").map((para, i) => (
          <p
            key={i}
            className={`text-foreground leading-relaxed ${
              i === 0 ? "text-lg font-semibold mb-3" : "mb-3 last:mb-0"
            }`}
          >
            {para}
          </p>
        ))}
      </div>

      <p className="text-xs italic text-muted-foreground text-center mb-6">
        ⚠️ NutriMéno ne remplace pas un suivi médical.
      </p>

      <Button onClick={onNext} className="w-full h-14 rounded-xl text-base font-semibold">
        Je veux voir comment ça marche →
      </Button>
    </div>
  );
}
