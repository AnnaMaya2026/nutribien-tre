import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function Step5Data({
  age,
  setAge,
  height,
  setHeight,
  weight,
  setWeight,
  onNext,
}: {
  age: string;
  setAge: (v: string) => void;
  height: string;
  setHeight: (v: string) => void;
  weight: string;
  setWeight: (v: string) => void;
  onNext: () => void;
}) {
  const valid = Number(age) > 0 && Number(height) > 0 && Number(weight) > 0;

  return (
    <div className="flex-1 flex flex-col max-w-md mx-auto w-full">
      <h2 className="text-2xl font-bold text-foreground mb-2 leading-snug">
        Pour te donner une lecture fiable, on va affiner quelques paramètres
      </h2>
      <p className="text-sm italic text-muted-foreground mb-8">
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
            inputMode="numeric"
            placeholder="65"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            className="h-12 bg-card text-base"
          />
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
