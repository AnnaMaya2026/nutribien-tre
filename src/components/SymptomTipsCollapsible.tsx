import { useState } from "react";
import { ChevronDown, Lightbulb } from "lucide-react";
import { SYMPTOM_TIPS, TIPS_DISCLAIMER } from "@/lib/symptomTips";

export function SymptomTipsCollapsible({ symptomKey }: { symptomKey: string }) {
  const [open, setOpen] = useState(false);
  const tips = SYMPTOM_TIPS[symptomKey];
  if (!tips || tips.length === 0) return null;

  return (
    <div className="mt-2 rounded-xl border border-pink-deep/20 bg-primary/5 overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-3 py-2 text-left"
      >
        <span className="flex items-center gap-1.5 text-[11px] font-semibold text-pink-deep">
          <Lightbulb className="w-3.5 h-3.5" />
          Comment atténuer ce symptôme ?
        </span>
        <ChevronDown
          className={`w-3.5 h-3.5 text-pink-deep transition-transform ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>
      {open && (
        <div className="px-3 pb-3 animate-fade-in">
          <ul className="space-y-1.5 mb-2">
            {tips.map((tip) => (
              <li
                key={tip}
                className="text-[11px] text-foreground flex items-start gap-1.5 leading-snug"
              >
                <span className="text-pink-deep mt-0.5">•</span>
                <span>{tip}</span>
              </li>
            ))}
          </ul>
          <p className="text-[10px] text-muted-foreground italic border-t border-border pt-1.5">
            {TIPS_DISCLAIMER}
          </p>
        </div>
      )}
    </div>
  );
}
