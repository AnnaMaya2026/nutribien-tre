import { Button } from "@/components/ui/button";
import { REASSURANCE, SymptomKey } from "@/lib/onboardingMessages";
import { PREVENTIVE_STATEMENTS } from "./Step2Mirror";

const PREVENTIVE_MESSAGE =
  "Tu es au bon endroit.\n\nÀ partir de 45 ans, les besoins nutritionnels de ton corps changent silencieusement — bien avant que les symptômes apparaissent.\n\nCalcium, magnésium, vitamine D, oméga-3...\n\nNutriMéno t'aide à comprendre ce dont ton corps a vraiment besoin maintenant, pour rester en forme et pleine d'énergie.";

export default function Step4Truth({
  symptom,
  statements = [],
  onNext,
}: {
  symptom: SymptomKey;
  statements?: string[];
  onNext: () => void;
}) {
  const isPreventive =
    statements.length > 0 &&
    statements.every((s) => PREVENTIVE_STATEMENTS.includes(s));

  const text = isPreventive
    ? PREVENTIVE_MESSAGE
    : REASSURANCE[symptom] ?? REASSURANCE.autre;

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
