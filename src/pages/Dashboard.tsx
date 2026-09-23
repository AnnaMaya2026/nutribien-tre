import { useFoodLogs } from "@/hooks/useFoodLogs";
import { useProfile } from "@/hooks/useProfile";
import { useAuth } from "@/hooks/useAuth";
import { useSelectedDate } from "@/hooks/useSelectedDate";
import { useRoutines, getActivityExpenditure } from "@/hooks/useRoutines";
import { useSupplements } from "@/hooks/useSupplements";

import DateSelector from "@/components/DateSelector";
import NutrientInfo, { NutrientKey } from "@/components/NutrientInfo";
import { DAILY_TARGETS } from "@/lib/mockData";
import { getNutrientColor, isAberrantPct, ABERRANT_PCT, ABERRANT_LABEL } from "@/lib/utils";
import { useState, useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";
import MicronutrientTrendChart from "@/components/MicronutrientTrendChart";
import WeightTracker from "@/components/WeightTracker";
import DailyRecapCard from "@/components/DailyRecapCard";
import WeeklyReportCard from "@/components/WeeklyReportCard";
import WellnessScoreCard from "@/components/WellnessScoreCard";
import HealthProfileCard from "@/components/HealthProfileCard";
import HelpCarousel from "@/components/HelpCarousel";
import MedicalDisclaimerBanner from "@/components/MedicalDisclaimerBanner";
import StreakCard from "@/components/StreakCard";
import DailyChallengeCard from "@/components/DailyChallengeCard";
import SophieEveningBanner from "@/components/SophieEveningBanner";
import TomorrowPreview from "@/components/TomorrowPreview";
import { ChevronDown, ChevronUp, LogOut, UserCircle2 } from "lucide-react";
import { getDisplayName } from "@/lib/displayName";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

import { calculateMealTargets } from "@/utils/mealTargetsCalculator";
import { calculateCalorieGoal, calculateProteinGoal, calculateCarbsGoal, calculateFatsGoal } from "@/lib/calorieGoal";
import MealProgressBlock from "@/components/MealProgressBlock";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

function getCalorieColor(pct: number) {
  if (pct > 110) return { stroke: "hsl(0, 70%, 55%)", text: "text-red-500", emoji: "🔴" };
  if (pct > 100) return { stroke: "hsl(35, 80%, 55%)", text: "text-orange-500", emoji: "🟠" };
  if (pct >= 80) return { stroke: "hsl(145, 60%, 45%)", text: "text-green-500", emoji: "🟢" };
  return { stroke: "hsl(var(--primary))", text: "text-pink-deep", emoji: "" };
}

function ProgressBar({
  value,
  max,
  label,
  unit,
  isMicro = false,
  nutrient,
  maxPrefix,
  hint,
  supplementAmount,
  supplementUnit,
  supplementSources,
  limit,
}: {
  value: number;
  max: number;
  label: string;
  unit: string;
  isMicro?: boolean;
  nutrient?: NutrientKey;
  maxPrefix?: string;
  hint?: string;
  supplementAmount?: number;
  supplementUnit?: string;
  supplementSources?: { nom: string; amount: number }[];
  limit?: number | null;
}) {
  const supplement = supplementAmount || 0;
  const totalValue = value + supplement;
  const rawPct = (totalValue / max) * 100;
  const aberrant = isAberrantPct(rawPct);
  const cappedPct = aberrant ? 100 : Math.min(rawPct, ABERRANT_PCT);
  const foodPct = aberrant ? 0 : Math.min((value / max) * 100, 100);
  const totalPct = aberrant ? 0 : Math.min(rawPct, 100);
  const supplementPct = Math.max(0, totalPct - foodPct);
  const { text, emoji } = getNutrientColor(aberrant ? 0 : rawPct);
  const foodColor = getNutrientColor((value / max) * 100).bg;
  const overLimit = limit != null && !aberrant && totalValue > limit;
  const fmt = (n: number) => (n >= 10 ? Math.round(n) : Math.round(n * 10) / 10);
  return (
    <div className="space-y-1">
      <div className="flex justify-between items-center text-[15px]">
        <span className="text-muted-foreground inline-flex items-center gap-1">
          {label}
          {nutrient && <NutrientInfo nutrient={nutrient} />}
        </span>
        {aberrant ? (
          <span className="text-[11px] font-medium text-amber-600 dark:text-amber-400 text-right">
            ⚠️ {ABERRANT_LABEL}
          </span>
        ) : (
          <span className={`font-semibold ${text} text-right`}>
            {emoji} {fmt(totalValue)}/{maxPrefix || ""}
            {max}
            {unit}
          </span>
        )}
      </div>
      {!aberrant && (
        <div className="h-2 bg-muted rounded-full overflow-hidden flex">
          <div
            className={`h-full transition-all duration-500 ${foodColor}`}
            style={{ width: `${foodPct}%` }}
          />
          {supplementPct > 0 && (
            <div
              className="h-full transition-all duration-500 bg-amber-400"
              style={{ width: `${supplementPct}%` }}
              title="Contribution des compléments"
            />
          )}
        </div>
      )}
      {supplement > 0 && !aberrant ? (
        <p className="text-[11px] text-muted-foreground">
          🍽️ Alimentation seule : <span className="font-medium">{fmt(value)}{unit}</span>
          {max ? ` (${Math.round((value / max) * 100)}% de la RNP)` : ""}
          {" · "}
          <span className="text-amber-600 dark:text-amber-400">
            💊 Compléments : +{fmt(supplement)}{supplementUnit || unit}
          </span>
          {" · "}
          Total : <span className="font-medium">{fmt(totalValue)}{unit}</span>
          {max ? ` (${Math.round(rawPct)}%)` : ""}
        </p>
      ) : null}
      {overLimit && (
        <p className="text-[11px] rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 px-2 py-1.5">
          ℹ️ Total du jour {fmt(totalValue)}{unit}, au-dessus de la limite haute de sécurité ({limit}{unit}).
          {supplementSources && supplementSources.length > 0 && (
            <> Y contribuent : {supplementSources.map((s) => `${s.nom} (+${fmt(s.amount)}${supplementUnit || unit})`).join(", ")}.</>
          )}
          {" "}Vous pouvez espacer vos prises ; ponctuellement, ce n'est pas dangereux.
        </p>
      )}
      {hint && !aberrant && (
        <p className="text-[11px] text-muted-foreground italic">{hint}</p>
      )}
    </div>
  );
}


function formatFrenchDate(): string {
  const days = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];
  const months = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
  const now = new Date();
  return `${days[now.getDay()]} ${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()}`;
}


const MACRO_GOALS = { proteins: 100, carbs: 200, fats: 65, fibres: 25 };

const COLORFUL_PRODUCE_KEYWORDS = [
  "myrtille", "fraise", "framboise", "mure", "mûre", "grenade", "raisin", "cerise", "orange", "kiwi", "pomme", "poire", "banane", "abricot", "peche", "pêche", "prune", "mangue", "ananas", "brocoli", "carotte", "tomate", "poivron", "epinard", "épinard", "courgette", "aubergine", "betterave", "chou", "salade", "concombre", "haricot vert", "patate douce",
];

function getVitaminDGoal(age?: number | null) {
  if (!age) return DAILY_TARGETS.vitamin_d;
  if (age <= 50) return 5;
  if (age <= 70) return 10;
  return 15;
}

function getProducePortions(logs: any[]) {
  return logs.reduce((count, log) => {
    const name = String(log.food_name || "").toLowerCase();
    if (!COLORFUL_PRODUCE_KEYWORDS.some((keyword) => name.includes(keyword))) return count;
    return count + Math.max(1, Math.round(Number(log.portion_size || 100) / 100));
  }, 0);
}

const MEAL_TYPES = [
  { value: "petit-dejeuner", label: "🌅 Petit-déj" },
  { value: "dejeuner", label: "☀️ Déjeuner" },
  { value: "diner", label: "🌙 Dîner" },
  { value: "collation", label: "🍎 Collation" },
];

export default function Dashboard() {
  const { user, signOut } = useAuth();
  const { profile } = useProfile();
  const navigate = useNavigate();
  const { selectedDate, selectedDateStr, isToday } = useSelectedDate();
  const { logs, weekLogs } = useFoodLogs(selectedDateStr);
  const { allRoutines, logs: routineLogs } = useRoutines();
  const sportKcal = Math.round(getActivityExpenditure(routineLogs, selectedDateStr));
  // Compléments cochés du jour affiché, quantité saisie incluse.
  const { contributions: supplementContribs, references: nutrientRefs } = useSupplements(selectedDateStr);
  // Convert nutrient amounts to the same unit used by the food totals.
  // Most micros are mg or µg already in the right unit; oméga-3 is stored in g
  // by food logs but supplements are typically reported in mg → convert.
  const supBy = (key: string, divisor = 1) => {
    const c = supplementContribs[key];
    if (!c) return 0;
    return c.amount / divisor;
  };
  const supSources = (key: string, divisor = 1) =>
    (supplementContribs[key]?.sources || []).map((s) => ({ nom: s.nom, amount: s.amount / divisor }));
  /** Limite haute de sécurité (ANSES), dans l'unité des totaux alimentaires. */
  const supLimit = (key: string, divisor = 1) => {
    const l = nutrientRefs[key]?.limite_haute;
    return l == null ? null : Number(l) / divisor;
  };
  /** Couverture toujours comparée à la RNP ANSES, jamais aux AR d'étiquetage. */
  const rnpTarget = (key: string, fallback: number, divisor = 1) => {
    const r = nutrientRefs[key]?.rnp_anses;
    return r == null ? fallback : Number(r) / divisor;
  };

  const [openMeals, setOpenMeals] = useState<Record<string, boolean>>({
    "petit-dejeuner": false,
    dejeuner: false,
    diner: false,
    collation: false,
  });
  const [showSecondaryMicros, setShowSecondaryMicros] = useState(false);

  const vitaminDGoal = getVitaminDGoal(profile?.age);
  const firstName = getDisplayName((profile as any)?.display_name, user?.email);

  // Per-meal targets based on profile goals (Harris-Benedict)
  const p = profile as any;
  const dailyCalories = calculateCalorieGoal({
    weight: p?.weight,
    height: p?.height,
    age: p?.age,
    activityLevel: p?.activity_level,
    objective: p?.objective,
  });
  const dailyProteins = calculateProteinGoal(dailyCalories, p?.objective);
  const dailyCarbs = calculateCarbsGoal(dailyCalories, p?.objective);
  const dailyFats = calculateFatsGoal(dailyCalories, p?.objective);
  const calorieGoal = dailyCalories;
  const proteinGoal = dailyProteins;
  const mealTargets = calculateMealTargets(dailyCalories, dailyProteins, dailyCarbs, dailyFats);
  const targetByMeal = Object.fromEntries(mealTargets.map((t) => [t.key, t]));

  const totals = logs.reduce(
    (acc, log: any) => ({
      calories: acc.calories + (log.calories || 0),
      proteins: acc.proteins + (log.proteins || 0),
      carbs: acc.carbs + (log.carbs || 0),
      fats: acc.fats + (log.fats || 0),
      fibres: acc.fibres + (log.fibres || 0),
      calcium: acc.calcium + (log.calcium || 0),
      vitamin_d: acc.vitamin_d + (log.vitamin_d || 0),
      magnesium: acc.magnesium + (log.magnesium || 0),
      iron: acc.iron + (log.iron || 0),
      omega3: acc.omega3 + (log.omega3 || 0),
      phytoestrogens: acc.phytoestrogens + (log.phytoestrogens || 0),
      vitamin_b12: acc.vitamin_b12 + (log.vitamin_b12 || 0),
      potassium: acc.potassium + (log.potassium || 0),
      zinc: acc.zinc + (log.zinc || 0),
      vitamin_k: acc.vitamin_k + (log.vitamin_k || 0),
      vitamin_b6: acc.vitamin_b6 + (log.vitamin_b6 || 0),
      vitamin_b9: acc.vitamin_b9 + (log.vitamin_b9 || 0),
      vitamin_e: acc.vitamin_e + (log.vitamin_e || 0),
    }),
    { calories: 0, proteins: 0, carbs: 0, fats: 0, fibres: 0, calcium: 0, vitamin_d: 0, magnesium: 0, iron: 0, omega3: 0, phytoestrogens: 0, vitamin_b12: 0, potassium: 0, zinc: 0, vitamin_k: 0, vitamin_b6: 0, vitamin_b9: 0, vitamin_e: 0 }
  );

  // Macros apportées par les compléments cochés du jour (mêmes règles que les micros).
  const supMacros = {
    calories: supBy("calories"),
    proteins: supBy("proteins"),
    carbs: supBy("carbs"),
    fats: supBy("fats"),
    fibres: supBy("fibres"),
  };
  const supMacroSources = {
    calories: supSources("calories"),
    proteins: supSources("proteins"),
    carbs: supSources("carbs"),
    fats: supSources("fats"),
    fibres: supSources("fibres"),
  };
  const totalCalories = totals.calories + supMacros.calories;

  const antioxidantScore = getProducePortions(logs);
  const antioxidantTone = antioxidantScore >= 5 ? "text-green-500" : antioxidantScore >= 3 ? "text-orange-500" : "text-red-500";

  const mealBreakdown = useMemo(() => {
    return MEAL_TYPES.map((mt) => {
      const items = logs.filter((log) => (log.meal_type || "autre") === mt.value);
      const consumed = items.reduce(
        (acc, log) => ({
          calories: acc.calories + (log.calories || 0),
          proteins: acc.proteins + (log.proteins || 0),
          carbs: acc.carbs + (log.carbs || 0),
          fats: acc.fats + (log.fats || 0),
        }),
        { calories: 0, proteins: 0, carbs: 0, fats: 0 }
      );
      return {
        key: mt.value,
        label: mt.label,
        items,
        consumed,
        target: targetByMeal[mt.value],
      };
    });
  }, [logs, targetByMeal]);

  const chartData = (() => {
    const days: Record<string, number> = {};
    const labels = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      days[d.toISOString().split("T")[0]] = 0;
    }
    weekLogs.forEach((log) => { const key = log.logged_at; if (key in days) days[key] += log.calories || 0; });
    return Object.entries(days).map(([date, cal]) => {
      const d = new Date(date);
      return { name: labels[d.getDay()], calories: Math.round(cal) };
    });
  })();

  const calPct = (totalCalories / calorieGoal) * 100;
  const calColor = getCalorieColor(calPct);
  const calRingPct = Math.min(calPct, 100);

  return (
    <div className="pb-24 px-4 pt-6 bg-background min-h-screen">
      <MedicalDisclaimerBanner />
      {/* Greeting */}
      <div className="mb-6 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Bonjour {firstName ? firstName : ""} 👋</h1>
          <p className="text-muted-foreground text-sm capitalize">
            {isToday ? "Aujourd'hui — " : ""}
            {selectedDate.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <HelpCarousel />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/profil")}
            aria-label="Mon profil"
            className="text-muted-foreground hover:text-foreground shrink-0"
          >
            <UserCircle2 className="w-5 h-5" />
            <span className="hidden sm:inline ml-1">Profil</span>
          </Button>
          <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-destructive shrink-0"
              aria-label="Se déconnecter"
            >
              <LogOut className="w-4 h-4 mr-1" />
              <span className="hidden sm:inline">Se déconnecter</span>
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Êtes-vous sûre de vouloir vous déconnecter ?</AlertDialogTitle>
              <AlertDialogDescription>
                Vous devrez vous reconnecter pour accéder à votre profil et à vos données.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Annuler</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => signOut()}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Se déconnecter
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* Global date selector */}
      <DateSelector />

      {/* Wellness score (always visible, estimated for new users) */}
      <WellnessScoreCard />

      {/* Streak counter + weekly calendar */}
      <StreakCard />

      {/* Sophie evening proactive message (after 7pm) */}
      <SophieEveningBanner />

      {/* Daily challenge (after 8am) */}
      <DailyChallengeCard />

      {/* Daily evening recap (visible after 8pm) */}
      <DailyRecapCard />


      {/* Weekly report (visible from Monday) */}
      {new Date().getDay() !== 0 && (
        <div className="mb-4">
          <WeeklyReportCard />
        </div>
      )}





      {/* Health profile (collapsible) */}
      <HealthProfileCard />

      {/* Calorie ring + macro bars */}
      <div className="calorie-ring-section bg-card rounded-2xl p-6 card-soft mb-4 animate-fade-in">
        <div className="flex flex-col items-center mb-6">
          <div className="relative w-44 h-44">
            <svg className="w-44 h-44 -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="42" fill="none" stroke="hsl(var(--muted))" strokeWidth="6" />
              <circle cx="50" cy="50" r="42" fill="none" stroke={calColor.stroke} strokeWidth="6" strokeLinecap="round" strokeDasharray={`${calRingPct * 2.64} 264`} className="transition-all duration-700" />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={`text-3xl font-bold ${calColor.text}`}>{calColor.emoji} {Math.round(totalCalories)}</span>
              <span className="text-xs text-muted-foreground">kcal consommées</span>
              <span className="text-[10px] text-muted-foreground mt-0.5">/ {calorieGoal} kcal</span>
            </div>
          </div>
          {supMacros.calories > 0 && (
            <p className="mt-2 text-[11px] text-muted-foreground text-center">
              🍽️ Alimentation seule : <span className="font-medium">{Math.round(totals.calories)} kcal</span>
              {" · "}
              <span className="text-amber-600 dark:text-amber-400">
                💊 Compléments : +{Math.round(supMacros.calories)} kcal
              </span>
              {" · "}
              Total : <span className="font-medium">{Math.round(totalCalories)} kcal</span>
            </p>
          )}
          {/* Purement informatif : n'entre dans aucun calcul (ni cercle, ni budget, ni total). */}
          {sportKcal > 0 && (
            <p className="mt-2 text-[13px] text-center text-orange-600 dark:text-orange-400">
              🏃 Sport : ~{sportKcal} kcal{" "}
              <span className="text-muted-foreground">(estimation)</span>
            </p>
          )}
        </div>

        {/* Macro bars */}
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: "Protéines", food: totals.proteins, sup: supMacros.proteins, max: proteinGoal, key: "proteins" as NutrientKey },
            { label: "Glucides", food: totals.carbs, sup: supMacros.carbs, max: dailyCarbs, key: undefined },
            { label: "Lipides", food: totals.fats, sup: supMacros.fats, max: dailyFats, key: undefined },
            { label: "Fibres", food: totals.fibres, sup: supMacros.fibres, max: MACRO_GOALS.fibres, key: "fibres" as NutrientKey },
          ].map((m) => {
            const value = m.food + m.sup;
            const rawPct = (value / m.max) * 100;
            const totalPct = Math.min(rawPct, 100);
            const foodPct = Math.min((m.food / m.max) * 100, 100);
            const supPct = Math.max(0, totalPct - foodPct);
            const { text, emoji } = getNutrientColor(rawPct);
            const foodColor = getNutrientColor((m.food / m.max) * 100).bg;
            return (
              <div key={m.label} className="text-center">
                <div className="text-sm text-muted-foreground mb-1 inline-flex items-center justify-center gap-1">
                  {m.label}
                  {m.key && <NutrientInfo nutrient={m.key} />}
                </div>
                <div className={`text-lg font-bold ${text}`}>{emoji} {Math.round(value)}g</div>
                <div className="text-xs text-muted-foreground mb-1">/ {m.max}g</div>
                <div className="h-1.5 bg-muted rounded-full overflow-hidden flex">
                  <div className={`h-full transition-all duration-500 ${foodColor}`} style={{ width: `${foodPct}%` }} />
                  {supPct > 0 && (
                    <div className="h-full transition-all duration-500 bg-amber-400" style={{ width: `${supPct}%` }} title="Contribution des compléments" />
                  )}
                </div>
                {m.sup > 0 && (
                  <div className="mt-1 text-[10px] text-muted-foreground leading-tight">
                    🍽️ {Math.round(m.food)}g
                    <br />
                    <span className="text-amber-600 dark:text-amber-400">💊 +{Math.round(m.sup)}g</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <p className="mt-3 text-xs text-muted-foreground text-center">
          Protéines: {Math.round(totals.proteins + supMacros.proteins)}g / {proteinGoal}g (1.2g par kg de votre poids)
          {supMacros.proteins > 0 && (
            <> — dont <span className="text-amber-600 dark:text-amber-400">{Math.round(supMacros.proteins)}g de compléments</span> ({Math.round(totals.proteins)}g par l'alimentation
            {supMacroSources.proteins.length > 0 && <> ; {supMacroSources.proteins.map((s) => `${s.nom} +${Math.round(s.amount)}g`).join(", ")}</>})</>
          )}
        </p>
        {totals.proteins + supMacros.proteins < proteinGoal && (
          <p className="mt-2 rounded-xl bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
            ⚠️ Apport protéique insuffisant pour préserver votre masse musculaire. Objectif : {proteinGoal}g de protéines aujourd'hui.
          </p>
        )}
        <p className="mt-2 text-[11px] text-muted-foreground text-center">
          ⚠️ Ces recommandations sont indicatives. Consultez votre médecin pour un suivi personnalisé.
        </p>
        <button
          onClick={() => navigate("/ration")}
          className="mt-3 w-full text-sm text-pink-deep font-medium underline-offset-4 hover:underline"
        >
          💡 Comprendre ta ration — Comment c'est calculé ?
        </button>

        {/* Meal breakdown accordions */}
        <div className="mt-4 space-y-2">
          {mealBreakdown.map((meal) => (
            <div key={meal.key} className="bg-muted/30 rounded-xl overflow-hidden">
              <button
                onClick={() => setOpenMeals((prev) => ({ ...prev, [meal.key]: !prev[meal.key] }))}
                className="w-full flex items-center justify-between px-3 py-2.5"
              >
                <span className="text-sm font-medium text-foreground">{meal.label}</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-primary-foreground bg-primary/20 px-2 py-1 rounded-full">
                    {Math.round(meal.consumed.calories)} kcal · {Math.round(meal.consumed.proteins)}P · {Math.round(meal.consumed.carbs)}G · {Math.round(meal.consumed.fats)}L
                  </span>
                  {openMeals[meal.key] ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                </div>
              </button>
              {openMeals[meal.key] && meal.target && (
                <MealProgressBlock target={meal.target} consumed={meal.consumed} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Micronutrients */}
      <div className="bg-card rounded-2xl p-5 card-soft mb-4 animate-fade-in">
        <h3 className="text-base font-semibold text-foreground mb-3">Micronutriments clés</h3>
        <div className="space-y-2">
          <ProgressBar value={totals.calcium} max={rnpTarget("calcium", DAILY_TARGETS.calcium)} label="Calcium" unit="mg" isMicro nutrient="calcium" supplementAmount={supBy("calcium")} supplementUnit="mg" supplementSources={supSources("calcium")} limit={supLimit("calcium")} />
          <ProgressBar value={totals.vitamin_d} max={rnpTarget("vitamin_d", vitaminDGoal)} label="Vitamine D" unit="µg" isMicro nutrient="vitamin_d" supplementAmount={supBy("vitamin_d")} supplementUnit="µg" supplementSources={supSources("vitamin_d")} limit={supLimit("vitamin_d")} />
          <ProgressBar value={totals.magnesium} max={rnpTarget("magnesium", DAILY_TARGETS.magnesium)} label="Magnésium" unit="mg" isMicro nutrient="magnesium" supplementAmount={supBy("magnesium")} supplementUnit="mg" supplementSources={supSources("magnesium")} limit={supLimit("magnesium")} />
          <ProgressBar value={totals.iron} max={rnpTarget("iron", DAILY_TARGETS.iron)} label="Fer" unit="mg" isMicro nutrient="iron" supplementAmount={supBy("iron")} supplementUnit="mg" supplementSources={supSources("iron")} limit={supLimit("iron")} />
          <ProgressBar value={totals.omega3} max={DAILY_TARGETS.omega3} label="Oméga-3" unit="g" isMicro nutrient="omega3" supplementAmount={supBy("omega3", 1000)} supplementUnit="g" supplementSources={supSources("omega3", 1000)} limit={supLimit("omega3", 1000)} />
          <ProgressBar value={totals.phytoestrogens} max={DAILY_TARGETS.phytoestrogens} label="Phytoestrogènes" unit="mg" isMicro nutrient="phytoestrogens" maxPrefix="~" hint="(objectif indicatif)" />
          <ProgressBar value={totals.vitamin_b12} max={rnpTarget("vitamin_b12", DAILY_TARGETS.vitamin_b12)} label="Vitamine B12" unit="µg" isMicro nutrient="vitamin_b12" supplementAmount={supBy("vitamin_b12")} supplementUnit="µg" supplementSources={supSources("vitamin_b12")} limit={supLimit("vitamin_b12")} />

        </div>

        {showSecondaryMicros && (
          <div className="space-y-2 mt-2 pt-3 border-t border-border animate-fade-in">
            <ProgressBar value={totals.potassium} max={rnpTarget("potassium", DAILY_TARGETS.potassium)} label="Potassium" unit="mg" isMicro nutrient="potassium" supplementAmount={supBy("potassium")} supplementUnit="mg" supplementSources={supSources("potassium")} limit={supLimit("potassium")} />
            <ProgressBar value={totals.zinc} max={rnpTarget("zinc", DAILY_TARGETS.zinc)} label="Zinc" unit="mg" isMicro nutrient="zinc" supplementAmount={supBy("zinc")} supplementUnit="mg" supplementSources={supSources("zinc")} limit={supLimit("zinc")} />
            <ProgressBar value={totals.vitamin_k} max={rnpTarget("vitamin_k", DAILY_TARGETS.vitamin_k)} label="Vitamine K" unit="µg" isMicro nutrient="vitamin_k" supplementAmount={supBy("vitamin_k")} supplementUnit="µg" supplementSources={supSources("vitamin_k")} limit={supLimit("vitamin_k")} />
            <ProgressBar value={totals.vitamin_b6} max={rnpTarget("vitamin_b6", DAILY_TARGETS.vitamin_b6)} label="Vitamine B6" unit="mg" isMicro nutrient="vitamin_b6" supplementAmount={supBy("vitamin_b6")} supplementUnit="mg" supplementSources={supSources("vitamin_b6")} limit={supLimit("vitamin_b6")} />
            <ProgressBar value={totals.vitamin_b9} max={rnpTarget("vitamin_b9", DAILY_TARGETS.vitamin_b9)} label="Vitamine B9 (folate)" unit="µg" isMicro nutrient="vitamin_b9" supplementAmount={supBy("vitamin_b9")} supplementUnit="µg" supplementSources={supSources("vitamin_b9")} limit={supLimit("vitamin_b9")} />
            <ProgressBar value={totals.vitamin_e} max={rnpTarget("vitamin_e", DAILY_TARGETS.vitamin_e)} label="Vitamine E" unit="mg" isMicro nutrient="vitamin_e" supplementAmount={supBy("vitamin_e")} supplementUnit="mg" supplementSources={supSources("vitamin_e")} limit={supLimit("vitamin_e")} />

            <div className="rounded-xl bg-muted/30 px-3 py-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-foreground">Score antioxydants 🫐</span>
                <span className={`font-semibold ${antioxidantTone}`}>{Math.min(antioxidantScore, 5)}/5</span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{Math.min(antioxidantScore, 5)}/5 portions fruits & légumes</p>
              {antioxidantScore < 3 && (
                <p className="mt-1 text-xs text-muted-foreground">Ajoutez des fruits rouges ou légumes colorés pour booster vos antioxydants !</p>
              )}
            </div>
          </div>
        )}

        <button
          onClick={() => setShowSecondaryMicros((v) => !v)}
          className="mt-3 w-full text-xs font-medium text-pink-deep hover:text-primary transition-colors py-1.5 rounded-lg hover:bg-primary/5"
        >
          {showSecondaryMicros ? "− Réduire" : "+ Voir tous les micronutriments (6)"}
        </button>

        <p className="mt-2 text-[11px] text-muted-foreground">
          Les conseils alimentaires portent sur l'assiette seule ; le statut est évalué sur le total,
          compléments cochés inclus. Couverture calculée sur les repères ANSES.
        </p>
        <button
          onClick={() => navigate("/complements")}
          className="mt-2 w-full text-xs font-medium text-pink-deep hover:text-primary transition-colors py-1.5 rounded-lg hover:bg-primary/5"
        >
          💊 Mes compléments
        </button>
      </div>


      {/* Micronutrient trend chart */}
      <MicronutrientTrendChart />

      {/* 7-day chart */}
      <div className="bg-card rounded-2xl p-5 card-soft mb-4 animate-fade-in">
        <h3 className="text-base font-semibold text-foreground mb-3">Tendances calories 7 jours</h3>
        <ResponsiveContainer width="100%" height={140}>
          <BarChart data={chartData}>
            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
            <YAxis hide />
            <Tooltip
              contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }}
              formatter={(value: number) => [`${value} kcal`, "Calories"]}
            />
            <Bar dataKey="calories" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Weight tracker */}
      <WeightTracker />

      {/* Tomorrow teaser */}
      <TomorrowPreview />
    </div>
  );
}
