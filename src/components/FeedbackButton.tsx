import { useState } from "react";
import { MessageCircle, Star, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

const CATEGORIES = [
  { value: "bug", label: "🐛 Bug" },
  { value: "suggestion", label: "💡 Suggestion" },
  { value: "compliment", label: "👍 Compliment" },
  { value: "question", label: "❓ Question" },
];

export default function FeedbackButton() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [category, setCategory] = useState("suggestion");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  if (!user) return null;

  const handleSend = async () => {
    if (!rating || !message.trim()) {
      toast.error("Merci de noter et d'écrire un message");
      return;
    }
    setSending(true);
    const { error } = await supabase.from("feedback" as any).insert({
      user_id: user.id,
      rating,
      category,
      message: message.trim(),
    } as any);
    setSending(false);
    if (error) {
      toast.error("Erreur lors de l'envoi");
      return;
    }
    toast.success("Merci pour votre retour ! 💗");
    setOpen(false);
    setRating(0);
    setCategory("suggestion");
    setMessage("");
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Envoyer un feedback"
        className="fixed bottom-24 left-4 z-40 h-11 px-4 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center gap-2 text-sm font-semibold hover:scale-105 transition-transform"
      >
        <MessageCircle className="w-4 h-4" />
        <span className="hidden sm:inline">Feedback</span>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="bg-card rounded-2xl p-5 w-full max-w-md max-h-[95vh] overflow-y-auto animate-fade-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-base font-bold text-foreground">
                Votre avis nous aide à améliorer NutriMéno 💗
              </h3>
              <button onClick={() => setOpen(false)} className="text-muted-foreground p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mb-4">
              <label className="text-xs text-muted-foreground block mb-2">Note</label>
              <div className="flex gap-2 justify-center">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    onClick={() => setRating(n)}
                    className="p-1"
                    aria-label={`${n} étoile${n > 1 ? "s" : ""}`}
                  >
                    <Star
                      className={`w-8 h-8 transition-colors ${
                        n <= rating
                          ? "fill-yellow-400 text-yellow-400"
                          : "text-muted-foreground"
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-4">
              <label className="text-xs text-muted-foreground block mb-2">Catégorie</label>
              <div className="grid grid-cols-2 gap-2">
                {CATEGORIES.map((c) => (
                  <button
                    key={c.value}
                    onClick={() => setCategory(c.value)}
                    className={`min-h-11 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                      category === c.value
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-4">
              <label className="text-xs text-muted-foreground block mb-2">Message</label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Décrivez votre retour..."
                className="w-full h-24 bg-muted rounded-lg p-3 text-base text-foreground placeholder:text-muted-foreground resize-none border border-border focus:outline-none focus:ring-2 focus:ring-primary/30"
                style={{ fontSize: "16px" }}
              />
            </div>

            <button
              onClick={handleSend}
              disabled={sending || !rating || !message.trim()}
              className="w-full min-h-11 py-3 bg-primary text-primary-foreground rounded-lg font-semibold disabled:opacity-50"
            >
              {sending ? "Envoi..." : "Envoyer"}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
