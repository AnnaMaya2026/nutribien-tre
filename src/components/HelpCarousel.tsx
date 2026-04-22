import { useState } from "react";
import { X, ChevronLeft, ChevronRight, HelpCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

const SLIDES = [
  {
    icon: "🎤",
    title: "Loggez vos repas en 3 façons",
    text: `• Micro 🎤 : dites ce que vous avez mangé
• Scanner 📷 : scannez le code-barres
• Recherche 🔍 : tapez le nom de l'aliment

Ajustez les portions et organisez par repas (petit-déjeuner, déjeuner...).`,
  },
  {
    icon: "📊",
    title: "Suivez vos nutriments clés",
    text: `Le dashboard affiche en temps réel :
• Calories et macros (protéines, glucides, lipides)
• Micronutriments prioritaires ménopause (calcium, vitamine D, magnésium, oméga-3...)
• Codes couleur : 🔴 insuffisant / 🟠 moyen / 🟢 objectif atteint`,
  },
  {
    icon: "📈",
    title: "Suivez l'évolution de vos symptômes",
    text: `• Évaluez vos symptômes chaque jour (1-10)
• Visualisez leur évolution dans le temps
• Recevez des conseils nutritionnels adaptés à vos symptômes du jour
• Notez vos compléments et routines pour mesurer leur impact`,
  },
  {
    icon: "🍽️",
    title: "Des suggestions personnalisées pour vous",
    text: `4 types de suggestions :
• Par nutriment manquant
• Par recette
• Pour atténuer vos symptômes
• Pour combler vos manques nutritionnels

Toutes générées selon votre profil du jour.`,
  },
  {
    icon: "💬",
    title: "Sophie, votre nutritionniste IA",
    text: `• Posez vos questions par écrit ou à la voix
• Dites-lui ce que vous avez dans le frigo
• Demandez-lui un menu pour la semaine
• Elle connaît vos données nutritionnelles et adapte ses conseils en temps réel`,
  },
  {
    icon: "✅",
    title: "Routines et habitudes",
    text: `• Créez vos routines quotidiennes (compléments, sport, bien-être)
• Cochez-les chaque jour en un tap
• Suivez vos habitudes à surveiller (café, alcool, hydratation...)
• Corrélation automatique avec vos symptômes`,
  },
];

export default function HelpCarousel() {
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);

  const slide = SLIDES[index];
  const isLast = index === SLIDES.length - 1;
  const isFirst = index === 0;

  const close = () => {
    setOpen(false);
    setTimeout(() => setIndex(0), 200);
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center justify-center w-9 h-9 rounded-full bg-primary/15 hover:bg-primary/25 text-pink-deep transition-colors shrink-0"
        aria-label="Aide"
        title="Aide"
      >
        <HelpCircle className="w-5 h-5" />
      </button>

      <Dialog open={open} onOpenChange={(o) => (o ? setOpen(true) : close())}>
        <DialogContent className="max-w-md p-0 gap-0 overflow-hidden border-primary/20">
          <DialogTitle className="sr-only">Aide — {slide.title}</DialogTitle>
          <DialogDescription className="sr-only">{slide.text}</DialogDescription>

          <div className="bg-gradient-to-br from-primary/15 to-primary/5 px-5 pt-5 pb-3 flex items-center justify-between">
            <h3 className="text-base font-bold text-foreground">Comment ça marche ? 🌸</h3>
            <button
              onClick={close}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
              aria-label="Fermer"
            >
              Fermer <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="px-5 py-6 bg-card animate-fade-in" key={index}>
            <div className="text-5xl mb-3">{slide.icon}</div>
            <h4 className="font-semibold text-foreground mb-2 text-lg">{slide.title}</h4>
            <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
              {slide.text}
            </p>
          </div>

          <div className="flex justify-center gap-2 py-3 bg-card border-t border-border">
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

          <div className="flex items-center justify-between gap-2 px-4 py-3 bg-card border-t border-border">
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
    </>
  );
}
