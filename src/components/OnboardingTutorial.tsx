import { useState, useEffect } from "react";
import { useProfile } from "@/hooks/useProfile";
import { useAuth } from "@/hooks/useAuth";
import { getDisplayName } from "@/lib/displayName";
import { Heart, ChevronLeft, ChevronRight, X } from "lucide-react";
import confetti from "canvas-confetti";

const buildSteps = (name: string) => [
  {
    type: "welcome" as const,
    title: name ? `Bienvenue ${name} ! 💗` : "Bienvenue dans NutriMéno ! 💗",
    subtitle: "Découvrez en 30 secondes comment NutriMéno va vous accompagner",
  },
  {
    type: "info" as const,
    title: "Votre tableau de bord 📊",
    subtitle: "Suivez vos calories et nutriments clés en temps réel, adaptés à vos besoins ménopausiques.",
  },
  {
    type: "info" as const,
    title: "Journal alimentaire 🍽️",
    subtitle:
      "• Dictez vos repas à la voix 🎤\n• Scannez les codes-barres 📷\n• Recherchez manuellement vos aliments",
  },
  {
    type: "info" as const,
    title: "Idées repas ✨",
    subtitle:
      "Trouvez des idées de repas :\n• Par ingrédients du frigo\n• Par recette\n• Pour combler vos manques\n• Pour atténuer vos symptômes",
  },
  {
    type: "info" as const,
    title: "Sophie, votre nutritionniste 💬",
    subtitle:
      "Posez vos questions à Sophie, votre nutritionniste IA spécialisée en ménopause — elle vous répond et vous parle 🎙️",
  },
  {
    type: "info" as const,
    title: "Suivi des symptômes 📈",
    subtitle:
      "Évaluez vos symptômes chaque jour et observez leur évolution dans le temps pour mieux les comprendre.",
  },
  {
    type: "info" as const,
    title: "Notes, Routines & Habitudes 📝",
    subtitle:
      "• Notez vos événements de vie\n• Créez vos routines quotidiennes (compléments, sport...)\n• Suivez vos habitudes à surveiller (café, alcool, hydratation...)",
  },
  {
    type: "final" as const,
    title: "Vous êtes prête ! 🎉",
    subtitle: "NutriMéno va vous accompagner chaque jour pour mieux vivre votre ménopause grâce à la nutrition 💗",
  },
];

export default function OnboardingTutorial({ onComplete }: { onComplete: () => void }) {
  const { updateProfile, profile } = useProfile() as any;
  const { user } = useAuth();
  const displayName = getDisplayName(profile?.display_name, user?.email);
  const STEPS = buildSteps(displayName);
  const [step, setStep] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [slideDirection, setSlideDirection] = useState<"left" | "right">("right");
  const [animating, setAnimating] = useState(false);

  const currentStep = STEPS[step];

  useEffect(() => {
    if (currentStep.type === "final") {
      confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 } });
    }
  }, [step]);

  const completeOnboarding = async () => {
    try {
      await updateProfile.mutateAsync({ feature_tour_completed: true, onboarding_completed: true } as any);
    } catch {}
    onComplete();
  };

  const goNext = () => {
    if (animating) return;
    if (step >= STEPS.length - 1) {
      completeOnboarding();
      return;
    }
    setSlideDirection("right");
    setAnimating(true);
    setTimeout(() => { setStep(s => s + 1); setAnimating(false); }, 250);
  };

  const goPrev = () => {
    if (animating || step <= 0) return;
    setSlideDirection("left");
    setAnimating(true);
    setTimeout(() => { setStep(s => s - 1); setAnimating(false); }, 250);
  };

  return (
    <div className="fixed inset-0 z-[9999]">
      <div className="absolute inset-0 bg-black/60" />

      {/* Skip button */}
      {step < STEPS.length - 1 && (
        <button
          onClick={completeOnboarding}
          className="absolute top-4 right-4 z-10 text-white/70 hover:text-white flex items-center gap-1 text-sm"
        >
          Passer <X className="w-4 h-4" />
        </button>
      )}

      {/* Content card */}
      <div
        className={`absolute z-10 transition-all duration-250 ${
          animating
            ? slideDirection === "right" ? "opacity-0 translate-x-8" : "opacity-0 -translate-x-8"
            : "opacity-100 translate-x-0"
        }`}
        style={{ top: "50%", left: "50%", transform: `translate(-50%, -50%) ${animating ? (slideDirection === "right" ? "translateX(32px)" : "translateX(-32px)") : ""}` }}
      >
        {currentStep.type === "welcome" && (
          <div className="bg-white rounded-3xl p-8 max-w-sm mx-auto text-center shadow-2xl">
            <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-4">
              <Heart className="w-8 h-8 text-pink-deep" fill="hsl(var(--primary))" />
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-2">{currentStep.title}</h2>
            <p className="text-muted-foreground text-sm mb-6">{currentStep.subtitle}</p>
            <button
              onClick={goNext}
              className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition"
            >
              Commencer
            </button>
          </div>
        )}

        {currentStep.type === "info" && (
          <div className="bg-white rounded-3xl p-8 max-w-sm mx-auto text-center shadow-2xl">
            <h2 className="text-xl font-bold text-foreground mb-3">{currentStep.title}</h2>
            <p className="text-muted-foreground text-sm mb-6 whitespace-pre-line text-left leading-relaxed">{currentStep.subtitle}</p>
            <button
              onClick={goNext}
              className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition"
            >
              Suivant →
            </button>
          </div>
        )}

        {currentStep.type === "info" && (
          <div className="bg-white rounded-3xl p-8 max-w-sm mx-auto text-center shadow-2xl">
            <h2 className="text-xl font-bold text-foreground mb-3">{currentStep.title}</h2>
            <p className="text-muted-foreground text-sm mb-6 whitespace-pre-line text-left leading-relaxed">{currentStep.subtitle}</p>
            <button
              onClick={goNext}
              className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition"
            >
              Suivant →
            </button>
          </div>
        )}

        {currentStep.type === "final" && (
          <div className="bg-white rounded-3xl p-8 max-w-sm mx-auto text-center shadow-2xl">
            <div className="text-5xl mb-4">🎉</div>
            <h2 className="text-2xl font-bold text-foreground mb-2">{currentStep.title}</h2>
            <p className="text-muted-foreground text-sm mb-6">{currentStep.subtitle}</p>
            <button
              onClick={completeOnboarding}
              className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition"
            >
              Commencer mon suivi
            </button>
          </div>
        )}
      </div>

      {/* Navigation: dots + arrows */}
      {currentStep.type !== "welcome" && currentStep.type !== "final" && (
        <div className="absolute bottom-8 left-0 right-0 flex items-center justify-center gap-4 z-10">
          <button onClick={goPrev} disabled={step === 0} className="w-10 h-10 rounded-full bg-white/20 text-white flex items-center justify-center disabled:opacity-30">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="flex gap-2">
            {STEPS.map((_, i) => (
              <div key={i} className={`w-2 h-2 rounded-full transition-all ${i === step ? "bg-primary w-5" : "bg-white/40"}`} />
            ))}
          </div>
          <button onClick={goNext} className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Progress dots for welcome/final */}
      {(currentStep.type === "welcome" || currentStep.type === "final") && (
        <div className="absolute bottom-8 left-0 right-0 flex justify-center gap-2 z-10">
          {STEPS.map((_, i) => (
            <div key={i} className={`w-2 h-2 rounded-full transition-all ${i === step ? "bg-primary w-5" : "bg-white/40"}`} />
          ))}
        </div>
      )}
    </div>
  );
}

function getNavLabel(path: string): string {
  const map: Record<string, string> = {
    "/journal": "Repas",
    "/repas": "Idées",
    "/chat": "Nutritionniste",
    "/symptomes": "Symptômes",
  };
  return map[path] || "";
}
