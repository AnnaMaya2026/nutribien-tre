import { useEffect, useState, useCallback } from "react";
import { X, Star, ChevronLeft, Loader2, Bot, User as UserIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";

interface SophieMessage {
  id: string;
  conversation_date: string;
  role: "user" | "sophie";
  message: string;
  pinned: boolean;
  created_at: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
}

function formatDateLabel(dateStr: string): string {
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  const todayStr = today.toISOString().split("T")[0];
  const yStr = yesterday.toISOString().split("T")[0];
  if (dateStr === todayStr) return "Aujourd'hui";
  if (dateStr === yStr) return "Hier";
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "long" });
}

export default function SophieHistoryDrawer({ open, onClose }: Props) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<SophieMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("sophie_conversations" as any)
      .select("*")
      .eq("user_id", user.id)
      .order("conversation_date", { ascending: false })
      .order("created_at", { ascending: true });
    if (error) {
      console.error(error);
      toast("Erreur lors du chargement de l'historique");
    } else {
      setMessages((data ?? []) as unknown as SophieMessage[]);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (open) {
      load();
      setSelectedDate(null);
    }
  }, [open, load]);

  const togglePin = async (msg: SophieMessage) => {
    const next = !msg.pinned;
    setMessages((prev) => prev.map((m) => (m.id === msg.id ? { ...m, pinned: next } : m)));
    const { error } = await supabase
      .from("sophie_conversations" as any)
      .update({ pinned: next })
      .eq("id", msg.id);
    if (error) {
      toast("Erreur lors de la mise à jour");
      setMessages((prev) => prev.map((m) => (m.id === msg.id ? { ...m, pinned: !next } : m)));
    }
  };

  if (!open) return null;

  // Group by date
  const grouped: Record<string, SophieMessage[]> = {};
  for (const m of messages) {
    (grouped[m.conversation_date] ??= []).push(m);
  }
  const dates = Object.keys(grouped).sort((a, b) => b.localeCompare(a));
  const pinned = messages.filter((m) => m.pinned && m.role === "sophie");

  const dayMessages = selectedDate ? grouped[selectedDate] ?? [] : [];

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col animate-fade-in">
      {/* Header */}
      <div className="px-4 pt-6 pb-3 border-b border-border flex items-center gap-2">
        {selectedDate ? (
          <button
            onClick={() => setSelectedDate(null)}
            className="w-10 h-10 rounded-lg flex items-center justify-center hover:bg-muted"
            aria-label="Retour"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        ) : null}
        <h2 className="text-lg font-bold flex-1">
          {selectedDate ? formatDateLabel(selectedDate) : "Historique des conversations"}
        </h2>
        <button
          onClick={onClose}
          className="w-10 h-10 rounded-lg flex items-center justify-center hover:bg-muted"
          aria-label="Fermer"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 pb-24">
        {loading && (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        )}

        {!loading && !selectedDate && (
          <>
            {/* Pinned advice */}
            {pinned.length > 0 && (
              <section className="space-y-2">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                  <Star className="w-4 h-4 text-primary fill-primary" /> Conseils importants
                </h3>
                <div className="space-y-2">
                  {pinned.map((m) => (
                    <div key={m.id} className="bg-card card-soft rounded-2xl p-3 text-sm">
                      <div className="prose prose-sm max-w-none [&>p]:m-0">
                        <ReactMarkdown>{m.message}</ReactMarkdown>
                      </div>
                      <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
                        <span>{formatDateLabel(m.conversation_date)}</span>
                        <button
                          onClick={() => togglePin(m)}
                          className="flex items-center gap-1 text-primary"
                        >
                          <Star className="w-3.5 h-3.5 fill-primary" /> Désépingler
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Date list */}
            <section className="space-y-2">
              <h3 className="text-sm font-semibold text-foreground">Conversations</h3>
              {dates.length === 0 && (
                <p className="text-sm text-muted-foreground italic py-4 text-center">
                  Aucune conversation enregistrée pour le moment.
                </p>
              )}
              {dates.map((d) => {
                const first = grouped[d][0];
                return (
                  <button
                    key={d}
                    onClick={() => setSelectedDate(d)}
                    className="w-full text-left bg-card card-soft rounded-2xl p-3 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-semibold text-primary">{formatDateLabel(d)}</span>
                      <span className="text-xs text-muted-foreground">
                        {grouped[d].length} message{grouped[d].length > 1 ? "s" : ""}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {first?.message}
                    </p>
                  </button>
                );
              })}
            </section>
          </>
        )}

        {!loading && selectedDate && (
          <div className="space-y-3">
            {dayMessages.map((msg) => (
              <div key={msg.id} className={`flex gap-2 ${msg.role === "user" ? "justify-end" : ""}`}>
                {msg.role === "sophie" && (
                  <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-1">
                    <Bot className="w-3.5 h-3.5 text-primary-foreground" />
                  </div>
                )}
                <div className="flex flex-col gap-1 max-w-[80%]">
                  <div
                    className={`px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                      msg.role === "user"
                        ? "bg-primary text-primary-foreground rounded-br-md"
                        : "bg-card text-card-foreground rounded-bl-md card-soft"
                    }`}
                  >
                    {msg.role === "sophie" ? (
                      <div className="prose prose-sm max-w-none [&>p]:m-0">
                        <ReactMarkdown>{msg.message}</ReactMarkdown>
                      </div>
                    ) : (
                      msg.message
                    )}
                  </div>
                  {msg.role === "sophie" && (
                    <button
                      onClick={() => togglePin(msg)}
                      className="self-start flex items-center gap-1 text-xs text-primary hover:text-primary/80 px-2 py-1 rounded-md"
                    >
                      <Star className={`w-3.5 h-3.5 ${msg.pinned ? "fill-primary" : ""}`} />
                      {msg.pinned ? "Épinglé" : "Épingler"}
                    </button>
                  )}
                </div>
                {msg.role === "user" && (
                  <div className="w-7 h-7 rounded-full bg-accent flex items-center justify-center flex-shrink-0 mt-1">
                    <UserIcon className="w-3.5 h-3.5 text-accent-foreground" />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
