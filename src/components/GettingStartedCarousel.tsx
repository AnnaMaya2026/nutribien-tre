import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { X } from "lucide-react";
import { useProfile } from "@/hooks/useProfile";

const SLIDES = [
  {
    icon: "🎤",
    title: "Loggez vos repas facilement",
    text: "Utilisez le micro pour dicter ce que vous avez mangé, ou scannez le code-barres de vos produits.",
    button: "Essayer maintenant →",
    path: "/journal",
  },
  {
    icon: "📊",
    title: "Suivez vos symptômes",
    text: "Évaluez vos symptômes chaque jour pour voir leur évolution et recevoir des conseils personnalisés.",
    button: "Aller aux symptômes →",
    path: "/symptomes",
  },
  {
    icon: "💬",
    title: "Parlez à Sophie",
    text: "Posez vos questions à Sophie, votre nutritionniste IA. Dites-lui ce que vous avez dans le frigo !",
    button: "Parler à Sophie →",
    path: "/chat",
  },
];

export default function GettingStartedCarousel() {
  const navigate = useNavigate();
  const { profile, updateProfile } = useProfile() as any;
  const [index, setIndex] = useState(0);
  const [hidden, setHidden] = useState(false);

  if (!profile) return null;
  if (hidden) return null;
  if (profile.getting_started_dismissed) return null;

  // Show only during the first 3 days after registration
  const createdAt = profile.created_at ? new Date(profile.created_at) : null;
  if (createdAt) {
    const ageMs = Date.now() - createdAt.getTime();
    const threeDaysMs = 3 * 24 * 60 * 60 * 1000;
    if (ageMs > threeDaysMs) return null;
  }

  const dismiss = async () => {
    setHidden(true);
    try {
      await updateProfile.mutateAsync({ getting_started_dismissed: true });
    } catch {}
  };

  const slide = SLIDES[index];

  return (
    <div className="relative bg-gradient-to-br from-primary/15 to-primary/5 border border-primary/20 rounded-2xl p-5 mb-4 animate-fade-in">
      <button
        onClick={dismiss}
        className="absolute top-3 right-3 flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        aria-label="Fermer"
      >
        Fermer <X className="w-3.5 h-3.5" />
      </button>

      <h3 className="text-base font-bold text-foreground mb-3">Par où commencer ? 🌸</h3>

      <div className="bg-card rounded-xl p-4 shadow-sm">
        <div className="text-4xl mb-2">{slide.icon}</div>
        <h4 className="font-semibold text-foreground mb-1">{slide.title}</h4>
        <p className="text-sm text-muted-foreground mb-4 leading-relaxed">{slide.text}</p>
        <button
          onClick={() => navigate(slide.path)}
          className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition"
        >
          {slide.button}
        </button>
      </div>

      <div className="flex justify-center gap-2 mt-4">
        {SLIDES.map((_, i) => (
          <button
            key={i}
            onClick={() => setIndex(i)}
            className={`h-2 rounded-full transition-all ${
              i === index ? "w-6 bg-primary" : "w-2 bg-muted-foreground/30"
            }`}
            aria-label={`Aller au slide ${i + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
