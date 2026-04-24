import { useFoodLogs } from "@/hooks/useFoodLogs";
import { useProfile } from "@/hooks/useProfile";
import { useAuth } from "@/hooks/useAuth";
import { DAILY_TARGETS } from "@/lib/mockData";
import { useState, useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";
import MicronutrientTrendChart from "@/components/MicronutrientTrendChart";
import WeightTracker from "@/components/WeightTracker";
import DailyRecapCard from "@/components/DailyRecapCard";
import HealthProfileCard from "@/components/HealthProfileCard";
import HelpCarousel from "@/components/HelpCarousel";
import { ChevronDown, ChevronUp, Info, LogOut } from "lucide-react";
import { getDisplayName } from "@/lib/displayName";
import { Button } from "@/components/ui/button";
import { formatPortion } from "@/lib/portionUnits";
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

function getNutrientColor(pct: number, isMicro = false) {
  if (isMicro) {
    if (pct > 100) return { bg: "bg-blue-500", text: "text-blue-500", emoji: "💧" };
    if (pct >= 80) return { bg: "bg-green-500", text: "text-green-500", emoji: "🟢" };
    if (pct >= 50) return { bg: "bg-orange-500", text: "text-orange-500", emoji: "🟠" };
    return { bg: "bg-red-500", text: "text-red-500", emoji: "🔴" };
  }
  if (pct > 120) return { bg: "bg-red-500", text: "text-red-500", emoji: "🔴" };
  if (pct > 100) return { bg: "bg-orange-500", text: "text-orange-500", emoji: "🟠" };
  if (pct >= 80) return { bg: "bg-green-500", text: "text-green-500", emoji: "🟢" };
  if (pct >= 50) return { bg: "bg-orange-500", text: "text-orange-500", emoji: "🟠" };
  return { bg: "bg-red-500", text: "text-red-500", emoji: "🔴" };
}

function getCalorieColor(pct: number) {
  if (pct > 110) return { stroke: "hsl(0, 70%, 55%)", text: "text-red-500", emoji: "🔴" };
  if (pct > 100) return { stroke: "hsl(35, 80%, 55%)", text: "text-orange-500", emoji: "🟠" };
  if (pct >= 80) return { stroke: "hsl(145, 60%, 45%)", text: "text-green-500", emoji: "🟢" };
  return { stroke: "hsl(var(--primary))", text: "text-pink-deep", emoji: "" };
}

function ProgressBar({ value, max, label, unit, isMicro = false }: { value: number; max: number; label: string; unit: string; isMicro?: boolean }) {
  const rawPct = (value / max) * 100;
  const barPct = Math.min(rawPct, 100);
  const { bg, text, emoji } = getNutrientColor(rawPct, isMicro);
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-[15px]">
        <span className="text-muted-foreground">{label}</span>
        <span className={`font-semibold ${text}`}>{emoji} {Math.round(value)}/{max}{unit}</span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-500 ${bg}`} style={{ width: `${barPct}%` }} />
      </div>
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

const MEAL_LABELS: Record<string, string> = {
  "petit-dejeuner": "🌅 Petit-déj",
  dejeuner: "☀️ Déjeuner",
  diner: "🌙 Dîner",
  collation: "🍎 Collation",
};

export default function Dashboard() {
  const { user, signOut } = useAuth();
  const { profile } = useProfile();
  const { logs, weekLogs } = useFoodLogs();
  const [showMealBreakdown, setShowMealBreakdown] = useState(false);
  const [showSecondaryMicros, setShowSecondaryMicros] = useState(false);

  const calorieGoal = profile?.daily_calorie_goal || 1800;
  const proteinGoal = Math.max(1, Math.round(Number(profile?.weight || 60) * 1.0));
  const vitaminDGoal = getVitaminDGoal(profile?.age);
  const firstName = getDisplayName((profile as any)?.display_name, user?.email);

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
      omega6: acc.omega6 + ((log as any).omega6 || 0),
    }),
    { calories: 0, proteins: 0, carbs: 0, fats: 0, fibres: 0, calcium: 0, vitamin_d: 0, magnesium: 0, iron: 0, omega3: 0, phytoestrogens: 0, vitamin_b12: 0, potassium: 0, zinc: 0, vitamin_k: 0, vitamin_b6: 0, vitamin_b9: 0, vitamin_e: 0, omega6: 0 }
  );

  const antioxidantScore = getProducePortions(logs);
  const antioxidantTone = antioxidantScore >= 5 ? "text-green-500" : antioxidantScore >= 3 ? "text-orange-500" : "text-red-500";
  const hasOmega6Data = totals.omega6 > 0;
  const omegaRatio = hasOmega6Data && totals.omega3 > 0 ? totals.omega6 / totals.omega3 : null;
  const omegaRatioStatus = omegaRatio === null ? null : omegaRatio <= 4 ? "🟢 Excellent (anti-inflammatoire)" : omegaRatio <= 8 ? "🟠 Acceptable" : "🔴 Pro-inflammatoire";

  const mealBreakdown = useMemo(() => {
    const meals: Record<string, number> = {};
    logs.forEach((log) => {
      const mt = log.meal_type || "autre";
      meals[mt] = (meals[mt] || 0) + (log.calories || 0);
    });
    return Object.entries(meals).map(([key, cal]) => ({
      label: MEAL_LABELS[key] || key,
      calories: Math.round(cal),
      portions: logs.filter((log) => (log.meal_type || "autre") === key).map((log) => formatPortion(log.food_name, log.portion_size)).join(" · "),
    }));
  }, [logs]);

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

  const calPct = (totals.calories / calorieGoal) * 100;
  const calColor = getCalorieColor(calPct);
  const calRingPct = Math.min(calPct, 100);

  return (
    <div className="pb-24 px-4 pt-6 bg-background min-h-screen">
      {/* Greeting */}
      <div className="mb-6 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Bonjour {firstName ? firstName : ""} 👋</h1>
          <p className="text-muted-foreground text-sm">{formatFrenchDate()}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <HelpCarousel />
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

      {/* Daily evening recap (visible after 8pm) */}
      <DailyRecapCard />



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
              <span className={`text-3xl font-bold ${calColor.text}`}>{calColor.emoji} {Math.round(totals.calories)}</span>
              <span className="text-xs text-muted-foreground">kcal consommées</span>
              <span className="text-[10px] text-muted-foreground mt-0.5">/ {calorieGoal} kcal</span>
            </div>
          </div>
        </div>

        {/* Macro bars */}
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: "Protéines", value: totals.proteins, max: MACRO_GOALS.proteins, isMicro: false },
            { label: "Glucides", value: totals.carbs, max: MACRO_GOALS.carbs, isMicro: false },
            { label: "Lipides", value: totals.fats, max: MACRO_GOALS.fats, isMicro: false },
            { label: "Fibres", value: totals.fibres, max: MACRO_GOALS.fibres, isMicro: true },
          ].map((m) => {
            const rawPct = (m.value / m.max) * 100;
            const barPct = Math.min(rawPct, 100);
            const { bg, text, emoji } = getNutrientColor(rawPct, m.isMicro);
            return (
              <div key={m.label} className="text-center">
                <div className="text-sm text-muted-foreground mb-1">{m.label}</div>
                <div className={`text-lg font-bold ${text}`}>{emoji} {Math.round(m.value)}g</div>
                <div className="text-xs text-muted-foreground mb-1">/ {m.max}g</div>
                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                  <div className={`h-full rounded-full transition-all duration-500 ${bg}`} style={{ width: `${barPct}%` }} />
                </div>
              </div>
            );
          })}
        </div>

        {/* Meal breakdown toggle */}
        {mealBreakdown.length > 0 && (
          <div className="mt-4">
            <button onClick={() => setShowMealBreakdown(!showMealBreakdown)} className="flex items-center gap-1 text-xs text-primary-foreground bg-primary/20 px-3 py-1 rounded-full mx-auto">
              Détail par repas {showMealBreakdown ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
            {showMealBreakdown && (
              <div className="mt-3 space-y-1.5">
                {mealBreakdown.map((m) => (
                  <div key={m.label} className="flex items-center justify-between bg-muted/30 rounded-lg px-3 py-2">
                    <span className="text-xs text-foreground">{m.label}</span>
                    <span className="text-xs font-semibold text-foreground">{m.calories} kcal{m.portions ? ` · ${m.portions}` : ""}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Micronutrients */}
      <div className="bg-card rounded-2xl p-5 card-soft mb-4 animate-fade-in">
        <h3 className="text-base font-semibold text-foreground mb-3">Micronutriments clés</h3>
        <div className="space-y-2">
          <ProgressBar value={totals.calcium} max={DAILY_TARGETS.calcium} label="Calcium" unit="mg" isMicro />
          <ProgressBar value={totals.vitamin_d} max={DAILY_TARGETS.vitamin_d} label="Vitamine D" unit="µg" isMicro />
          <ProgressBar value={totals.magnesium} max={DAILY_TARGETS.magnesium} label="Magnésium" unit="mg" isMicro />
          <ProgressBar value={totals.iron} max={DAILY_TARGETS.iron} label="Fer" unit="mg" isMicro />
          <ProgressBar value={totals.omega3} max={DAILY_TARGETS.omega3} label="Oméga-3" unit="g" isMicro />
          <ProgressBar value={totals.phytoestrogens} max={DAILY_TARGETS.phytoestrogens} label="Phytoestrogènes" unit="mg" isMicro />
          <ProgressBar value={totals.vitamin_b12} max={DAILY_TARGETS.vitamin_b12} label="Vitamine B12" unit="µg" isMicro />
        </div>

        {showSecondaryMicros && (
          <div className="space-y-2 mt-2 pt-3 border-t border-border animate-fade-in">
            <ProgressBar value={totals.potassium} max={DAILY_TARGETS.potassium} label="Potassium" unit="mg" isMicro />
            <ProgressBar value={totals.zinc} max={DAILY_TARGETS.zinc} label="Zinc" unit="mg" isMicro />
            <ProgressBar value={totals.vitamin_k} max={DAILY_TARGETS.vitamin_k} label="Vitamine K" unit="µg" isMicro />
            <ProgressBar value={totals.vitamin_b6} max={DAILY_TARGETS.vitamin_b6} label="Vitamine B6" unit="mg" isMicro />
            <ProgressBar value={totals.vitamin_b9} max={DAILY_TARGETS.vitamin_b9} label="Vitamine B9 (folate)" unit="µg" isMicro />
            <ProgressBar value={totals.vitamin_e} max={DAILY_TARGETS.vitamin_e} label="Vitamine E" unit="mg" isMicro />
          </div>
        )}

        <button
          onClick={() => setShowSecondaryMicros((v) => !v)}
          className="mt-3 w-full text-xs font-medium text-pink-deep hover:text-primary transition-colors py-1.5 rounded-lg hover:bg-primary/5"
        >
          {showSecondaryMicros ? "− Réduire" : "+ Voir tous les micronutriments (6)"}
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
    </div>
  );
}
