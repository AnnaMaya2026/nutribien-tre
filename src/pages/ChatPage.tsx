import { useState, useRef, useEffect, useCallback } from "react";
import { Send, User, Loader2, Volume2, Pause, Mic, MicOff, Clock, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";
import SophieHistoryDrawer from "@/components/SophieHistoryDrawer";
import SophieAvatar from "@/components/SophieAvatar";
import { useAuth } from "@/hooks/useAuth";

interface Message {
  id: number;
  text: string;
  from: "user" | "ai";
}

const WELCOME: Message = {
  id: 0,
  text: "Bonjour ! Je suis Sophie, votre nutritionniste spécialisée en ménopause. Je vois vos données nutritionnelles du jour — comment puis-je vous aider ?",
  from: "ai",
};

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([WELCOME]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [playingId, setPlayingId] = useState<number | null>(null);
  const [loadingTtsId, setLoadingTtsId] = useState<number | null>(null);
  const [autoRead, setAutoRead] = useState(true);
  const [isRecording, setIsRecording] = useState(false);
  const [autoSendTimer, setAutoSendTimer] = useState<ReturnType<typeof setTimeout> | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [restored, setRestored] = useState(false);
  const { user } = useAuth();
  const bottomRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const recognitionRef = useRef<any>(null);
  const autoReadRef = useRef(autoRead);

  useEffect(() => {
    autoReadRef.current = autoRead;
  }, [autoRead]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Restore today's conversation on mount
  useEffect(() => {
    if (!user || restored) return;
    (async () => {
      const today = new Date().toISOString().split("T")[0];
      const { data, error } = await supabase
        .from("sophie_conversations" as any)
        .select("*")
        .eq("user_id", user.id)
        .eq("conversation_date", today)
        .order("created_at", { ascending: true });
      if (!error && data && data.length > 0) {
        const restoredMsgs: Message[] = (data as any[]).map((m, idx) => ({
          id: idx + 1,
          text: m.message,
          from: m.role === "user" ? "user" : "ai",
        }));
        setMessages([WELCOME, ...restoredMsgs]);
      }
      setRestored(true);
    })();
  }, [user, restored]);

  const newConversation = () => {
    if (!confirm("Démarrer une nouvelle conversation ? L'historique du jour reste consultable dans l'historique.")) return;
    setMessages([WELCOME]);
    toast("Nouvelle conversation démarrée");
  };

  const stopAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      URL.revokeObjectURL(audioRef.current.src);
      audioRef.current = null;
    }
    setPlayingId(null);
  }, []);

  const playTts = useCallback(async (msgId: number, text: string) => {
    // If already playing this message, stop it
    if (playingId === msgId) {
      stopAudio();
      return;
    }

    // Stop any current playback
    stopAudio();
    setLoadingTtsId(msgId);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/tts-sophie`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ text }),
        }
      );

      if (!response.ok) {
        const err = await response.text();
        console.error("TTS error:", err);
        return;
      }

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      audioRef.current = audio;

      audio.onplay = () => setPlayingId(msgId);
      audio.onended = () => {
        setPlayingId(null);
        URL.revokeObjectURL(audioUrl);
        audioRef.current = null;
      };
      audio.onerror = () => {
        setPlayingId(null);
        URL.revokeObjectURL(audioUrl);
        audioRef.current = null;
      };

      await audio.play();
    } catch (e) {
      console.error("TTS playback error:", e);
    } finally {
      setLoadingTtsId(null);
    }
  }, [playingId, stopAudio]);

  const persistMessage = useCallback(async (role: "user" | "sophie", message: string) => {
    if (!user) return;
    const { error } = await supabase.from("sophie_conversations" as any).insert({
      user_id: user.id,
      role,
      message,
    });
    if (error) console.error("Erreur sauvegarde conversation:", error);
  }, [user]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const trimmedInput = input.trim();
    const userMsg: Message = { id: Date.now(), text: trimmedInput, from: "user" };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    // Save user message
    persistMessage("user", trimmedInput);

    try {
      const history = [...messages.filter((m) => m.id !== 0), userMsg].map((m) => ({
        role: m.from === "user" ? "user" : "assistant",
        content: m.text,
      }));

      const { data, error } = await supabase.functions.invoke("chat-nutritionist", {
        body: { messages: history },
      });

      console.log("Réponse API Sophie:", data);

      if (error) {
        console.error("Erreur API Sophie:", error);
        throw error;
      }

      if (!data?.reply || typeof data.reply !== "string") {
        throw new Error("Réponse IA invalide ou vide");
      }

      const aiMsg: Message = {
        id: Date.now() + 1,
        text: data.reply,
        from: "ai",
      };
      setMessages((prev) => [...prev, aiMsg]);

      // Save Sophie message
      persistMessage("sophie", data.reply);

      // Auto-read if enabled
      if (autoReadRef.current) {
        setTimeout(() => playTts(aiMsg.id, aiMsg.text), 300);
      }
    } catch (e) {
      console.error("Erreur réelle du chat nutritionniste:", e, { userMessage: trimmedInput });
      const errorMsg: Message = {
        id: Date.now() + 1,
        text: "Désolée, je suis momentanément indisponible. Réessayez dans quelques instants.",
        from: "ai",
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };
  const toggleRecording = useCallback(() => {
    if (isRecording) {
      recognitionRef.current?.stop();
      recognitionRef.current = null;
      setIsRecording(false);
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast("Reconnaissance vocale non supportée par ce navigateur");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "fr-FR";
    recognition.continuous = false;
    recognition.interimResults = true;

    recognition.onresult = (event: any) => {
      const transcript = Array.from(event.results)
        .map((r: any) => r[0].transcript)
        .join("");
      setInput(transcript);

      // Auto-send 1.5s after final result
      if (event.results[event.results.length - 1].isFinal) {
        setIsRecording(false);
        const timer = setTimeout(() => {
          // We need to trigger send via a ref-based approach
          const sendBtn = document.getElementById("chat-send-btn");
          sendBtn?.click();
        }, 1500);
        setAutoSendTimer(timer);
      }
    };

    recognition.onerror = () => {
      setIsRecording(false);
    };

    recognition.onend = () => {
      setIsRecording(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
    setIsRecording(true);
  }, [isRecording]);

  const cancelAutoSend = useCallback(() => {
    if (autoSendTimer) {
      clearTimeout(autoSendTimer);
      setAutoSendTimer(null);
    }
  }, [autoSendTimer]);

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <div className="px-4 pt-6 pb-3 border-b border-border">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0 flex-1 flex items-center gap-2.5">
            <SophieAvatar size={40} thinking={isLoading} />
            <div className="min-w-0">
              <h1 className="text-lg font-bold text-foreground truncate">Sophie — Nutritionniste IA</h1>
              <p className="text-xs text-muted-foreground">Conseils personnalisés pour la ménopause</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={newConversation}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-muted hover:bg-muted/70 text-foreground text-sm font-medium transition-colors min-h-[40px]"
              title="Nouvelle conversation"
            >
              <Trash2 className="w-4 h-4" />
              <span className="hidden sm:inline">Nouvelle</span>
            </button>
            <button
              onClick={() => setHistoryOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary text-sm font-medium transition-colors min-h-[40px]"
              title="Voir l'historique"
            >
              <Clock className="w-4 h-4" />
              <span className="hidden sm:inline">Historique</span>
            </button>
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 mt-2">
          <span className="text-xs text-muted-foreground">🔊 Réponse vocale auto</span>
          <Switch
            checked={autoRead}
            onCheckedChange={setAutoRead}
            className="data-[state=checked]:bg-primary"
          />
        </div>
      </div>

      <SophieHistoryDrawer open={historyOpen} onClose={() => setHistoryOpen(false)} />

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 pb-56">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex gap-2 ${msg.from === "user" ? "justify-end" : ""} animate-fade-in`}>
            {msg.from === "ai" && <SophieAvatar size={28} className="mt-1" />}
            <div className="flex flex-col gap-1 max-w-[80%]">
              <div
                className={`px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                  msg.from === "user"
                    ? "bg-primary text-primary-foreground rounded-br-md"
                    : "bg-card text-card-foreground rounded-bl-md card-soft"
                }`}
              >
                {msg.from === "ai" ? (
                  <div className="prose prose-sm prose-pink max-w-none [&>p]:m-0">
                    <ReactMarkdown>{msg.text}</ReactMarkdown>
                  </div>
                ) : (
                  msg.text
                )}
              </div>
              {/* TTS button for AI messages */}
              {msg.from === "ai" && (
                <button
                  onClick={() => playTts(msg.id, msg.text)}
                  disabled={loadingTtsId === msg.id}
                  className="self-start flex items-center gap-1.5 text-sm text-primary hover:text-primary/80 transition-colors px-3 py-2 min-h-[44px] min-w-[44px] rounded-lg bg-primary/10 hover:bg-primary/15 disabled:opacity-50"
                  title={playingId === msg.id ? "Mettre en pause" : "Écouter"}
                >
                  {loadingTtsId === msg.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : playingId === msg.id ? (
                    <Pause className="w-4 h-4" />
                  ) : (
                    <Volume2 className="w-4 h-4" />
                  )}
                  <span>{loadingTtsId === msg.id ? "Chargement..." : playingId === msg.id ? "Pause" : "Écouter"}</span>
                </button>
              )}
            </div>
            {msg.from === "user" && (
              <div className="w-7 h-7 rounded-full bg-accent flex items-center justify-center flex-shrink-0 mt-1">
                <User className="w-3.5 h-3.5 text-accent-foreground" />
              </div>
            )}
          </div>
        ))}

        {/* Typing indicator */}
        {isLoading && (
          <div className="flex gap-2 animate-fade-in">
            <SophieAvatar size={28} thinking className="mt-1" />
            <div className="bg-card text-card-foreground rounded-2xl rounded-bl-md card-soft px-4 py-3 text-sm flex items-center gap-2">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
              <span className="text-muted-foreground italic">Sophie réfléchit...</span>
            </div>
          </div>
        )}
            <div className="bg-card text-card-foreground rounded-2xl rounded-bl-md card-soft px-4 py-3 text-sm flex items-center gap-2">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
              <span className="text-muted-foreground italic">Sophie réfléchit...</span>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="fixed bottom-20 left-0 right-0 px-4 pb-4 bg-background border-t border-border">
        {isRecording && (
          <div className="text-center text-xs text-primary animate-pulse pt-2 pb-1">
            🎤 J'écoute... parlez maintenant
          </div>
        )}
        {autoSendTimer && (
          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground pt-2 pb-1">
            <span>Envoi automatique...</span>
            <button onClick={cancelAutoSend} className="text-primary underline">Annuler</button>
          </div>
        )}
        <div className="flex gap-2 pt-3 items-end">
          <div className="flex flex-col items-center gap-1">
            <button
              onClick={toggleRecording}
              disabled={isLoading}
              className={`w-14 h-14 rounded-xl flex items-center justify-center transition-all ${
                isRecording
                  ? "bg-primary text-primary-foreground animate-pulse shadow-lg"
                  : "bg-primary text-primary-foreground hover:bg-primary/90 shadow-md"
              }`}
              title={isRecording ? "Arrêter" : "Parler à Sophie"}
            >
              {isRecording ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
            </button>
            <span className="text-[10px] text-muted-foreground font-medium">Parler</span>
          </div>
          <Input
            value={input}
            onChange={(e) => { setInput(e.target.value); cancelAutoSend(); }}
            onKeyDown={(e) => { if (e.key === "Enter") { cancelAutoSend(); handleSend(); } }}
            placeholder="Posez votre question à Sophie ou dites-lui ce que vous avez dans le frigo 🥦"
            className="h-14 bg-card rounded-lg flex-1"
            disabled={isLoading}
          />
          <button
            id="chat-send-btn"
            onClick={() => { cancelAutoSend(); handleSend(); }}
            disabled={!input.trim() || isLoading}
            className="w-14 h-14 rounded-xl bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-40 shadow-md"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
