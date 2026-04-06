import { FULL_SYMPTOMS_LIST } from "@/lib/symptoms";

interface SymptomChipsProps {
  selected: string[];
  onToggle: (value: string) => void;
}

export function SymptomChips({ selected, onToggle }: SymptomChipsProps) {
  return (
    <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto pr-1">
      {FULL_SYMPTOMS_LIST.map((s) => {
        const isSelected = selected.includes(s.value);
        return (
          <button
            key={s.value}
            onClick={() => onToggle(s.value)}
            className={`px-3 py-2 rounded-full text-xs font-medium transition-all text-left truncate ${
              isSelected
                ? "bg-primary/30 text-foreground border border-primary"
                : "bg-muted text-muted-foreground border border-transparent"
            }`}
          >
            {isSelected && "✓ "}{s.label}
          </button>
        );
      })}
    </div>
  );
}
