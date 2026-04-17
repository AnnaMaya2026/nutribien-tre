import { ChevronLeft } from "lucide-react";
import { ReactNode } from "react";

export default function OnboardingShell({
  step,
  total,
  onBack,
  children,
}: {
  step: number;
  total: number;
  onBack?: () => void;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col bg-background px-6 py-6">
      {/* Top bar */}
      <div className="h-8 flex items-center">
        {onBack && step > 0 && (
          <button
            onClick={onBack}
            className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-sm"
          >
            <ChevronLeft className="w-4 h-4" /> Précédent
          </button>
        )}
      </div>

      {/* Content */}
      <div key={step} className="flex-1 flex flex-col animate-fade-in">
        {children}
      </div>

      {/* Progress dots */}
      <div className="flex justify-center gap-2 pt-4 pb-2">
        {Array.from({ length: total }).map((_, i) => (
          <div
            key={i}
            className={`h-2 rounded-full transition-all ${
              i === step ? "w-6 bg-primary" : "w-2 bg-border"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
