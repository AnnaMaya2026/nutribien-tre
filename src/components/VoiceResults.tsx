import { useState } from "react";
import { Plus, Minus, Check, X, ChevronRight } from "lucide-react";
import { scaleCiqual } from "@/lib/ciqual";
import type { VoiceMatch } from "./VoiceInput";
import type { VoiceParsedItem } from "./VoiceInput";

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
            <button
              onClick={() => updateGrams(idx, Math.max(10, item.grams - 10))}
              className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center"
            >
              <Minus className="w-3 h-3" />
            </button>
            <span className="text-sm font-medium text-foreground w-14 text-center">{item.grams}g</span>
            <button
              onClick={() => updateGrams(idx, Math.min(1000, item.grams + 10))}
              className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center"
            >
              <Plus className="w-3 h-3" />
            </button>
            <div className="flex gap-1 ml-2">
              {[50, 100, 150, 200].map((g) => (
                <button
                  key={g}
                  onClick={() => updateGrams(idx, g)}
                  className={`px-2 py-1 rounded text-[10px] font-medium ${
                    item.grams === g ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                  }`}
                >
                  {g}g
                </button>
              ))}
            </div>
          </div>
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

/** Selection screen when multiple candidates exist per food item */
interface VoiceCandidatePickerProps {
  parsedItems: VoiceParsedItem[];
  onDone: (matches: VoiceMatch[]) => void;
  onCancel: () => void;
}

export function VoiceCandidatePicker({ parsedItems, onDone, onCancel }: VoiceCandidatePickerProps) {
  // Track which step we're on: picking food for each parsed item, then adjusting portions
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selected, setSelected] = useState<VoiceMatch[]>([]);

  const currentItem = parsedItems[currentIndex];

  const handleSelect = (candidateIdx: number) => {
    const food = currentItem.candidates[candidateIdx].food;
    const grams = currentItem.grams;
    const newMatch: VoiceMatch = { food, grams, scaled: scaleCiqual(food, grams) };
    const newSelected = [...selected, newMatch];

    if (currentIndex < parsedItems.length - 1) {
      setSelected(newSelected);
      setCurrentIndex(currentIndex + 1);
    } else {
      // All items selected, go to confirmation
      onDone(newSelected);
    }
  };

  if (!currentItem) {
    onCancel();
    return null;
  }

  return (
    <div className="bg-card rounded-2xl p-4 card-soft mb-4 animate-fade-in space-y-3">
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-sm font-semibold text-foreground">
          🎤 Quel type de « {currentItem.originalName} » ?
        </h3>
        <button onClick={onCancel} className="text-muted-foreground">
          <X className="w-4 h-4" />
        </button>
      </div>

      {parsedItems.length > 1 && (
        <div className="text-xs text-muted-foreground">
          Aliment {currentIndex + 1} sur {parsedItems.length}
        </div>
      )}

      <div className="space-y-1.5 max-h-72 overflow-y-auto">
        {currentItem.candidates.map((c, idx) => (
          <button
            key={c.food.id}
            onClick={() => handleSelect(idx)}
            className="w-full text-left px-3 py-2.5 rounded-xl bg-muted/30 hover:bg-muted/60 transition-colors flex items-center gap-3"
          >
            <div className="flex-1 min-w-0">
              <div className="font-medium text-sm text-foreground line-clamp-1">{c.food.nom}</div>
              {c.food.groupe && (
                <div className="text-[10px] text-muted-foreground line-clamp-1">{c.food.groupe}</div>
              )}
              <div className="text-xs text-primary font-medium">
                {c.food.calories_100g} kcal / 100g
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
          </button>
        ))}
      </div>

      {selected.length > 0 && (
        <div className="text-xs text-muted-foreground pt-1 border-t border-border">
          {selected.length} aliment{selected.length > 1 ? "s" : ""} déjà sélectionné{selected.length > 1 ? "s" : ""}
        </div>
      )}
    </div>
  );
}
