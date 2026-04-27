import { useState } from "react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

const SLIDES = [
  {
    title: "Loggez vos repas en 3 façons",
    text: `• Micro 🎤 : dites ce que vous avez mangé
• Scanner 📷 : scannez le code-barres
• Recherche 🔍 : tapez le nom de l'aliment

Organisez par repas et ajustez les portions`,
    image: "/help/journal_alimentaire.png",
  },
  {
    title: "Suivez vos nutriments clés",
    text: `Calories, macros et micronutriments prioritaires ménopause en temps réel.

🔴 insuffisant / 🟠 moyen / 🟢 atteint`,
    image: "/help/accueil.png",
  },
  {
    title: "Suivez l'évolution de vos symptômes",
    text: `• Évaluez chaque jour de 1 à 10
• Visualisez l'évolution dans le temps
• Recevez des conseils nutritionnels adaptés`,
    image: "/help/symptomes.png",
  },
  {
    title: "Des suggestions personnalisées",
    text: `• Par nutriment manquant
• Par recette
• Pour atténuer vos symptômes
• Pour combler vos manques`,
    image: "/help/idees.png",
  },
  {
    title: "Sophie, votre nutritionniste IA",
    text: `• Posez vos questions par écrit ou à la voix
• Dites-lui ce que vous avez dans le frigo
• Demandez un menu pour la semaine`,
    image: "/help/sophie.png",
  },
  {
    title: "Routines et habitudes",
    text: `• Créez vos routines quotidiennes
• Suivez vos habitudes à surveiller
• Corrélation avec vos symptômes`,
    image: "/help/routines_habitudes.png",
  },
];

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function HelpCarousel({ open, onClose }: Props) {
  const [index, setIndex] = useState(0);

  const slide = SLIDES[index];
  const isLast = index === SLIDES.length - 1;
  const isFirst = index === 0;

  const close = () => {
    onClose();
    setTimeout(() => setIndex(0), 200);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => (o ? null : close())}>
      <DialogContent className="max-w-md p-0 gap-0 overflow-hidden border-primary/20 max-h-[90vh] flex flex-col">
        <DialogTitle className="sr-only">Aide — {slide.title}</DialogTitle>
        <DialogDescription className="sr-only">{slide.text}</DialogDescription>

        <div className="bg-gradient-to-br from-primary/15 to-primary/5 px-5 pt-5 pb-3 flex items-center justify-between shrink-0">
          <h3 className="text-base font-bold text-foreground">Comment ça marche ? 🌸</h3>
          <button
            onClick={close}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            aria-label="Fermer"
          >
            Fermer <X className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="px-5 py-5 bg-card animate-fade-in overflow-y-auto flex-1" key={index}>
          <h4 className="font-semibold text-foreground mb-2 text-lg">{slide.title}</h4>
          <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line mb-4">
            {slide.text}
          </p>
          <div className="flex justify-center">
            <img
              src={slide.image}
              alt={slide.title}
              className="rounded-xl shadow-md max-h-[300px] w-auto object-contain"
              loading="lazy"
            />
          </div>
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
