import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { SYMPTOM_TIPS, TIPS_DISCLAIMER } from "@/lib/symptomTips";

const GENERIC_TIPS = [
  "Consultez Sophie pour des conseils personnalisés sur ce symptôme.",
];

export function SymptomTipsCollapsible({ symptomKey }: { symptomKey: string }) {
  const [open, setOpen] = useState(false);
  // Strip "custom_" prefix to allow custom symptoms to match default tips by key if any
  const cleanKey = symptomKey.replace(/^custom_/, "");
  const tips = SYMPTOM_TIPS[cleanKey] ?? SYMPTOM_TIPS[symptomKey] ?? GENERIC_TIPS;
  const isGeneric = tips === GENERIC_TIPS;

  return (
    <div className="mt-2 rounded-xl border border-pink-deep/40 bg-primary/5 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-3 py-2 text-left hover:bg-primary/10 transition-colors"
      >
        <span className="flex items-center gap-1.5 text-[12px] font-semibold text-pink-deep">
          💡 Comment atténuer ce symptôme&nbsp;?
        </span>
        <ChevronDown
          className={`w-4 h-4 text-pink-deep transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <div className="px-3 pb-3 pt-1 animate-fade-in">
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
          {!isGeneric && (
            <p className="text-[10px] text-muted-foreground italic border-t border-border pt-1.5">
              {TIPS_DISCLAIMER}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
