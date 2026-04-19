import { useEffect, useState } from "react";
import { Loader2, Sparkles, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import SophieAvatar from "@/components/SophieAvatar";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";

export default function DailyRecapCard() {
  const { user } = useAuth();
  const [now, setNow] = useState(new Date());
  const [recap, setRecap] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [checkedCache, setCheckedCache] = useState(false);

  // Refresh time once per minute so the card appears at 20:00 without reload
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);

  const isAfter8pm = now.getHours() >= 20;
  const today = now.toISOString().split("T")[0];

  // Try to load existing recap for today
  useEffect(() => {
    if (!user || !isAfter8pm || checkedCache) return;
    (async () => {
      const { data } = await supabase
        .from("daily_recaps")
        .select("recap_text")
        .eq("user_id", user.id)
        .eq("recap_date", today)
        .maybeSingle();
      if (data?.recap_text) setRecap(data.recap_text);
      setCheckedCache(true);
    })();
  }, [user, isAfter8pm, today, checkedCache]);

  const generateRecap = async (force = false) => {
    if (!user) return;
    setLoading(true);
    try {
      if (force) {
        // Delete cached recap to force regeneration
        await supabase
          .from("daily_recaps")
          .delete()
          .eq("user_id", user.id)
          .eq("recap_date", today);
      }
      const { data, error } = await supabase.functions.invoke("daily-recap", {
        body: {},
      });
      if (error) throw error;
      if (!data?.recap) throw new Error("Réponse vide");
      setRecap(data.recap);
    } catch (e: any) {
      console.error("daily-recap error:", e);
      toast.error("Impossible de générer le bilan. Réessayez dans un instant.");
    } finally {
      setLoading(false);
    }
  };

  if (!isAfter8pm) return null;

  return (
    <div className="bg-gradient-to-br from-primary/15 via-card to-card rounded-2xl p-5 card-soft mb-4 animate-fade-in border border-pink-deep/20">
      <div className="flex items-center gap-2.5 mb-3">
        <SophieAvatar size={32} />
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-pink-deep" />
            Récap du jour
          </h3>
          <p className="text-[10px] text-muted-foreground">
            Bilan personnalisé par Sophie
          </p>
        </div>
        {recap && (
          <button
            onClick={() => generateRecap(true)}
            disabled={loading}
            className="text-pink-deep hover:bg-primary/10 rounded-lg p-1.5 transition-colors disabled:opacity-40"
            title="Régénérer"
            aria-label="Régénérer le bilan"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          </button>
        )}
      </div>

      {!recap && !loading && (
        <button
          onClick={() => generateRecap(false)}
          className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm flex items-center justify-center gap-2"
        >
          📊 Voir mon bilan du jour
        </button>
      )}

      {loading && (
        <div className="flex items-center justify-center gap-2 py-4 text-pink-deep">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-xs italic">Sophie prépare votre bilan...</span>
        </div>
      )}

      {recap && !loading && (
        <div className="prose prose-sm prose-pink max-w-none text-foreground text-[13px] leading-relaxed [&>p]:m-0 [&>p+p]:mt-2 [&>ol]:my-2 [&>ul]:my-2">
          <ReactMarkdown>{recap}</ReactMarkdown>
        </div>
      )}
    </div>
  );
}
