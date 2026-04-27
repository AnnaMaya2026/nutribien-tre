import { useProfile } from "@/hooks/useProfile";
import { Target, MessageCircle, BarChart3 } from "lucide-react";

const FEATURES = [
  {
    icon: Target,
    emoji: "🎯",
    title: "Suivi nutritionnel personnalisé",
    text: "13 nutriments clés adaptés à vos besoins ménopausiques",
  },
  {
    icon: MessageCircle,
    emoji: "💬",
    title: "Sophie, votre nutritionniste IA",
    text: "Conseils personnalisés et vocaux disponibles 24h/24",
  },
  {
    icon: BarChart3,
    emoji: "📊",
    title: "Corrélation symptômes & nutrition",
    text: "Comprenez l'impact de votre alimentation sur vos symptômes",
  },
];

export default function IntroPage() {
  const { updateProfile } = useProfile();

  const handleStart = async () => {
    try {
      await updateProfile.mutateAsync({ seen_welcome: true } as any);
    } catch {}
  };

  return (
    <div className="min-h-screen bg-background flex flex-col px-6 py-10">
      <div className="w-full max-w-md mx-auto flex-1 flex flex-col animate-fade-in">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-foreground mb-2">
            Bienvenue sur NutriMéno 💗
          </h1>
          <p className="text-sm text-muted-foreground">
            L'application nutritionnelle conçue pour les femmes de 45 ans et plus
          </p>
        </div>

        <div className="space-y-3 flex-1">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="bg-card rounded-2xl p-4 card-soft border border-border/50 flex gap-3 items-start"
            >
              <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center text-xl flex-shrink-0">
                {f.emoji}
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-foreground mb-0.5">
                  {f.title}
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {f.text}
                </p>
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={handleStart}
          disabled={updateProfile.isPending}
          className="w-full mt-8 h-12 rounded-xl bg-primary text-primary-foreground font-semibold text-base disabled:opacity-50"
        >
          Commencer mon suivi →
        </button>
      </div>
    </div>
  );
}
