import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/useProfile";
import { Loader2, Sparkles } from "lucide-react";

type Diagnosis = {
  likely_deficiencies: { nutrient: string; reason: string; emoji: string }[];
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
        // Fallback minimal
        setData({
          likely_deficiencies: [
            { nutrient: "Magnésium", reason: "Souvent insuffisant chez les femmes en ménopause", emoji: "✨" },
            { nutrient: "Vitamine D", reason: "Carence très fréquente après 45 ans", emoji: "☀️" },
            { nutrient: "Oméga-3", reason: "Apports souvent en-dessous des besoins", emoji: "🐟" },
          ],
          empathy_message: "Ce que tu ressens n'est pas dans ta tête. Ton corps traverse des changements réels, et ton alimentation peut t'aider à mieux les vivre.",
          promise_message: "NutriMéno va t'accompagner chaque jour pour identifier tes besoins, suivre tes apports, et te proposer des conseils concrets adaptés à toi.",
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
          <p className="text-sm text-muted-foreground mt-2">Analyse personnalisée par Sophie</p>
        </div>

        <div className="space-y-3 mb-5">
          <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide">
            Carences probables pour votre profil
          </h2>
          {data.likely_deficiencies.slice(0, 3).map((d, i) => (
            <div
              key={i}
              className="bg-card rounded-2xl p-4 border border-border/50 card-soft flex gap-3 items-start"
            >
              <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center text-xl flex-shrink-0">
                {d.emoji}
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-foreground mb-0.5">{d.nutrient}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{d.reason}</p>
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
            (Diagnostic général affiché — l'analyse personnalisée sera bientôt disponible.)
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
