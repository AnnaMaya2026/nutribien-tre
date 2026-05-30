import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/useProfile";
import { Loader2, Sparkles } from "lucide-react";

type Insight = {
  title: string;
  explanation: string;
  action: string;
  emoji: string;
};

type Diagnosis = {
  insights: Insight[];
  empathy_message: string;
  promise_message: string;
};

export default function DiagnosisPage() {
  const { updateProfile } = useProfile();
  const [data, setData] = useState<Diagnosis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const { data, error } = await supabase.functions.invoke("generate-diagnosis", { body: {} });
        if (error) throw error;
        if (data?.error) throw new Error(data.error);
        setData(data as Diagnosis);
      } catch (e: any) {
        console.error(e);
        setError(e.message || "Erreur");
        // Fallback minimal avec insights
        setData({
          insights: [
            { title: "Le magnésium change de forme", explanation: "Avec la baisse d'oestrogènes, ton corps absorbe moins bien le magnésium oxyde — la forme la plus courante dans les compléments bon marché. Le bisglycinate est 4x mieux absorbé.", action: "Vérifie la forme de magnésium dans ton complément. Si c'est de l'oxyde, envisage de changer.", emoji: "✨" },
            { title: "Vitamine D sans K2 = danger", explanation: "La vitamine D seule augmente le calcium dans le sang, mais sans K2 (MK-7), ce calcium se dépose dans les artères au lieu des os. C'est le mécanisme des calcifications vasculaires.", action: "Si tu prends de la vitamine D, assure-toi qu'elle contient aussi de la K2 MK-7.", emoji: "☀️" },
            { title: "Le microbiote décide du soja", explanation: "Les phytoestrogènes du soja (isoflavones) sont métabolisés par des bactéries intestinales en équol — mais seulement 30-50% des femmes ont le microbiote adéquat pour ça.", action: "Si le soja ne semble pas t'aider, ce n'est peut-être pas toi, c'est ton microbiote.", emoji: "🌱" },
          ],
          empathy_message: "Ce que tu ressens n'est pas dans ta tête. Ton corps traverse des changements réels, et la science nutritionnelle a des réponses précises — pas seulement des conseils génériques.",
          promise_message: "NutriMéno va t'accompagner chaque jour avec des insights comme ceux-ci, adaptés à ton profil et ton évolution.",
        });
      }
    })();
  }, []);

  const handleStart = async () => {
    setSubmitting(true);
    try {
      await updateProfile.mutateAsync({ seen_diagnosis: true, seen_welcome: true } as any);
    } catch (e) {
      console.error(e);
      setSubmitting(false);
    }
  };

  if (!data) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-6 text-center">
        <Loader2 className="w-8 h-8 text-pink-deep animate-spin mb-4" />
        <p className="text-foreground font-medium">Sophie prépare votre diagnostic personnalisé…</p>
        <p className="text-sm text-muted-foreground mt-2">Quelques secondes seulement 💗</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background px-5 py-8">
      <div className="max-w-md mx-auto animate-fade-in">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-primary/15 mb-3">
            <Sparkles className="w-7 h-7 text-pink-deep" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Votre profil nutritionnel 💗</h1>
          <p className="text-sm text-muted-foreground mt-2">Insights personnalisés par Sophie</p>
        </div>

        <div className="space-y-3 mb-5">
          <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide">
            Découvertes surprenantes pour votre profil
          </h2>
          {data.insights.slice(0, 3).map((insight, i) => (
            <div
              key={i}
              className="bg-card rounded-2xl p-4 border border-border/50 card-soft flex gap-3 items-start"
            >
              <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center text-xl flex-shrink-0">
                {insight.emoji}
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-foreground mb-1">{insight.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed mb-2">{insight.explanation}</p>
                <p className="text-xs font-medium text-primary leading-relaxed">→ {insight.action}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="bg-primary/10 rounded-2xl p-5 border border-primary/20 mb-3">
          <p className="text-sm text-foreground leading-relaxed whitespace-pre-line">
            {data.empathy_message}
          </p>
        </div>

        <div className="bg-card rounded-2xl p-5 border border-border/50 card-soft mb-6">
          <h3 className="text-sm font-semibold text-foreground mb-2">
            ✨ Ce que NutriMéno va faire pour vous
          </h3>
          <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
            {data.promise_message}
          </p>
        </div>

        {error && (
          <p className="text-xs text-muted-foreground text-center mb-3">
            (Insights généraux affichés — l'analyse personnalisée sera bientôt disponible.)
          </p>
        )}

        <button
          onClick={handleStart}
          disabled={submitting}
          className="w-full h-14 rounded-xl bg-primary text-primary-foreground font-semibold text-base disabled:opacity-50"
        >
          {submitting ? "..." : "Commencer mon suivi →"}
        </button>
      </div>
    </div>
  );
}
