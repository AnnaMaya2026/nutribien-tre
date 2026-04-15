import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

interface Props {
  scaled: {
    calories: number;
    proteins: number;
    carbs: number;
    fats: number;
    fibres: number;
    calcium: number;
    vitamin_d: number;
    magnesium: number;
    iron: number;
    omega3: number;
    vitamin_b12: number;
    phytoestrogens: number;
  };
}

function fmt(v: number | null | undefined): string {
  if (v === null || v === undefined || v === 0) return "N/A";
  return String(v);
}

function Section({ title, items, defaultOpen = true }: { title: string; items: { label: string; value: string; unit: string }[]; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-border/50 rounded-xl overflow-hidden">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between px-3 py-2 bg-muted/30">
        <span className="text-xs font-semibold text-foreground">{title}</span>
        {open ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />}
      </button>
      {open && (
        <div className="px-3 py-2 space-y-1">
          {items.map((item) => (
            <div key={item.label} className="flex justify-between text-xs">
              <span className="text-muted-foreground">{item.label}</span>
              <span className={`font-medium ${item.value === "N/A" ? "text-muted-foreground/50" : "text-foreground"}`}>
                {item.value}{item.value !== "N/A" ? ` ${item.unit}` : ""}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function NutrientDetailSections({ scaled }: Props) {
  const macros = [
    { label: "Calories", value: fmt(scaled.calories), unit: "kcal" },
    { label: "Protéines", value: fmt(scaled.proteins), unit: "g" },
    { label: "Glucides", value: fmt(scaled.carbs), unit: "g" },
    { label: "Lipides", value: fmt(scaled.fats), unit: "g" },
    { label: "Fibres", value: fmt(scaled.fibres), unit: "g" },
  ];

  const minerals = [
    { label: "Calcium", value: fmt(scaled.calcium), unit: "mg" },
    { label: "Fer", value: fmt(scaled.iron), unit: "mg" },
    { label: "Magnésium", value: fmt(scaled.magnesium), unit: "mg" },
  ];

  const vitamins = [
    { label: "Vitamine D", value: fmt(scaled.vitamin_d), unit: "µg" },
    { label: "Vitamine B12", value: fmt(scaled.vitamin_b12), unit: "µg" },
    { label: "Oméga-3", value: fmt(scaled.omega3), unit: "g" },
    { label: "Phytoestrogènes", value: fmt(scaled.phytoestrogens), unit: "mg" },
  ];

  return (
    <div className="space-y-2 mb-4">
      <Section title="Macronutriments" items={macros} defaultOpen={true} />
      <Section title="Minéraux" items={minerals} defaultOpen={false} />
      <Section title="Vitamines & autres" items={vitamins} defaultOpen={false} />
    </div>
  );
}
