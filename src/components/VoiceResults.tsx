import { useState } from "react";
import { Plus, Minus, Check, X } from "lucide-react";
import { scaleCiqual } from "@/lib/ciqual";
import { formatPortion, formatStandardPortionHint, getPortionStep, getPortionUnit } from "@/lib/portionUnits";
import type { VoiceMatch } from "./VoiceInput";

interface VoiceResultsProps {
  matches: VoiceMatch[];
  mealType: string;
  onConfirm: (items: VoiceMatch[]) => void;
  onCancel: () => void;
}

export default function VoiceResults({ matches, mealType, onConfirm, onCancel }: VoiceResultsProps) {
  const [items, setItems] = useState<VoiceMatch[]>(matches);

  const updateGrams = (index: number, grams: number) => {
    setItems((prev) =>
      prev.map((item, i) =>
        i === index
          ? { ...item, grams, scaled: scaleCiqual(item.food, grams) }
          : item
      )
    );
  };

  const removeItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  if (items.length === 0) {
    onCancel();
    return null;
  }

  return (
    <div className="bg-card rounded-2xl p-4 card-soft mb-4 animate-fade-in space-y-3">
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-sm font-semibold text-foreground">🎤 Aliments reconnus</h3>
        <button onClick={onCancel} className="text-muted-foreground">
          <X className="w-4 h-4" />
        </button>
      </div>

      {items.map((item, idx) => (
        <div key={idx} className="bg-muted/30 rounded-xl p-3 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="font-medium text-sm text-foreground line-clamp-1">{item.food.nom}</div>
              <div className="text-xs text-muted-foreground">
                {item.scaled.calories} kcal · {item.scaled.proteins}g prot · {item.scaled.carbs}g gluc
              </div>
            </div>
            <button onClick={() => removeItem(idx)} className="text-muted-foreground hover:text-destructive ml-2">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="flex items-center gap-2">
            {(() => {
              const unit = getPortionUnit(item.food.nom);
              const step = getPortionStep(item.food.nom);
              const presets = unit === "ml" ? [100, 150, 200, 250] : [50, 100, 150, 200];
              return <>
            <button
              onClick={() => updateGrams(idx, Math.max(10, item.grams - step))}
              className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center"
            >
              <Minus className="w-3 h-3" />
            </button>
            <span className="text-sm font-medium text-foreground w-14 text-center">{formatPortion(item.food.nom, item.grams)}</span>
            <button
              onClick={() => updateGrams(idx, Math.min(1000, item.grams + step))}
              className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center"
            >
              <Plus className="w-3 h-3" />
            </button>
            <div className="flex gap-1 ml-2">
              {presets.map((g) => (
                <button
                  key={g}
                  onClick={() => updateGrams(idx, g)}
                  className={`px-2 py-1 rounded text-[10px] font-medium ${
                    item.grams === g ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                  }`}
                >
                  {g}{unit}
                </button>
              ))}
            </div>
              </>;
            })()}
          </div>
          <p className="text-[11px] text-muted-foreground">{formatStandardPortionHint(item.food.nom)}</p>
        </div>
      ))}

      <button
        onClick={() => onConfirm(items)}
        className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-semibold flex items-center justify-center gap-2"
      >
        <Check className="w-4 h-4" /> Ajouter {items.length} aliment{items.length > 1 ? "s" : ""}
      </button>
    </div>
  );
}
