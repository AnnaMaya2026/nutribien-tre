import { useMemo, useState } from "react";
import { useFoodLogs } from "@/hooks/useFoodLogs";
import { useProfile } from "@/hooks/useProfile";
import { useSelectedDate } from "@/hooks/useSelectedDate";
import { useRoutines } from "@/hooks/useRoutines";
import { useSymptomLogs } from "@/hooks/useSymptomLogs";
import { useHabits } from "@/hooks/useHabits";
import { ArrowDown, ArrowRight, ArrowUp, Info, Sparkles } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const NUTRIENT_GOALS: Record<string, number> = {
  calcium: 1200,
  magnesium: 320,
  iron: 8,
  fibres: 25,
  omega3: 2.0,
  zinc: 8,
  potassium: 3500,
  vitamin_b12: 2.4,
  vitamin_b9: 400,
  vitamin_e: 12,
};

const NUTRIENT_LABELS: Record<string, string> = {
  calcium: "Calcium",
  magnesium: "Magnésium",
  iron: "Fer",
  fibres: "Fibres",
  omega3: "Oméga-3",
  zinc: "Zinc",
  potassium: "Potassium",
  vitamin_b12: "Vitamine B12",
  vitamin_b9: "Vitamine B9",
  vitamin_e: "Vitamine E",
};

const NUTRIENT_FOOD_TIPS: Record<string, string> = {
  calcium: "yaourt, amandes ou brocoli",
  magnesium: "chocolat noir, graines de courge ou épinards",
  iron: "lentilles, tofu ou viande rouge",
  fibres: "flocons d'avoine, légumineuses ou poire",
  omega3: "sardines, noix ou graines de lin",
  zinc: "graines de courge, lentilles ou bœuf",
  potassium: "banane, patate douce ou avocat",
  vitamin_b12: "œufs, fromage ou poisson",
  vitamin_b9: "épinards, lentilles ou asperges",
  vitamin_e: "amandes, avocat ou huile de tournesol",
};

const SYMPTOM_LABELS: Record<string, string> = {
  fatigue: "Fatigue",
  bouffees_chaleur: "Bouffées de chaleur",
  insomnie: "Insomnie",
  sautes_humeur: "Sautes d'humeur",
  ballonnements: "Ballonnements",
  anxiete: "Anxiété",
  brain_fog: "Brain fog",
  maux_de_tete: "Maux de tête",
  douleurs_articulaires: "Douleurs articulaires",
  irritabilite: "Irritabilité",
  deprime: "Déprime",
  transpiration_nocturne: "Transpiration nocturne",
};

const SYMPTOM_FOOD_ADVICE: Record<string, string> = {
  fatigue: "Privilégiez le fer (lentilles, épinards) et la vitamine B12.",
  bouffees_chaleur: "Misez sur les phytoestrogènes : soja, graines de lin.",
  insomnie: "Magnésium le soir (amandes, banane) et évitez la caféine.",
  sautes_humeur: "Oméga-3 (poissons gras, noix) pour stabiliser l'humeur.",
  ballonnements: "Réduisez les FODMAPs, ajoutez fenouil et gingembre.",
  anxiete: "Magnésium et oméga-3, limitez sucre et caféine.",
  brain_fog: "Oméga-3 et baies riches en antioxydants.",
  maux_de_tete: "Hydratez-vous bien et stabilisez votre glycémie.",
  douleurs_articulaires: "Curcuma, gingembre et oméga-3 anti-inflammatoires.",
  irritabilite: "Magnésium, vitamines B et glycémie stable.",
  deprime: "Oméga-3, vitamine D et tryptophane (œufs, fromage).",
  transpiration_nocturne: "Soja, lin et évitez alcool/épices le soir.",
};

function sumNutrient(logs: any[], k: string) {
  return logs.reduce((s, l) => s + (Number(l[k]) || 0), 0);
}

type Contribution = { label: string; points: number; detail?: string };
type Breakdown = {
  score: number;
  positives: Contribution[];
  negatives: Contribution[];
  suggestions: string[];
  summary: { label: string; points: number }[];
};

function computeBreakdown(opts: {
  logs: any[];
  symptomScores: Record<string, number> | null;
  routines: { total: number; completed: number };
  habits: { total: number; respected: number };
}): Breakdown {
  const positives: Contribution[] = [];
  const negatives: Contribution[] = [];
  const suggestions: string[] = [];

  let nutrientPts = 0;
  const deficits: { key: string; pct: number }[] = [];
  for (const [key, goal] of Object.entries(NUTRIENT_GOALS)) {
    const value = sumNutrient(opts.logs, key);
    const pct = Math.round((value / goal) * 100);
    const label = NUTRIENT_LABELS[key] || key;
    if (value / goal >= 0.8) {
      nutrientPts += 0.5;
      positives.push({
        label: `${label} : ${pct}% de l'objectif`,
        points: 0.5,
      });
    } else {
      negatives.push({
        label: `${label} : ${pct}% de l'objectif`,
        points: 0,
        detail: "carence",
      });
      deficits.push({ key, pct });
    }
  }

  let symptomPts = 0;
  let symptomAvg: number | null = null;
  let worstSymptom: { key: string; score: number } | null = null;
  if (opts.symptomScores) {
    const entries = Object.entries(opts.symptomScores).filter(
      ([, v]) => typeof v === "number"
    ) as [string, number][];
    if (entries.length) {
      symptomAvg =
        entries.reduce((a, [, v]) => a + v, 0) / entries.length;
      if (symptomAvg < 5) {
        symptomPts += 1;
        positives.push({
          label: `Symptômes maîtrisés (moy. ${symptomAvg.toFixed(1)}/10)`,
          points: 1,
        });
      } else {
        negatives.push({
          label: `Symptômes élevés : ${symptomAvg.toFixed(1)}/10`,
          points: 0,
        });
      }
      worstSymptom = entries.reduce(
        (best, [k, v]) => (!best || v > best.score ? { key: k, score: v } : best),
        null as { key: string; score: number } | null
      );
    }
  }

  const routinePts = Math.min(2, opts.routines.completed * 0.5);
  if (opts.routines.completed > 0) {
    positives.push({
      label: `Routines : ${opts.routines.completed}/${opts.routines.total} complétées`,
      points: routinePts,
    });
  } else if (opts.routines.total > 0) {
    negatives.push({
      label: `Routines : 0/${opts.routines.total} complétées`,
      points: 0,
    });
  }

  const habitPts = Math.min(1, opts.habits.respected * 0.5);
  if (opts.habits.respected > 0) {
    positives.push({
      label: `Habitudes respectées : ${opts.habits.respected}/${opts.habits.total}`,
      points: habitPts,
    });
  } else if (opts.habits.total > 0) {
    negatives.push({
      label: `Habitudes : 0/${opts.habits.total} respectées`,
      points: 0,
    });
  }

  // Top 3 suggestions
  const consumedNames = opts.logs.map((l: any) => String(l.food_name || "").toLowerCase());
  const worstDef = deficits.sort((a, b) => a.pct - b.pct)[0];
  if (worstDef) {
    const tip = NUTRIENT_FOOD_TIPS[worstDef.key];
    const tipFoods = tip.split(/,|\bou\b/).map((s) => s.trim()).filter(Boolean);
    const remaining = tipFoods.filter(
      (f) => !consumedNames.some((c) => c.includes(f.toLowerCase()))
    );
    if (remaining.length > 0) {
      const finalTip = remaining.length > 1
        ? `${remaining.slice(0, -1).join(", ")} ou ${remaining[remaining.length - 1]}`
        : remaining[0];
      suggestions.push(
        `Boostez votre ${NUTRIENT_LABELS[worstDef.key]} (${worstDef.pct}%) : essayez ${finalTip}.`
      );
    }
  }
  if (worstSymptom && worstSymptom.score >= 5) {
    const advice = SYMPTOM_FOOD_ADVICE[worstSymptom.key];
    const label = SYMPTOM_LABELS[worstSymptom.key] || worstSymptom.key;
    if (advice) suggestions.push(`${label} (${worstSymptom.score}/10) : ${advice}`);
  }
  if (opts.routines.completed < opts.routines.total) {
    const missing = opts.routines.total - opts.routines.completed;
    suggestions.push(
      `Complétez ${missing} routine${missing > 1 ? "s" : ""} restante${missing > 1 ? "s" : ""} pour gagner jusqu'à ${Math.min(2, missing * 0.5).toFixed(1)}pt.`
    );
  }

  const rawScore = nutrientPts + symptomPts + routinePts + habitPts;
  const score = Math.min(10, Math.round(rawScore * 10) / 10);

  const summary = [
    { label: "Base", points: 0 },
    { label: "Nutriments atteints", points: nutrientPts },
    { label: "Symptômes", points: symptomPts },
    { label: "Routines", points: routinePts },
    { label: "Habitudes", points: habitPts },
  ];

  return { score, positives, negatives, suggestions: suggestions.slice(0, 3), summary };
}

function profileEstimate(p: any): number {
  let s = 4;
  if (p?.menopause_stage === "perimenopause") s += 0.5;
  return Math.min(10, Math.max(0, s));
}

function colorOf(score: number) {
  if (score < 4) return { bg: "bg-red-500/15", text: "text-red-500", ring: "stroke-red-500" };
  if (score < 7) return { bg: "bg-orange-500/15", text: "text-orange-500", ring: "stroke-orange-500" };
  return { bg: "bg-green-500/15", text: "text-green-500", ring: "stroke-green-500" };
}

export default function WellnessScoreCard() {
  const { profile } = useProfile();
  const { selectedDateStr } = useSelectedDate();
  const { logs } = useFoodLogs(selectedDateStr);
  const { logs: routineLogs, routines } = useRoutines() as any;
  const { todayLog } = useSymptomLogs();
  const { habits, logs: habitLogs } = useHabits();
  const [open, setOpen] = useState(false);

  const yesterdayStr = useMemo(() => {
    const d = new Date(selectedDateStr);
    d.setDate(d.getDate() - 1);
    return d.toISOString().split("T")[0];
  }, [selectedDateStr]);

  const { logs: yLogs } = useFoodLogs(yesterdayStr);

  const routinesTotal = Array.isArray(routines) ? routines.length : 0;

  const breakdown = useMemo(() => {
    const completedToday = routineLogs.filter(
      (l: any) => l.logged_at === selectedDateStr && l.completed
    ).length;
    const respected = habits.reduce((acc, h) => {
      const log = habitLogs.find(
        (l) => l.habit_key === h.habit_key && l.logged_at === selectedDateStr
      );
      return acc + (log && log.count >= h.goal ? 1 : 0);
    }, 0);
    return computeBreakdown({
      logs,
      symptomScores: (todayLog as any)?.symptom_scores || null,
      routines: { total: routinesTotal, completed: completedToday },
      habits: { total: habits.length, respected },
    });
  }, [logs, routineLogs, selectedDateStr, todayLog, habits, habitLogs, routinesTotal]);

  const noData = logs.length === 0;
  const scoreValue = noData ? profileEstimate(profile) : breakdown.score;
  const estimated = noData;

  const yesterdayScore = useMemo(() => {
    if (yLogs.length === 0) return null;
    const completed = routineLogs.filter(
      (l: any) => l.logged_at === yesterdayStr && l.completed
    ).length;
    const respected = habits.reduce((acc, h) => {
      const log = habitLogs.find(
        (l) => l.habit_key === h.habit_key && l.logged_at === yesterdayStr
      );
      return acc + (log && log.count >= h.goal ? 1 : 0);
    }, 0);
    return computeBreakdown({
      logs: yLogs,
      symptomScores: null,
      routines: { total: routinesTotal, completed },
      habits: { total: habits.length, respected },
    }).score;
  }, [yLogs, routineLogs, yesterdayStr, habits, habitLogs, routinesTotal]);

  const colors = colorOf(scoreValue);
  const ringPct = (scoreValue / 10) * 100;

  let trend: { Icon: typeof ArrowUp; label: string; tone: string } | null = null;
  if (yesterdayScore !== null && !estimated) {
    const diff = scoreValue - yesterdayScore;
    if (diff > 0.2) trend = { Icon: ArrowUp, label: `+${diff.toFixed(1)} vs hier`, tone: "text-green-500" };
    else if (diff < -0.2) trend = { Icon: ArrowDown, label: `${diff.toFixed(1)} vs hier`, tone: "text-red-500" };
    else trend = { Icon: ArrowRight, label: "Stable vs hier", tone: "text-muted-foreground" };
  }

  return (
    <>
      <div className="bg-card rounded-2xl p-5 card-soft mb-4 animate-fade-in">
        <div className="flex items-center gap-4">
          <TooltipProvider delayDuration={200}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() => !estimated && setOpen(true)}
                  className="relative w-20 h-20 flex-shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-deep rounded-full"
                  aria-label="Voir le détail du score"
                >
                  <svg className="w-20 h-20 -rotate-90" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="42" fill="none" stroke="hsl(var(--muted))" strokeWidth="8" />
                    <circle
                      cx="50" cy="50" r="42" fill="none" strokeWidth="8" strokeLinecap="round"
                      className={`${colors.ring} transition-all duration-700`}
                      strokeDasharray={`${ringPct * 2.64} 264`}
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className={`text-xl font-bold ${colors.text}`}>{scoreValue.toFixed(1)}</span>
                    <span className="text-[10px] text-muted-foreground">/10</span>
                  </div>
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-[220px] text-xs">
                Score basé sur vos apports nutritionnels, vos symptômes et vos routines du jour.
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-0.5">
              <Sparkles className="w-4 h-4 text-pink-deep" />
              <h3 className="text-sm font-semibold text-foreground">
                {estimated ? "Score estimé" : "Score bien-être nutritionnel"}
              </h3>
            </div>
            {estimated ? (
              <p className="text-xs text-muted-foreground leading-relaxed">
                Basé sur votre profil. Commencez à logger vos repas pour obtenir votre vrai score ! 🎯
              </p>
            ) : (
              <p className="text-xs text-muted-foreground leading-relaxed">
                Calculé sur vos apports, symptômes, routines et habitudes du jour.
              </p>
            )}
            {trend && (
              <div className={`mt-1 inline-flex items-center gap-1 text-xs ${trend.tone}`}>
                <trend.Icon className="w-3.5 h-3.5" />
                <span>{trend.label}</span>
              </div>
            )}
            {!estimated && (
              <button
                type="button"
                onClick={() => setOpen(true)}
                className="mt-2 inline-flex items-center gap-1 text-xs text-pink-deep hover:underline"
              >
                <Info className="w-3.5 h-3.5" />
                🔍 Comment est calculé mon score ?
              </button>
            )}
          </div>
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Votre score de bien-être : {scoreValue.toFixed(1)}/10
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 text-sm">
            {breakdown.positives.length > 0 && (
              <section>
                <h4 className="font-semibold mb-2">✅ Ce qui va bien :</h4>
                <ul className="space-y-1.5">
                  {breakdown.positives.map((c, i) => (
                    <li key={i} className="flex justify-between gap-2 text-foreground">
                      <span>{c.label}</span>
                      <span className="text-green-600 font-medium whitespace-nowrap">
                        +{c.points.toFixed(1)}pt
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {breakdown.negatives.length > 0 && (
              <section>
                <h4 className="font-semibold mb-2">⚠️ Ce qui fait baisser le score :</h4>
                <ul className="space-y-1.5">
                  {breakdown.negatives.map((c, i) => (
                    <li key={i} className="flex justify-between gap-2 text-muted-foreground">
                      <span>{c.label}</span>
                      <span className="text-red-500 whitespace-nowrap">❌</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {breakdown.suggestions.length > 0 && (
              <section>
                <h4 className="font-semibold mb-2">💡 Pour améliorer votre score aujourd'hui :</h4>
                <ul className="space-y-1.5 list-disc pl-5">
                  {breakdown.suggestions.map((s, i) => (
                    <li key={i} className="text-foreground">{s}</li>
                  ))}
                </ul>
              </section>
            )}

            <section className="bg-muted/40 rounded-lg p-3 font-mono text-xs leading-relaxed">
              {breakdown.summary.map((s, i) => (
                <div key={i}>
                  {i === 0
                    ? `Base : ${s.points.toFixed(1)}/10`
                    : `${s.points >= 0 ? "+" : ""}${s.points.toFixed(1)} pt (${s.label.toLowerCase()})`}
                </div>
              ))}
              <div className="mt-1 pt-1 border-t border-border font-semibold">
                = {scoreValue.toFixed(1)}/10
              </div>
            </section>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
