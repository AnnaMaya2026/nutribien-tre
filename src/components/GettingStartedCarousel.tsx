import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

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

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function GettingStartedCarousel({ open, onClose }: Props) {
  const navigate = useNavigate();
  const [index, setIndex] = useState(0);

  const slide = SLIDES[index];
  const isLast = index === SLIDES.length - 1;
  const isFirst = index === 0;

  const close = () => {
    onClose();
    setTimeout(() => setIndex(0), 200);
  };

  const handleAction = () => {
    navigate(slide.path);
    close();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => (o ? null : close())}>
      <DialogContent className="max-w-md p-0 gap-0 overflow-hidden border-primary/20 max-h-[90vh] flex flex-col">
        <DialogTitle className="sr-only">Guide de démarrage — {slide.title}</DialogTitle>
        <DialogDescription className="sr-only">{slide.text}</DialogDescription>

        <div className="bg-gradient-to-br from-primary/15 to-primary/5 px-5 pt-5 pb-3 flex items-center justify-between shrink-0">
          <h3 className="text-base font-bold text-foreground">Par où commencer ? 🌸</h3>
          <button
            onClick={close}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            aria-label="Fermer"
          >
            Fermer <X className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="px-5 py-5 bg-card animate-fade-in overflow-y-auto flex-1" key={index}>
          <div className="text-5xl mb-3 text-center">{slide.icon}</div>
          <h4 className="font-semibold text-foreground mb-2 text-lg text-center">{slide.title}</h4>
          <p className="text-sm text-muted-foreground leading-relaxed mb-5 text-center">
            {slide.text}
          </p>
          <button
            onClick={handleAction}
            className="w-full py-3 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition"
          >
            {slide.button}
          </button>
        </div>

        <div className="flex justify-center gap-2 py-3 bg-card border-t border-border shrink-0">
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

        <div className="flex items-center justify-between gap-2 px-4 py-3 bg-card border-t border-border shrink-0">
          <button
            onClick={() => setIndex((i) => Math.max(0, i - 1))}
            disabled={isFirst}
            className="flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium text-foreground hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition"
          >
            <ChevronLeft className="w-4 h-4" />
            Précédent
          </button>
          <span className="text-xs text-muted-foreground">
            {index + 1} / {SLIDES.length}
          </span>
          {isLast ? (
            <button
              onClick={close}
              className="px-4 py-2 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition"
            >
              Terminer
            </button>
          ) : (
            <button
              onClick={() => setIndex((i) => Math.min(SLIDES.length - 1, i + 1))}
              className="flex items-center gap-1 px-3 py-2 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition"
            >
              Suivant
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
