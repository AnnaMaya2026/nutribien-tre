import { useMemo } from "react";
import { Plus, Sparkles, RotateCcw, X } from "lucide-react";
import { useFoodLogs } from "@/hooks/useFoodLogs";
import { formatPortion } from "@/lib/portionUnits";

interface LoggedItem {
  food_name: string;
  portion_size: number;
}

interface Props {
  justLogged: LoggedItem[];
  onAddAccompaniment: (keyword: string) => void;
  onRepeatPortion: (foodName: string, grams: number) => void;
  onClose: () => void;
}

interface Suggestion {
  label: string;
  keyword: string;
  emoji: string;
}

/**
 * Heuristic rules: for a given main item, suggest common accompaniments.
 * Keyword is what we'll inject into the search bar.
 */
const RULES: Array<{ match: RegExp; suggestions: Suggestion[]; question: string }> = [
  {
    match: /poulet|dinde|boeuf|veau|steak|porc|agneau/i,
    question: "Tu veux ajouter des accompagnements ?",
    suggestions: [
      { label: "Légumes", keyword: "haricots verts", emoji: "🥦" },
      { label: "Riz", keyword: "riz", emoji: "🍚" },
      { label: "Pâtes", keyword: "pâtes", emoji: "🍝" },
      { label: "Sauce", keyword: "sauce tomate", emoji: "🥫" },
    ],
  },
  {
    match: /saumon|thon|cabillaud|poisson|merlu|sardine/i,
    question: "Avec quoi ?",
    suggestions: [
      { label: "Riz", keyword: "riz", emoji: "🍚" },
      { label: "Légumes vapeur", keyword: "brocoli", emoji: "🥦" },
      { label: "Citron", keyword: "citron", emoji: "🍋" },
    ],
  },
  {
    match: /\bcafé\b|\bcafe\b|\bthé\b|\bthe\b|\btisane\b/i,
    question: "Avec du lait ?",
    suggestions: [
      { label: "Lait", keyword: "lait", emoji: "🥛" },
      { label: "Sucre", keyword: "sucre", emoji: "🍬" },
    ],
  },
  {
    match: /pain|baguette|tartine/i,
    question: "À tartiner ?",
    suggestions: [
      { label: "Beurre", keyword: "beurre", emoji: "🧈" },
      { label: "Confiture", keyword: "confiture", emoji: "🍓" },
      { label: "Fromage", keyword: "fromage", emoji: "🧀" },
    ],
  },
  {
    match: /salade verte|laitue|mâche|roquette/i,
    question: "Avec quoi ?",
    suggestions: [
      { label: "Huile olive", keyword: "huile olive", emoji: "🫒" },
      { label: "Tomate", keyword: "tomate", emoji: "🍅" },
      { label: "Feta", keyword: "feta", emoji: "🧀" },
    ],
  },
  {
    match: /céréales|cereales|muesli|granola|flocons/i,
    question: "Avec quoi ?",
    suggestions: [
      { label: "Lait", keyword: "lait", emoji: "🥛" },
      { label: "Yaourt", keyword: "yaourt", emoji: "🥣" },
      { label: "Fruits rouges", keyword: "fraise", emoji: "🍓" },
    ],
  },
];

function findSuggestionRule(items: LoggedItem[]) {
  for (const item of items) {
    const rule = RULES.find((r) => r.match.test(item.food_name));
    if (rule) return { rule, item };
  }
  return null;
}

export default function SmartFollowupSuggestions({
  justLogged,
  onAddAccompaniment,
  onRepeatPortion,
  onClose,
}: Props) {
  const { weekLogs } = useFoodLogs();

  const accompanimentBlock = useMemo(() => findSuggestionRule(justLogged), [justLogged]);

  // Repeat-meal detection: for each logged item, check if same food_name was logged
  // in last 7 days with a different portion than today's most recent.
  const repeatSuggestions = useMemo(() => {
    if (!weekLogs?.length) return [];
    const today = new Date().toISOString().split("T")[0];
    const out: Array<{ food_name: string; grams: number; date: string }> = [];
    for (const item of justLogged) {
      const past = weekLogs
        .filter(
          (l: any) =>
            l.food_name === item.food_name &&
            l.logged_at !== today &&
            l.portion_size &&
            l.portion_size !== item.portion_size
        )
        .sort((a: any, b: any) => (a.logged_at < b.logged_at ? 1 : -1));
      if (past.length > 0) {
        out.push({
          food_name: item.food_name,
          grams: past[0].portion_size,
          date: past[0].logged_at,
        });
      }
    }
    return out.slice(0, 2);
  }, [weekLogs, justLogged]);

  if (!accompanimentBlock && repeatSuggestions.length === 0) return null;

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "short" });
  };

  return (
    <div className="bg-card rounded-2xl p-4 card-soft mb-4 animate-fade-in space-y-3 border border-primary/20">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-pink-deep" />
          <h3 className="text-sm font-semibold text-foreground">Sophie suggère</h3>
        </div>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
          <X className="w-4 h-4" />
        </button>
      </div>

      {accompanimentBlock && (
        <div>
          <p className="text-xs text-muted-foreground mb-2">{accompanimentBlock.rule.question}</p>
          <div className="flex flex-wrap gap-2">
            {accompanimentBlock.rule.suggestions.map((s) => (
              <button
                key={s.keyword}
                onClick={() => onAddAccompaniment(s.keyword)}
                className="px-3 py-2 rounded-xl bg-primary/10 hover:bg-primary/20 text-pink-deep text-xs font-medium flex items-center gap-1.5 transition-all"
              >
                <span>{s.emoji}</span>
                <span>{s.label}</span>
                <Plus className="w-3 h-3" />
              </button>
            ))}
          </div>
        </div>
      )}

      {repeatSuggestions.length > 0 && (
        <div className="pt-2 border-t border-border/50 space-y-2">
          {repeatSuggestions.map((r) => (
            <div key={r.food_name} className="flex items-center justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-xs text-foreground line-clamp-1">
                  <RotateCcw className="w-3 h-3 inline mr-1 text-muted-foreground" />
                  Tu as mangé <span className="font-medium">{r.food_name}</span> le{" "}
                  {formatDate(r.date)} ({formatPortion(r.food_name, r.grams)})
                </p>
              </div>
              <button
                onClick={() => onRepeatPortion(r.food_name, r.grams)}
                className="shrink-0 px-3 py-1.5 rounded-lg bg-primary/10 hover:bg-primary text-pink-deep hover:text-primary-foreground text-[11px] font-semibold transition-all"
              >
                Même portion ✓
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
