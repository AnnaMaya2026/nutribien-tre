import { useState, useCallback, useEffect, useRef } from "react";
import { Mic, MicOff, MessageCircle, X, Check, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { scaleCiqual } from "@/lib/ciqual";
import { getDefaultPortion } from "@/lib/portionUnits";
import { toast } from "sonner";
import type { VoiceMatch } from "./VoiceInput";

const MEALS: Array<{ value: string; label: string; prompt: string }> = [
  { value: "petit-dejeuner", label: "🌅 Petit-déjeuner", prompt: "Qu'as-tu mangé au petit-déjeuner ce matin ?" },
  { value: "dejeuner", label: "☀️ Déjeuner", prompt: "Et au déjeuner ?" },
  { value: "diner", label: "🌙 Dîner", prompt: "Et au dîner ?" },
  { value: "collation", label: "🍎 Collation", prompt: "Une collation à ajouter ?" },
];

type Phase = "asking" | "listening" | "processing" | "confirming" | "done";

interface CapturedMeal {
  meal: string;
  items: VoiceMatch[];
  transcript: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onComplete: (meals: CapturedMeal[]) => void;
}

export default function ConversationMode({ open, onClose, onComplete }: Props) {
  const [step, setStep] = useState(0);
  const [phase, setPhase] = useState<Phase>("asking");
  const [transcript, setTranscript] = useState("");
  const [pendingItems, setPendingItems] = useState<VoiceMatch[]>([]);
  const [captured, setCaptured] = useState<CapturedMeal[]>([]);
  const recognitionRef = useRef<any>(null);

  const current = MEALS[step];

  const reset = useCallback(() => {
    setStep(0);
    setPhase("asking");
    setTranscript("");
    setPendingItems([]);
    setCaptured([]);
  }, []);

  useEffect(() => {
    if (!open) reset();
  }, [open, reset]);

  const goNext = useCallback(
    (items: VoiceMatch[]) => {
      const next = [...captured];
      if (items.length > 0) next.push({ meal: current.value, items, transcript });
      setCaptured(next);
      setTranscript("");
      setPendingItems([]);
      if (step < MEALS.length - 1) {
        setStep(step + 1);
        setPhase("asking");
      } else {
        setPhase("done");
        onComplete(next);
      }
    },
    [captured, current, step, transcript, onComplete]
  );

  const processTranscript = useCallback(async (text: string) => {
    setPhase("processing");
    try {
      const { data, error } = await supabase.functions.invoke("voice-parse", { body: { transcript: text } });
      if (error || data?.error || !data?.foods?.length) {
        toast.error(data?.error || "Je n'ai pas compris, réessaie");
        setPhase("asking");
        return;
      }
      const cols = "id, nom, groupe, calories_100g, proteines_100g, glucides_100g, lipides_100g, fibres_100g, calcium_100g, fer_100g, magnesium_100g, vitamine_d_100g, vitamine_b12_100g, omega3_total_100g";
      const matches: VoiceMatch[] = [];
      for (const item of data.foods) {
        const { data: rows } = await supabase
          .from("aliments_ciqual")
          .select(cols)
          .ilike("nom", `%${item.name}%`)
          .limit(1);
        const row: any = rows?.[0];
        if (!row) continue;
        const food = {
          id: row.id,
          nom: row.nom || "Sans nom",
          groupe: row.groupe,
          calories_100g: row.calories_100g ?? 0,
          proteines_100g: row.proteines_100g ?? 0,
          glucides_100g: row.glucides_100g ?? 0,
          lipides_100g: row.lipides_100g ?? 0,
          fibres_100g: row.fibres_100g ?? 0,
          calcium_100g: row.calcium_100g ?? 0,
          fer_100g: row.fer_100g ?? 0,
          magnesium_100g: row.magnesium_100g ?? 0,
          vitamine_d_100g: row.vitamine_d_100g ?? 0,
          vitamine_b12_100g: row.vitamine_b12_100g ?? 0,
          omega3_total_100g: row.omega3_total_100g ?? 0,
          phytoestrogenes_100mg: 0,
          potassium_100g: 0,
          zinc_100g: 0,
          vitamine_k_100g: 0,
          vitamine_b6_100g: 0,
          vitamine_b9_100g: 0,
          vitamine_e_100g: 0,
        } as any;
        const grams = Math.max(10, Math.min(1000, item.grams || getDefaultPortion(item.name)));
        matches.push({ food, grams, scaled: scaleCiqual(food, grams), confidence: item.confidence });
      }
      if (matches.length === 0) {
        toast.error("Aliments non trouvés dans la base. Réessaie.");
        setPhase("asking");
        return;
      }
      setPendingItems(matches);
      setPhase("confirming");
    } catch {
      toast.error("Erreur de traitement vocal");
      setPhase("asking");
    }
  }, []);

  const startListening = useCallback(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      toast.error("Reconnaissance vocale non supportée");
      return;
    }
    const r = new SR();
    r.lang = "fr-FR";
    r.continuous = false;
    r.interimResults = false;
    r.onresult = (e: any) => {
      const t = e.results[0]?.[0]?.transcript;
      if (t) {
        setTranscript(t);
        processTranscript(t);
      } else {
        toast.error("Je n'ai pas entendu, réessaie");
        setPhase("asking");
      }
    };
    r.onerror = () => {
      toast.error("Erreur micro");
      setPhase("asking");
    };
    recognitionRef.current = r;
    r.start();
    setPhase("listening");
  }, [processTranscript]);

  const stopListening = () => {
    recognitionRef.current?.stop();
    setPhase("asking");
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50">
      <div className="bg-card rounded-t-3xl w-full max-w-lg p-6 pb-8 animate-fade-in space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
            💬 Mode conversation
          </h3>
          <button onClick={onClose} className="text-muted-foreground" aria-label="Fermer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {phase !== "done" && (
          <>
            <div className="flex gap-1 mb-2">
              {MEALS.map((m, i) => (
                <div
                  key={m.value}
                  className={`flex-1 h-1.5 rounded-full ${i <= step ? "bg-primary" : "bg-muted"}`}
                />
              ))}
            </div>

            <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4">
              <p className="text-xs text-pink-deep font-medium mb-1">Sophie</p>
              <p className="text-sm text-foreground">{current.prompt}</p>
            </div>

            {phase === "asking" && (
              <div className="flex flex-col items-center gap-3 py-2">
                <button
                  onClick={startListening}
                  className="w-20 h-20 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg active:scale-95 transition-transform"
                  aria-label="Parler"
                >
                  <Mic className="w-8 h-8" />
                </button>
                <button
                  onClick={() => goNext([])}
                  className="text-xs text-muted-foreground underline"
                >
                  Passer ce repas
                </button>
              </div>
            )}

            {phase === "listening" && (
              <div className="flex flex-col items-center gap-3 py-2">
                <button
                  onClick={stopListening}
                  className="w-20 h-20 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg animate-pulse"
                  aria-label="Arrêter"
                >
                  <MicOff className="w-8 h-8" />
                </button>
                <p className="text-xs text-muted-foreground">À l'écoute…</p>
              </div>
            )}

            {phase === "processing" && (
              <div className="flex flex-col items-center gap-2 py-4">
                <Loader2 className="w-8 h-8 animate-spin text-pink-deep" />
                <p className="text-sm text-muted-foreground">Analyse en cours…</p>
              </div>
            )}

            {phase === "confirming" && (
              <div className="space-y-3">
                <p className="text-xs text-muted-foreground italic">« {transcript} »</p>
                <div className="bg-muted/40 rounded-xl p-3 space-y-1">
                  <p className="text-xs font-semibold text-foreground mb-1">
                    Donc, pour {current.label.toLowerCase()} :
                  </p>
                  {pendingItems.map((m, i) => (
                    <p key={i} className="text-sm text-foreground">
                      • {m.food.nom} ({m.grams}{m.food.nom.match(/lait|jus|café|thé/i) ? "ml" : "g"})
                    </p>
                  ))}
                  <p className="text-xs text-pink-deep mt-2">C'est bien ça ?</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setPendingItems([]);
                      setTranscript("");
                      setPhase("asking");
                    }}
                    className="flex-1 py-3 rounded-xl bg-muted text-foreground font-medium text-sm"
                  >
                    Corriger
                  </button>
                  <button
                    onClick={() => goNext(pendingItems)}
                    className="flex-1 py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm flex items-center justify-center gap-1"
                  >
                    <Check className="w-4 h-4" /> Oui
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {phase === "done" && (
          <div className="flex flex-col items-center gap-3 py-6">
            <div className="text-5xl">✨</div>
            <p className="text-sm text-foreground text-center">
              Super ! J'ai enregistré {captured.reduce((s, c) => s + c.items.length, 0)} aliment(s)
              sur {captured.length} repas.
            </p>
            <button
              onClick={onClose}
              className="px-6 py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm"
            >
              Terminer
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
