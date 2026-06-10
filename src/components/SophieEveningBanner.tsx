import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Moon, Loader2, ChevronRight } from "lucide-react";
import SophieAvatar from "@/components/SophieAvatar";

export default function SophieEveningBanner() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [now, setNow] = useState(new Date());
  const [message, setMessage] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [generated, setGenerated] = useState(false);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);

  const isAfter7pm = now.getHours() >= 19;
  const today = now.toISOString().split("T")[0];

  // Try cache then generate once
  useEffect(() => {
    if (!user || !isAfter7pm || generated) return;
    (async () => {
      const { data: existing } = await supabase
        .from("sophie_evening_messages" as any)
        .select("*")
        .eq("user_id", user.id)
        .eq("message_date", today)
        .maybeSingle();
      if (existing) {
        setMessage(existing);
        setGenerated(true);
        return;
      }
      setLoading(true);
      try {
        const { data, error } = await supabase.functions.invoke("sophie-evening-message", { body: {} });
        if (error) throw error;
        if (data?.message) setMessage(data.message);
      } catch (e) {
        console.error("evening msg error", e);
      } finally {
        setLoading(false);
        setGenerated(true);
      }
    })();
  }, [user, isAfter7pm, today, generated]);

  if (!isAfter7pm) return null;
  if (!message && !loading) return null;

  return (
    <button
      onClick={() => navigate("/chat", { state: { eveningMessage: message } })}
      className="w-full text-left bg-gradient-to-br from-indigo-50 via-card to-pink-50 dark:from-indigo-950/30 dark:to-pink-950/20 rounded-2xl p-4 card-soft mb-4 animate-fade-in border border-indigo-300/30 hover:border-indigo-400/50 transition-colors"
    >
      <div className="flex items-center gap-3">
        <div className="relative shrink-0">
          <SophieAvatar size={40} />
          <Moon className="w-4 h-4 text-indigo-500 absolute -top-1 -right-1 bg-card rounded-full p-0.5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-foreground">🌙 Sophie a un message pour toi</p>
          {loading ? (
            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
              <Loader2 className="w-3 h-3 animate-spin" /> Préparation...
            </p>
          ) : (
            <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{message?.summary}</p>
          )}
        </div>
        <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0" />
      </div>
    </button>
  );
}
