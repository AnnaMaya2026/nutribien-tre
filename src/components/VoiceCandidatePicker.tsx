import { useState } from "react";
import { X, Minus, Plus, ChevronRight, RotateCcw } from "lucide-react";
import { scaleCiqual, CiqualFood } from "@/lib/ciqual";
import { formatPortion, getDefaultPortion, getPortionStep, getPortionUnit } from "@/lib/portionUnits";
import type { VoiceCandidate } from "./VoiceInput";
import type { VoiceMatch } from "./VoiceInput";

interface Props {
  candidates: VoiceCandidate[];
  onDone: (matches: VoiceMatch[]) => void;
  onCancel: () => void;
  onRestart?: () => void;
}

export default function VoiceCandidatePicker({ candidates, onDone, onCancel, onRestart }: Props) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selected, setSelected] = useState<VoiceMatch[]>([]);
  const [pickedFood, setPickedFood] = useState<CiqualFood | null>(null);
  const [grams, setGrams] = useState(candidates[0]?.grams || 100);

  const current = candidates[currentIndex];
  if (!current) return null;

  const handlePick = (food: CiqualFood) => {
    setPickedFood(food);
    setGrams(current.grams || getDefaultPortion(food.nom));
  };

  const handleConfirm = () => {
    if (!pickedFood) return;
    const match: VoiceMatch = { food: pickedFood, grams, scaled: scaleCiqual(pickedFood, grams) };
    const newSelected = [...selected, match];

    if (currentIndex < candidates.length - 1) {
      setPickedFood(null);
      setGrams(candidates[currentIndex + 1].grams || 100);
      setCurrentIndex(currentIndex + 1);
      setSelected(newSelected);
    } else {
      onDone(newSelected);
    }
  };

  return (
    <div className="bg-card rounded-2xl p-4 card-soft mb-4 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
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

      {!pickedFood ? (
        <>
          {/* Instruction */}
          <p className="text-xs text-pink-deep font-medium mb-3">
            👆 Appuyez sur l'aliment correspondant
          </p>

          {/* Candidates list */}
          <div className="space-y-1.5 max-h-60 overflow-y-auto mb-3">
            {current.candidates.map((food) => (
              <button
                key={food.id}
                onClick={() => handlePick(food)}
                className="w-full text-left px-4 py-3.5 rounded-xl bg-muted/30 hover:bg-primary/10 hover:border-primary/40 border border-transparent active:bg-primary/15 transition-all flex items-center gap-2"
              >
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm text-foreground line-clamp-1">{food.nom}</div>
                  {food.groupe && (
                    <div className="text-[10px] text-pink-deep/70 line-clamp-1">{food.groupe}</div>
                  )}
                  <div className="text-xs text-muted-foreground">
                    {food.calories_100g} kcal / 100{getPortionUnit(food.nom)}
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
              </button>
            ))}
          </div>

          {/* Restart button at bottom */}
          {onRestart && (
            <div className="space-y-1">
              <button
                onClick={onRestart}
                className="w-full py-3 rounded-xl bg-primary/10 hover:bg-primary/20 text-pink-deep font-semibold text-sm flex items-center justify-center gap-2 transition-all border border-primary/20"
              >
                <RotateCcw className="w-4 h-4" />
                🎤 Recommencer la recherche vocale
              </button>
              <p className="text-[10px] text-muted-foreground text-center italic">
                Si votre aliment n'est pas dans la liste
              </p>
            </div>
          )}
        </>
      ) : (
        <>
          {/* Selected food + portion adjuster */}
          <div className="mb-3">
            <div className="flex items-center justify-between mb-2">
              <div>
                <div className="font-semibold text-sm text-foreground">{pickedFood.nom}</div>
                {pickedFood.groupe && (
                  <div className="text-[10px] text-pink-deep/70">{pickedFood.groupe}</div>
                )}
              </div>
              <button
                onClick={() => setPickedFood(null)}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                Changer
              </button>
            </div>
          </div>

          {/* Grams adjuster */}
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xs text-muted-foreground">Quantité :</span>
            <button
              onClick={() => setGrams((g) => Math.max(10, g - getPortionStep(pickedFood.nom)))}
              className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center"
            >
              <Minus className="w-3 h-3" />
            </button>
            <span className="text-sm font-medium text-foreground w-14 text-center">{formatPortion(pickedFood.nom, grams)}</span>
            <button
              onClick={() => setGrams((g) => Math.min(1000, g + getPortionStep(pickedFood.nom)))}
              className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center"
            >
              <Plus className="w-3 h-3" />
            </button>
          </div>

          {/* Quick grams */}
          <div className="flex gap-2 mb-4">
            {(getPortionUnit(pickedFood.nom) === "ml" ? [100, 150, 200, 250, 300] : [50, 100, 150, 200, 300]).map((g) => (
              <button
                key={g}
                onClick={() => setGrams(g)}
                className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-all ${grams === g ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
              >
                {g}{getPortionUnit(pickedFood.nom)}
              </button>
            ))}
          </div>

          {/* Nutritional preview */}
          <div className="text-xs text-muted-foreground mb-4 text-center">
            {scaleCiqual(pickedFood, grams).calories} kcal · {scaleCiqual(pickedFood, grams).proteins}g prot · {scaleCiqual(pickedFood, grams).carbs}g gluc
          </div>

          {/* Confirm button */}
          <button
            onClick={handleConfirm}
            className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-semibold flex items-center justify-center gap-2 shadow-md"
          >
            Confirmer
          </button>
        </>
      )}
    </div>
  );
}
