import { useState, useEffect, useRef } from "react";
import { Plus, Minus, Check, X } from "lucide-react";
import { scaleCiqual } from "@/lib/ciqual";
import { formatPortion, formatStandardPortionHint, getPortionStep, getPortionUnit } from "@/lib/portionUnits";
import type { VoiceMatch, VoiceConfidence } from "./VoiceInput";

interface VoiceResultsProps {
  matches: VoiceMatch[];
  mealType: string;
  onConfirm: (items: VoiceMatch[]) => void;
  onCancel: () => void;
}

const CONFIDENCE_META: Record<VoiceConfidence, { label: string; emoji: string; classes: string }> = {
  high: {
    label: "Confiance élevée",
    emoji: "✅",
    classes: "bg-emerald-500/15 text-emerald-700 border-emerald-500/30",
  },
  medium: {
    label: "À vérifier",
    emoji: "🔄",
    classes: "bg-amber-500/15 text-amber-700 border-amber-500/30",
  },
  low: {
    label: "À confirmer",
    emoji: "❓",
    classes: "bg-rose-500/15 text-rose-700 border-rose-500/30",
  },
};

const AUTO_CONFIRM_MS = 3000;

export default function VoiceResults({ matches, onConfirm, onCancel }: VoiceResultsProps) {
  const [items, setItems] = useState<VoiceMatch[]>(matches);
  const [edited, setEdited] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval>>();

  const allHigh = items.length > 0 && items.every((i) => (i.confidence ?? "medium") === "high");

  // Auto-confirm if all items are high confidence and user hasn't edited
  useEffect(() => {
    clearInterval(timerRef.current);
    if (!allHigh || edited) {
      setCountdown(null);
      return;
    }
    setCountdown(Math.ceil(AUTO_CONFIRM_MS / 1000));
    const start = Date.now();
    timerRef.current = setInterval(() => {
      const remaining = AUTO_CONFIRM_MS - (Date.now() - start);
      if (remaining <= 0) {
        clearInterval(timerRef.current);
        onConfirm(items);
      } else {
        setCountdown(Math.ceil(remaining / 1000));
      }
    }, 250);
    return () => clearInterval(timerRef.current);
  }, [allHigh, edited, items, onConfirm]);

  const stopAuto = () => {
    setEdited(true);
    clearInterval(timerRef.current);
    setCountdown(null);
  };

  const updateGrams = (index: number, grams: number) => {
    stopAuto();
    setItems((prev) =>
      prev.map((item, i) =>
        i === index ? { ...item, grams, scaled: scaleCiqual(item.food, grams) } : item
      )
    );
  };

  const removeItem = (index: number) => {
    stopAuto();
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
        <button onClick={onCancel} className="text-muted-foreground" aria-label="Annuler">
          <X className="w-4 h-4" />
        </button>
      </div>

      {countdown !== null && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg px-3 py-2 text-[11px] text-emerald-700 flex items-center justify-between">
          <span>✨ Tout semble bon — ajout automatique dans {countdown}s</span>
          <button onClick={stopAuto} className="font-semibold underline">
            Annuler
          </button>
        </div>
      )}

      {items.map((item, idx) => {
        const conf = item.confidence ?? "medium";
        const meta = CONFIDENCE_META[conf];
        return (
          <div key={idx} className="bg-muted/30 rounded-xl p-3 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm text-foreground line-clamp-1">{item.food.nom}</div>
                <div className="text-xs text-muted-foreground">
                  {item.scaled.calories} kcal · {item.scaled.proteins}g prot · {item.scaled.carbs}g gluc
                </div>
              </div>
              <span
                className={`shrink-0 text-[10px] font-medium px-2 py-0.5 rounded-full border ${meta.classes}`}
                title={meta.label}
              >
                {meta.emoji} {meta.label}
              </span>
              <button
                onClick={() => removeItem(idx)}
                className="text-muted-foreground hover:text-destructive ml-1"
                aria-label="Retirer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="flex items-center gap-2">
              {(() => {
                const unit = getPortionUnit(item.food.nom);
                const step = getPortionStep(item.food.nom);
                const presets = unit === "ml" ? [100, 150, 200, 250] : [50, 100, 150, 200];
                return (
                  <>
                    <button
                      onClick={() => updateGrams(idx, Math.max(10, item.grams - step))}
                      className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="text-sm font-medium text-foreground w-14 text-center">
                      {formatPortion(item.food.nom, item.grams)}
                    </span>
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
                          {g}
                          {unit}
                        </button>
                      ))}
                    </div>
                  </>
                );
              })()}
            </div>
            <p className="text-[11px] text-muted-foreground">{formatStandardPortionHint(item.food.nom)}</p>
          </div>
        );
      })}

      <button
        onClick={() => {
          stopAuto();
          onConfirm(items);
        }}
        className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-semibold flex items-center justify-center gap-2"
      >
        <Check className="w-4 h-4" /> Ajouter {items.length} aliment{items.length > 1 ? "s" : ""}
      </button>
    </div>
  );
}
