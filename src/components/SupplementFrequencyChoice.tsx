import { useId } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

export type SupplementFrequency = "quotidien" | "coche" | "etale";

export function parseCoveredDays(value: string): number | null {
  const days = Number(value);
  return Number.isInteger(days) && days >= 2 && days <= 120 ? days : null;
}

export function supplementFrequencySettings(frequency: SupplementFrequency, coveredDays: string) {
  const days = frequency === "etale" ? parseCoveredDays(coveredDays) : null;
  if (frequency === "etale" && days === null) return null;
  return { quotidien: frequency === "quotidien", periodicite_jours: days };
}

export default function SupplementFrequencyChoice({ frequency, onFrequencyChange, coveredDays, onCoveredDaysChange }: {
  frequency: SupplementFrequency;
  onFrequencyChange: (frequency: SupplementFrequency) => void;
  coveredDays: string;
  onCoveredDaysChange: (value: string) => void;
}) {
  const id = useId();
  return (
    <div className="space-y-2 pt-1">
      <p id={`${id}-label`} className="text-sm font-medium text-muted-foreground">Fréquence</p>
      <RadioGroup value={frequency} aria-labelledby={`${id}-label`} onValueChange={(value) => {
        if (value === "quotidien" || value === "coche" || value === "etale") onFrequencyChange(value);
      }}>
        {([
          ["quotidien", "Tous les jours (pré-coché)"],
          ["coche", "Je coche les jours de prise"],
          ["etale", "Une dose couvre plusieurs jours"],
        ] as const).map(([value, label]) => (
          <div key={value} className="flex items-center gap-2">
            <RadioGroupItem value={value} id={`${id}-${value}`} />
            <Label htmlFor={`${id}-${value}`} className="py-2 leading-normal">{label}</Label>
          </div>
        ))}
      </RadioGroup>
      {frequency === "etale" && (
        <div className="space-y-1 pl-6">
          <Label htmlFor={`${id}-days`}>Nombre de jours couverts</Label>
          <Input id={`${id}-days`} type="number" min={2} max={120} step={1} inputMode="numeric"
            value={coveredDays} onChange={(event) => onCoveredDaysChange(event.target.value)} className="w-24" />
        </div>
      )}
    </div>
  );
}