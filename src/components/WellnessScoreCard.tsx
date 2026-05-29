import { useMemo } from "react";
import { useFoodLogs } from "@/hooks/useFoodLogs";
import { useProfile } from "@/hooks/useProfile";
import { useSelectedDate } from "@/hooks/useSelectedDate";
import { useRoutines } from "@/hooks/useRoutines";
import { useSymptomLogs } from "@/hooks/useSymptomLogs";
import { useHabits } from "@/hooks/useHabits";
import { ArrowDown, ArrowRight, ArrowUp, Sparkles } from "lucide-react";

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

function sumNutrient(logs: any[], k: string) {
  return logs.reduce((s, l) => s + (Number(l[k]) || 0), 0);
}

function dayScore(opts: {
  logs: any[];
  symptomScores: Record<string, number> | null;
  routinesCompleted: number;
  habitsRespected: number;
}): number {
  let score = 0;
  for (const n of NUTRIENT_KEYS) {
    const goal = (DAILY_TARGETS as any)[n.goalKey!];
    if (!goal) continue;
    const value = sumNutrient(opts.logs, n.key);
    if (value / goal >= 0.8) score += 0.5;
  }
  if (opts.symptomScores) {
    const vals = Object.values(opts.symptomScores).filter((v) => typeof v === "number");
    if (vals.length) {
      const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
      if (avg < 5) score += 1;
    }
  }
  score += Math.min(2, opts.routinesCompleted * 0.5);
  score += Math.min(1, opts.habitsRespected * 0.5);
  return Math.min(10, Math.round(score * 10) / 10);
}

function profileEstimate(p: any): number {
  // 4/10 default for new users with no data
  let s = 4;
  const stage = p?.menopause_stage;
  if (stage === "perimenopause") s += 0.5;
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
  const { logs: routineLogs } = useRoutines();
  const { todayLog } = useSymptomLogs();
  const { habits, logs: habitLogs } = useHabits();

  const yesterdayStr = useMemo(() => {
    const d = new Date(selectedDateStr);
    d.setDate(d.getDate() - 1);
    return d.toISOString().split("T")[0];
  }, [selectedDateStr]);

  const { logs: yLogs } = useFoodLogs(yesterdayStr);

  const score = useMemo(() => {
    const noData = logs.length === 0;
    if (noData) return { value: profileEstimate(profile), estimated: true };
    const completedToday = routineLogs.filter(
      (l) => l.logged_at === selectedDateStr && l.completed
    ).length;
    const respected = habits.reduce((acc, h) => {
      const log = habitLogs.find((l) => l.habit_key === h.habit_key && l.logged_at === selectedDateStr);
      return acc + (log && log.count >= h.goal ? 1 : 0);
    }, 0);
    return {
      value: dayScore({
        logs,
        symptomScores: (todayLog as any)?.symptom_scores || null,
        routinesCompleted: completedToday,
        habitsRespected: respected,
      }),
      estimated: false,
    };
  }, [logs, profile, routineLogs, selectedDateStr, todayLog, habits, habitLogs]);

  const yesterdayScore = useMemo(() => {
    if (yLogs.length === 0) return null;
    const completed = routineLogs.filter((l) => l.logged_at === yesterdayStr && l.completed).length;
    const respected = habits.reduce((acc, h) => {
      const log = habitLogs.find((l) => l.habit_key === h.habit_key && l.logged_at === yesterdayStr);
      return acc + (log && log.count >= h.goal ? 1 : 0);
    }, 0);
    return dayScore({
      logs: yLogs,
      symptomScores: null,
      routinesCompleted: completed,
      habitsRespected: respected,
    });
  }, [yLogs, routineLogs, yesterdayStr, habits, habitLogs]);

  const colors = colorOf(score.value);
  const ringPct = (score.value / 10) * 100;

  let trend: { Icon: typeof ArrowUp; label: string; tone: string } | null = null;
  if (yesterdayScore !== null && !score.estimated) {
    const diff = score.value - yesterdayScore;
    if (diff > 0.2) trend = { Icon: ArrowUp, label: `+${diff.toFixed(1)} vs hier`, tone: "text-green-500" };
    else if (diff < -0.2) trend = { Icon: ArrowDown, label: `${diff.toFixed(1)} vs hier`, tone: "text-red-500" };
    else trend = { Icon: ArrowRight, label: "Stable vs hier", tone: "text-muted-foreground" };
  }

  return (
    <div className="bg-card rounded-2xl p-5 card-soft mb-4 animate-fade-in">
      <div className="flex items-center gap-4">
        <div className="relative w-20 h-20 flex-shrink-0">
          <svg className="w-20 h-20 -rotate-90" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="42" fill="none" stroke="hsl(var(--muted))" strokeWidth="8" />
            <circle
              cx="50" cy="50" r="42" fill="none" strokeWidth="8" strokeLinecap="round"
              className={`${colors.ring} transition-all duration-700`}
              strokeDasharray={`${ringPct * 2.64} 264`}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={`text-xl font-bold ${colors.text}`}>{score.value.toFixed(1)}</span>
            <span className="text-[10px] text-muted-foreground">/10</span>
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            <Sparkles className="w-4 h-4 text-pink-deep" />
            <h3 className="text-sm font-semibold text-foreground">
              {score.estimated ? "Score estimé" : "Score bien-être nutritionnel"}
            </h3>
          </div>
          {score.estimated ? (
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
        </div>
      </div>
    </div>
  );
}
