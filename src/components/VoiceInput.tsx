import { useState, useRef, useCallback } from "react";
import { Mic, MicOff, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { scaleCiqual, CiqualFood } from "@/lib/ciqual";
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
        toast.error("Je n'ai pas compris, réessayez");
        setState("idle");
        return;
      }

      // Search each food in ciqual with limit 8
      const allCandidates: VoiceCandidate[] = [];
      const directMatches: VoiceMatch[] = [];

      for (const item of data.foods) {
        try {
          const cols = "id, nom, groupe, calories_100g, proteines_100g, glucides_100g, lipides_100g, fibres_100g, calcium_100g, fer_100g, magnesium_100g, vitamine_d_100g, vitamine_b12_100g, omega3_total_100g";
          const [startsWith, contains] = await Promise.all([
            supabase.from("aliments_ciqual").select(cols).ilike("nom", `${item.name}%`).limit(8),
            supabase.from("aliments_ciqual").select(cols).ilike("nom", `%${item.name}%`).limit(8),
          ]);
          const searchError = startsWith.error || contains.error;
          const seen = new Set<number>();
          const results: any[] = [];
          for (const row of [...(startsWith.data || []), ...(contains.data || [])]) {
            if (!seen.has(row.id) && results.length < 8) {
              seen.add(row.id);
              results.push(row);
            }
          }

          console.log(`[Voice] Search "${item.name}":`, results?.length, "results", results);

          if (searchError) {
            console.error(`[Voice] Search error for "${item.name}":`, searchError);
            toast.error(`Erreur pour "${item.name}"`);
            continue;
          }

          if (!results || results.length === 0) {
            toast.error(`"${item.name}" non trouvé, recherchez manuellement`);
            continue;
          }

          const mapped: CiqualFood[] = results.map((row) => ({
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
            phytoestrogenes_100mg: (row as any).phytoestrogenes_100mg ?? 0,
            potassium_100g: (row as any).potassium_100g ?? 0,
            zinc_100g: (row as any).zinc_100g ?? 0,
            vitamine_k_100g: (row as any).vitamine_k_100g ?? 0,
            vitamine_b6_100g: (row as any).vitamine_b6_100g ?? 0,
            vitamine_b9_100g: (row as any).vitamine_b9_100g ?? 0,
            vitamine_e_100g: (row as any).vitamine_e_100g ?? 0,
          }));

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
        toast.error("Je n'ai pas compris, réessayez");
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
        title={state === "listening" ? "Appuyez pour arrêter l'enregistrement" : "Dicter un aliment"}
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
          <span className="text-[11px] font-medium text-foreground">
            Enregistrement en cours… appuyez pour arrêter
          </span>
        </div>
      )}

      {state === "processing" && (
        <div role="status" className="absolute top-full mt-2 z-20 whitespace-nowrap rounded-full bg-muted px-3 py-1">
          <span className="text-[11px] text-muted-foreground">Analyse en cours…</span>
        </div>
      )}
    </div>
  );
}
