import { useState } from "react";
import { X, Check, Minus, Plus } from "lucide-react";
import { scaleCiqual, CiqualFood } from "@/lib/ciqual";
import type { VoiceCandidate } from "./VoiceInput";
import type { VoiceMatch } from "./VoiceInput";

interface Props {
  candidates: VoiceCandidate[];
  onDone: (matches: VoiceMatch[]) => void;
  onCancel: () => void;
}

export default function VoiceCandidatePicker({ candidates, onDone, onCancel }: Props) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selected, setSelected] = useState<VoiceMatch[]>([]);
  const [grams, setGrams] = useState(candidates[0]?.grams || 100);

  const current = candidates[currentIndex];
  if (!current) return null;

  const handleSelect = (food: CiqualFood) => {
    const match: VoiceMatch = { food, grams, scaled: scaleCiqual(food, grams) };
    const newSelected = [...selected, match];

    if (currentIndex < candidates.length - 1) {
      const nextGrams = candidates[currentIndex + 1].grams;
      setGrams(nextGrams);
      setCurrentIndex(currentIndex + 1);
      setSelected(newSelected);
    } else {
      onDone(newSelected);
    }
  };

  return (
    <div className="bg-card rounded-2xl p-4 card-soft mb-4 animate-fade-in">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-foreground">
          🎤 Quel type de « {current.name} » ?
        </h3>
        <button onClick={onCancel} className="text-muted-foreground">
          <X className="w-4 h-4" />
        </button>
      </div>

      {candidates.length > 1 && (
        <p className="text-[10px] text-muted-foreground mb-2">
          Aliment {currentIndex + 1} / {candidates.length}
        </p>
      )}

      {/* Grams adjuster */}
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xs text-muted-foreground">Quantité :</span>
        <button
          onClick={() => setGrams((g) => Math.max(10, g - 10))}
          className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center"
        >
          <Minus className="w-3 h-3" />
        </button>
        <span className="text-sm font-medium text-foreground w-14 text-center">{grams}g</span>
        <button
          onClick={() => setGrams((g) => Math.min(1000, g + 10))}
          className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center"
        >
          <Plus className="w-3 h-3" />
        </button>
      </div>

      {/* Candidates list */}
      <div className="space-y-1.5 max-h-72 overflow-y-auto">
        {current.candidates.map((food) => (
          <button
            key={food.id}
            onClick={() => handleSelect(food)}
            className="w-full text-left px-3 py-2.5 rounded-xl bg-muted/30 hover:bg-muted/60 transition-colors"
          >
            <div className="font-medium text-sm text-foreground line-clamp-1">{food.nom}</div>
            {food.groupe && (
              <div className="text-[10px] text-primary/70 line-clamp-1">{food.groupe}</div>
            )}
            <div className="text-xs text-muted-foreground">
              {food.calories_100g} kcal / 100g
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
