import { useState, useEffect } from "react";
import { BookOpen, HelpCircle } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import HelpCarousel from "./HelpCarousel";
import GettingStartedCarousel from "./GettingStartedCarousel";

interface Props {
  /** When true, automatically opens the Getting Started guide once on mount. */
  autoOpenGuide?: boolean;
  onAutoOpenConsumed?: () => void;
}

export default function HelpMenu({ autoOpenGuide, onAutoOpenConsumed }: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);

  useEffect(() => {
    if (autoOpenGuide) {
      setGuideOpen(true);
      onAutoOpenConsumed?.();
    }
  }, [autoOpenGuide, onAutoOpenConsumed]);

  return (
    <>
      <Popover open={menuOpen} onOpenChange={setMenuOpen}>
        <PopoverTrigger asChild>
          <button
            className="flex items-center gap-1.5 min-h-[44px] px-4 py-2 rounded-[20px] border-2 border-primary bg-background text-pink-deep text-[15px] font-medium hover:bg-primary/10 transition-colors shrink-0"
            aria-label="Aide"
            title="Aide"
          >
            <span aria-hidden="true">❓</span> Aide
          </button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-64 p-2">
          <button
            onClick={() => {
              setMenuOpen(false);
              setGuideOpen(true);
            }}
            className="w-full flex items-start gap-3 p-3 rounded-lg hover:bg-muted transition text-left"
          >
            <BookOpen className="w-5 h-5 text-primary shrink-0 mt-0.5" />
            <div>
              <div className="font-medium text-sm text-foreground">📖 Guide de démarrage</div>
              <div className="text-xs text-muted-foreground">Par où commencer ?</div>
            </div>
          </button>
          <button
            onClick={() => {
              setMenuOpen(false);
              setHelpOpen(true);
            }}
            className="w-full flex items-start gap-3 p-3 rounded-lg hover:bg-muted transition text-left"
          >
            <HelpCircle className="w-5 h-5 text-primary shrink-0 mt-0.5" />
            <div>
              <div className="font-medium text-sm text-foreground">❓ Comment ça marche ?</div>
              <div className="text-xs text-muted-foreground">Découvrez chaque fonctionnalité</div>
            </div>
          </button>
        </PopoverContent>
      </Popover>

      <GettingStartedCarousel open={guideOpen} onClose={() => setGuideOpen(false)} />
      <HelpCarousel open={helpOpen} onClose={() => setHelpOpen(false)} />
    </>
  );
}
