import { useState, useRef, useCallback } from "react";
import { Mic, MicOff, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { searchCiqual, scaleCiqual, CiqualFood } from "@/lib/ciqual";
import { toast } from "sonner";

export interface VoiceMatch {
  food: CiqualFood;
  grams: number;
  scaled: ReturnType<typeof scaleCiqual>;
}

interface VoiceInputProps {
  onResults: (matches: VoiceMatch[]) => void;
}

type VoiceState = "idle" | "listening" | "processing";

export default function VoiceInput({ onResults }: VoiceInputProps) {
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

      // Search each food in ciqual
      const matches: VoiceMatch[] = [];
      for (const item of data.foods) {
        try {
          const results = await searchCiqual(item.name);
          if (results.length > 0) {
            const food = results[0];
            const grams = Math.max(10, Math.min(1000, item.grams || 100));
            matches.push({ food, grams, scaled: scaleCiqual(food, grams) });
          } else {
            toast.error(`"${item.name}" non trouvé, recherchez manuellement`);
          }
        } catch {
          toast.error(`Erreur pour "${item.name}"`);
        }
      }

      if (matches.length > 0) {
        onResults(matches);
      }
    } catch {
      toast.error("Erreur de connexion");
    }
    setState("idle");
  }, [onResults]);

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
      if (state === "listening") {
        // If no result came through onresult
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
    setState("listening");

    // Auto-stop after 10 seconds
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
