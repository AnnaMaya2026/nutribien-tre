import { useState, useEffect, useCallback } from "react";
import { useProfile } from "@/hooks/useProfile";
import { Heart, ChevronLeft, ChevronRight, X } from "lucide-react";
import confetti from "canvas-confetti";

const STEPS = [
  {
    type: "welcome" as const,
    title: "Bienvenue dans NutriMéno ! 💗",
    subtitle: "Votre nutritionniste personnalisée pour la ménopause",
  },
  {
    type: "highlight" as const,
    title: "Votre tableau de bord",
    tooltip: "Suivez vos calories et nutriments en temps réel",
    targetSelector: ".calorie-ring-section",
    position: "bottom" as const,
  },
  {
    type: "highlight" as const,
    title: "Journal alimentaire",
    tooltip: "Loggez vos repas par la voix 🎤, le scanner 📷 ou la recherche",
    targetNav: "/journal",
    position: "top" as const,
  },
  {
    type: "highlight" as const,
    title: "Idées repas 🍽️",
    tooltip: "Découvrez des idées de repas personnalisées : par ingrédients disponibles, par recette, pour combler vos manques en nutriments, ou pour atténuer vos symptômes de ménopause.",
    targetNav: "/repas",
    position: "top" as const,
  },
  {
    type: "highlight" as const,
    title: "Sophie, votre nutritionniste",
    tooltip: "Posez vos questions à Sophie, votre nutritionniste IA spécialisée ménopause",
    targetNav: "/chat",
    position: "top" as const,
  },
  {
    type: "highlight" as const,
    title: "Suivi des symptômes",
    tooltip: "Suivez vos symptômes chaque jour et observez votre évolution",
    targetNav: "/symptomes",
    position: "top" as const,
  },
  {
    type: "final" as const,
    title: "Vous êtes prête ! 🎉",
    subtitle: "NutriMéno va vous aider à mieux vivre votre ménopause grâce à la nutrition",
  },
];

export default function OnboardingTutorial({ onComplete }: { onComplete: () => void }) {
  const { updateProfile } = useProfile();
  const [step, setStep] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [slideDirection, setSlideDirection] = useState<"left" | "right">("right");
  const [animating, setAnimating] = useState(false);

  const currentStep = STEPS[step];

  const findTarget = useCallback(() => {
    if (currentStep.type !== "highlight") return null;
    if ("targetSelector" in currentStep && currentStep.targetSelector) {
      return document.querySelector(currentStep.targetSelector);
    }
    if ("targetNav" in currentStep && currentStep.targetNav) {
      const buttons = document.querySelectorAll("nav button");
      for (const btn of buttons) {
        const onclick = btn as HTMLButtonElement;
        if (onclick.textContent?.includes(getNavLabel(currentStep.targetNav))) {
          return btn;
        }
      }
    }
    return null;
  }, [step]);

  useEffect(() => {
    if (currentStep.type === "highlight") {
      const timer = setTimeout(() => {
        const el = findTarget();
        if (el) setTargetRect(el.getBoundingClientRect());
        else setTargetRect(null);
      }, 100);
      return () => clearTimeout(timer);
    } else {
      setTargetRect(null);
    }
  }, [step, findTarget]);

  useEffect(() => {
    if (currentStep.type === "final") {
      confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 } });
    }
  }, [step]);

  const completeOnboarding = async () => {
    try {
      await updateProfile.mutateAsync({ onboarding_completed: true } as any);
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

  const tooltipStyle = (): React.CSSProperties => {
    if (!targetRect) return { top: "50%", left: "50%", transform: "translate(-50%, -50%)" };
    const isTop = "position" in currentStep && currentStep.position === "top";
    if (isTop) {
      return {
        bottom: `${window.innerHeight - targetRect.top + 16}px`,
        left: `${Math.max(16, Math.min(targetRect.left + targetRect.width / 2 - 140, window.innerWidth - 296))}px`,
      };
    }
    return {
      top: `${targetRect.bottom + 16}px`,
      left: `${Math.max(16, Math.min(targetRect.left + targetRect.width / 2 - 140, window.innerWidth - 296))}px`,
    };
  };

  return (
    <div className="fixed inset-0 z-[9999]">
      {/* Overlay */}
      {currentStep.type === "highlight" && targetRect ? (
        <svg className="absolute inset-0 w-full h-full" style={{ pointerEvents: "none" }}>
          <defs>
            <mask id="spotlight">
              <rect width="100%" height="100%" fill="white" />
              <rect
                x={targetRect.left - 8}
                y={targetRect.top - 8}
                width={targetRect.width + 16}
                height={targetRect.height + 16}
                rx="12"
                fill="black"
              />
            </mask>
          </defs>
          <rect width="100%" height="100%" fill="rgba(0,0,0,0.6)" mask="url(#spotlight)" style={{ pointerEvents: "auto" }} />
        </svg>
      ) : (
        <div className="absolute inset-0 bg-black/60" />
      )}

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
        style={
          currentStep.type === "welcome" || currentStep.type === "final"
            ? { top: "50%", left: "50%", transform: `translate(-50%, -50%) ${animating ? (slideDirection === "right" ? "translateX(32px)" : "translateX(-32px)") : ""}` }
            : tooltipStyle()
        }
      >
        {currentStep.type === "welcome" && (
          <div className="bg-white rounded-3xl p-8 max-w-sm mx-auto text-center shadow-2xl">
            <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-4">
              <Heart className="w-8 h-8 text-primary" fill="hsl(var(--primary))" />
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

        {currentStep.type === "highlight" && (
          <div className="bg-white rounded-2xl p-5 max-w-[280px] shadow-2xl border border-primary/20">
            <h3 className="font-bold text-foreground text-sm mb-1">{currentStep.title}</h3>
            <p className="text-muted-foreground text-xs leading-relaxed">{currentStep.tooltip}</p>
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
