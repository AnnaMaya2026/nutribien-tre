import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Loader2, Target, Check } from "lucide-react";
import { toast } from "sonner";

export default function DailyChallengeCard() {
  const { user } = useAuth();
  const [challenge, setChallenge] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);

  const hour = now.getHours();
  const isAfter8am = hour >= 8;
  // After 5pm local time, generate the challenge for TOMORROW.
  const forTomorrow = hour >= 17;
  const targetDate = new Date(now);
  if (forTomorrow) targetDate.setDate(targetDate.getDate() + 1);
  const targetKey = targetDate.toISOString().split("T")[0];

  useEffect(() => {
    if (!user || !isAfter8am) return;
    (async () => {
      const { data } = await supabase
        .from("daily_challenges" as any)
        .select("*")
        .eq("user_id", user.id)
        .eq("challenge_date", targetKey)
        .maybeSingle();
      if (data) setChallenge(data);
      else setChallenge(null);
    })();
  }, [user, isAfter8am, targetKey]);

  const generate = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("daily-challenge", {
        body: { target_date: targetKey },
      });
      if (error) throw error;
      if (data?.challenge) setChallenge(data.challenge);
    } catch (e) {
      console.error(e);
      toast.error("Impossible de générer le défi.");
    } finally {
      setLoading(false);
    }
  };

  const markDone = async () => {
    if (!challenge || challenge.completed) return;
    const { data, error } = await supabase
      .from("daily_challenges" as any)
      .update({ completed: true, completed_at: new Date().toISOString() })
      .eq("id", challenge.id)
      .select()
      .single();
    if (!error && data) {
      setChallenge(data);
      toast.success("Défi relevé ! 🎉");
    }
  };

  if (!isAfter8am) return null;

  const title = forTomorrow ? "🌅 Défi pour demain" : "🎯 Défi du jour";

  return (
    <div className="bg-gradient-to-br from-amber-50 via-card to-card dark:from-amber-950/20 rounded-2xl p-5 card-soft mb-4 animate-fade-in border border-amber-400/30">
      <div className="flex items-center gap-2 mb-2">
        <Target className="w-5 h-5 text-amber-600" />
        <h3 className="text-base font-semibold text-foreground">{title}</h3>
      </div>

      {!challenge && !loading && (
        <button
          onClick={generate}
          className="w-full py-3 rounded-xl bg-amber-500 text-white font-semibold text-sm"
        >
          {forTomorrow ? "Préparer mon défi de demain" : "Découvrir mon défi"}
        </button>
      )}

      {loading && (
        <div className="flex items-center gap-2 py-3 text-amber-700">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-sm italic">Sophie prépare ton défi...</span>
        </div>
      )}

      {challenge && !loading && (
        <>
          <p className="text-sm text-foreground leading-relaxed mb-3">{challenge.challenge_text}</p>
          {challenge.completed ? (
            <div className="flex items-center gap-2 text-green-600 text-sm font-semibold">
              <Check className="w-4 h-4" /> Défi relevé !
            </div>
          ) : forTomorrow ? (
            <p className="text-xs text-muted-foreground italic">
              Tu pourras le valider demain.
            </p>
          ) : (
            <button
              onClick={markDone}
              className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-semibold text-sm transition-colors"
            >
              ✅ J'ai relevé le défi
            </button>
          )}
        </>
      )}
    </div>
  );
}
