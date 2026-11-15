import { useState, useRef, useCallback } from "react";
import { Mic, MicOff, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { scaleCiqual, searchCiqual, matchCiqualFood, CiqualFood } from "@/lib/ciqual";
import { getDefaultPortion } from "@/lib/portionUnits";
import { toast } from "sonner";
import { normalizeTranscript, pickBestAlternative } from "@/lib/speechCorrections";


export interface VoiceMatch {
  food: CiqualFood;
  grams: number;
  scaled: ReturnType<typeof scaleCiqual>;
}

export interface VoiceCandidate {
  name: string;
  grams: number;
  candidates: CiqualFood[];
}

interface VoiceInputProps {
  onResults: (matches: VoiceMatch[]) => void;
  onCandidates?: (candidates: VoiceCandidate[]) => void;
}

type VoiceState = "idle" | "listening" | "processing";

export default function VoiceInput({ onResults, onCandidates }: VoiceInputProps) {
  const [state, setState] = useState<VoiceState>("idle");
  const recognitionRef = useRef<any>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const finalTranscriptRef = useRef<string>("");
  const manualStopRef = useRef<boolean>(false);


  const stopRecording = useCallback(() => {
    clearTimeout(timeoutRef.current);
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
  }, []);

  const processTranscript = useCallback(async (transcript: string) => {
    setState("processing");
    try {
      const { data, error } = await supabase.functions.invoke("voice-parse", {
        body: { transcript },
      });

      if (error) {
        toast.error("Erreur de traitement vocal");
        setState("idle");
        return;
      }

      if (data?.error) {
        toast.error(data.error);
        setState("idle");
        return;
      }

      if (!data?.foods?.length) {
        toast.error("Je n'ai pas compris, réessaie");
        setState("idle");
        return;
      }

      // Search each food in ciqual with limit 8
      const allCandidates: VoiceCandidate[] = [];
      const directMatches: VoiceMatch[] = [];

      for (const item of data.foods) {
        try {
          // Moteur unique : le meilleur aliment d'abord, puis les autres candidats classés.
          const [best, ranked] = await Promise.all([matchCiqualFood(item.name), searchCiqual(item.name)]);
          const mapped: CiqualFood[] = [
            ...(best ? [best.food] : []),
            ...ranked.filter((f) => f.id !== best?.food.id),
          ].slice(0, 8);

          if (mapped.length === 0) {
            toast.error(`"${item.name}" non trouvé, recherche manuellement`);
            continue;
          }

          const grams = Math.max(10, Math.min(1000, item.grams || getDefaultPortion(item.name)));

          // Always show picker if more than 1 result
          if (mapped.length > 1 && onCandidates) {
            allCandidates.push({ name: item.name, grams, candidates: mapped });
          } else {
            // Only 1 result — add directly
            const food = mapped[0];
            directMatches.push({ food, grams, scaled: scaleCiqual(food, grams) });
          }
        } catch {
          toast.error(`Erreur pour "${item.name}"`);
        }
      }

      // If we have candidates to pick from, use the picker flow
      if (allCandidates.length > 0 && onCandidates) {
        onCandidates(allCandidates);
        // Also send any single-result matches
        if (directMatches.length > 0) {
          onResults(directMatches);
        }
      } else if (directMatches.length > 0) {
        onResults(directMatches);
      }
    } catch {
      toast.error("Erreur de connexion");
    }
    setState("idle");
  }, [onResults, onCandidates]);

  const toggleRecording = useCallback(() => {
    if (state === "listening") {
      manualStopRef.current = true;
      stopRecording();
      return;
    }
    if (state === "processing") return;

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.error("Reconnaissance vocale non supportée par ce navigateur");
      return;
    }

    finalTranscriptRef.current = "";
    manualStopRef.current = false;

    const scheduleSilenceStop = () => {
      clearTimeout(timeoutRef.current);
      // 4s de silence prolongé → on considère la dictée terminée
      timeoutRef.current = setTimeout(() => {
        manualStopRef.current = true;
        stopRecording();
      }, 4000);
    };

    const recognition = new SpeechRecognition();
    recognition.lang = "fr-FR";
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 3;

    recognition.onresult = (event: any) => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const res = event.results[i];
        if (res.isFinal) {
          finalTranscriptRef.current += pickBestAlternative(res) + " ";
        }
      }
      scheduleSilenceStop();
    };

    recognition.onerror = (e: any) => {
      if (e?.error === "no-speech" || e?.error === "aborted") return;
      manualStopRef.current = true;
      clearTimeout(timeoutRef.current);
      toast.error("Erreur de reconnaissance vocale");
      setState("idle");
    };

    recognition.onend = () => {
      // Relance automatique tant que l'utilisatrice n'a pas arrêté
      if (!manualStopRef.current) {
        try {
          recognition.start();
          return;
        } catch { /* fallthrough */ }
      }
      clearTimeout(timeoutRef.current);
      recognitionRef.current = null;
      const finalText = normalizeTranscript(finalTranscriptRef.current);
      if (finalText.length > 0) {
        processTranscript(finalText);
      } else {
        toast.error("Je n'ai pas compris, réessaie");
        setState("idle");
      }
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
      setState("listening");
      scheduleSilenceStop();
    } catch {
      setState("idle");
    }
  }, [state, stopRecording, processTranscript]);


  return (
    <div className="relative flex flex-col items-center">
      <button
        type="button"
        onClick={toggleRecording}
        disabled={state === "processing"}
        className={`relative w-12 h-12 rounded-xl flex items-center justify-center transition-all ${
          state === "listening"
            ? "bg-primary text-primary-foreground shadow-lg"
            : state === "processing"
            ? "bg-muted text-muted-foreground"
            : "bg-primary/10 text-pink-deep hover:bg-primary/20"
        }`}
        title={state === "listening" ? "Appuie pour arrêter l'enregistrement" : "Dicter un aliment"}
        aria-label={state === "listening" ? "Arrêter l'enregistrement" : "Dicter un aliment"}
      >
        {state === "listening" && (
          <span className="absolute inset-0 rounded-xl bg-primary/40 animate-ping" aria-hidden />
        )}
        {state === "processing" ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : state === "listening" ? (
          <MicOff className="w-5 h-5 relative" />
        ) : (
          <Mic className="w-5 h-5" />
        )}
      </button>

      {state === "listening" && (
        <div
          role="status"
          className="absolute top-full mt-2 z-20 flex items-center gap-2 whitespace-nowrap rounded-full bg-primary/15 border border-primary/30 px-3 py-1 shadow-sm"
        >
          <span className="w-2 h-2 rounded-full bg-destructive animate-pulse" />
          <span className="text-[13px] font-medium text-foreground">
            Enregistrement en cours… appuie pour arrêter
          </span>
        </div>
      )}

      {state === "processing" && (
        <div role="status" className="absolute top-full mt-2 z-20 whitespace-nowrap rounded-full bg-muted px-3 py-1">
          <span className="text-[13px] text-muted-foreground">Analyse en cours…</span>
        </div>
      )}
    </div>
  );
}
