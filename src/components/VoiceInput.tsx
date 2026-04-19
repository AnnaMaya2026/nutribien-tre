import { useState, useRef, useCallback } from "react";
import { Mic, MicOff, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { scaleCiqual, CiqualFood } from "@/lib/ciqual";
import { toast } from "sonner";

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
          }));

          const grams = Math.max(10, Math.min(1000, item.grams || 100));

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
      stopRecording();
      return;
    }
    if (state === "processing") return;

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.error("Reconnaissance vocale non supportée par ce navigateur");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "fr-FR";
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onresult = (event: any) => {
      const transcript = event.results[0]?.[0]?.transcript;
      if (transcript) {
        processTranscript(transcript);
      } else {
        toast.error("Je n'ai pas compris, réessayez");
        setState("idle");
      }
    };

    recognition.onerror = () => {
      toast.error("Erreur de reconnaissance vocale");
      setState("idle");
    };

    recognition.onend = () => {
      clearTimeout(timeoutRef.current);
    };

    recognitionRef.current = recognition;
    recognition.start();
    setState("listening");

    timeoutRef.current = setTimeout(() => {
      stopRecording();
    }, 10000);
  }, [state, stopRecording, processTranscript]);

  return (
    <button
      type="button"
      onClick={toggleRecording}
      disabled={state === "processing"}
      className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all ${
        state === "listening"
          ? "bg-primary text-primary-foreground animate-pulse shadow-lg"
          : state === "processing"
          ? "bg-muted text-muted-foreground"
          : "bg-primary/10 text-primary hover:bg-primary/20"
      }`}
      title={state === "listening" ? "Arrêter" : "Dicter un aliment"}
    >
      {state === "processing" ? (
        <Loader2 className="w-5 h-5 animate-spin" />
      ) : state === "listening" ? (
        <MicOff className="w-5 h-5" />
      ) : (
        <Mic className="w-5 h-5" />
      )}
    </button>
  );
}
