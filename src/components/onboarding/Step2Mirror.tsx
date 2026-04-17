import { Button } from "@/components/ui/button";

const STATEMENTS = [
  "Je suis fatiguée sans raison claire",
  "Je fais attention à mon alimentation mais ça ne change rien",
  "Mon corps réagit différemment qu'avant",
  "J'ai testé des choses… sans comprendre si ça marchait vraiment",
  "Je ne veux plus faire au hasard",
];

export default function Step2Mirror({
  selected,
  setSelected,
  onNext,
}: {
  selected: string[];
  setSelected: (v: string[]) => void;
  onNext: () => void;
}) {
  const toggle = (s: string) =>
    setSelected(selected.includes(s) ? selected.filter((x) => x !== s) : [...selected, s]);

  return (
    <div className="flex-1 flex flex-col max-w-md mx-auto w-full">
      <h2 className="text-2xl font-bold text-foreground mb-2">
        Est-ce que l'une de ces phrases te parle&nbsp;?
      </h2>
      <p className="text-sm text-muted-foreground mb-6">
        Sélectionne celles qui te correspondent
      </p>

      <div className="space-y-3 flex-1">
        {STATEMENTS.map((s) => {
          const isSel = selected.includes(s);
          return (
            <button
              key={s}
              onClick={() => toggle(s)}
              className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                isSel
                  ? "border-primary bg-primary/10 text-foreground"
                  : "border-border bg-card text-foreground hover:border-primary/40"
              }`}
            >
              {s}
            </button>
          );
        })}
      </div>

      <Button
        onClick={onNext}
        disabled={selected.length === 0}
        className="w-full h-14 rounded-xl text-base font-semibold mt-6"
      >
        C'est exactement ça →
      </Button>
    </div>
  );
}
