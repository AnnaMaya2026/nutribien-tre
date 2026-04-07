import { useFoodLogs } from "@/hooks/useFoodLogs";
import { useProfile } from "@/hooks/useProfile";
import { useAuth } from "@/hooks/useAuth";
import { useSymptomLogs } from "@/hooks/useSymptomLogs";
import { DAILY_TARGETS } from "@/lib/mockData";
import { useState } from "react";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";
import { SymptomChips } from "@/components/SymptomChips";
import { FULL_SYMPTOMS_LIST } from "@/lib/symptoms";

function ProgressBar({ value, max, label, unit }: { value: number; max: number; label: string; unit: string }) {
  const pct = Math.min((value / max) * 100, 100);
  const color = pct < 50 ? "bg-progress-low" : pct < 80 ? "bg-progress-mid" : "bg-progress-high";

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium text-foreground">{Math.round(value)}/{max}{unit}</span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-500 ${color}`} style={{ width: `${pct}%` }} />
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

function getUserFirstName(email?: string): string {
  if (!email) return "";
  const local = email.split("@")[0];
  const name = local.replace(/[._-]/g, " ").split(" ")[0];
  return name.charAt(0).toUpperCase() + name.slice(1);
}

const MACRO_GOALS = { proteins: 100, carbs: 200, fats: 65 };

export default function Dashboard() {
  const { user } = useAuth();
  const { profile } = useProfile();
  const { logs, weekLogs } = useFoodLogs();
  const { todayLog, upsertLog } = useSymptomLogs();
  const [showSymptoms, setShowSymptoms] = useState(false);
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>(
    todayLog?.selected_symptoms || []
  );

  const calorieGoal = profile?.daily_calorie_goal || 1800;
  const firstName = getUserFirstName(user?.email);

  const totals = logs.reduce(
    (acc, log) => ({
      calories: acc.calories + (log.calories || 0),
      proteins: acc.proteins + (log.proteins || 0),
      carbs: acc.carbs + (log.carbs || 0),
      fats: acc.fats + (log.fats || 0),
      calcium: acc.calcium + (log.calcium || 0),
      vitamin_d: acc.vitamin_d + (log.vitamin_d || 0),
      magnesium: acc.magnesium + (log.magnesium || 0),
      iron: acc.iron + (log.iron || 0),
      omega3: acc.omega3 + (log.omega3 || 0),
      phytoestrogens: acc.phytoestrogens + (log.phytoestrogens || 0),
      vitamin_b12: acc.vitamin_b12 + (log.vitamin_b12 || 0),
    }),
    { calories: 0, proteins: 0, carbs: 0, fats: 0, calcium: 0, vitamin_d: 0, magnesium: 0, iron: 0, omega3: 0, phytoestrogens: 0, vitamin_b12: 0 }
  );

  const chartData = (() => {
    const days: Record<string, number> = {};
    const labels = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split("T")[0];
      days[key] = 0;
    }
    weekLogs.forEach((log) => {
      const key = log.logged_at;
      if (key in days) days[key] += log.calories || 0;
    });
    return Object.entries(days).map(([date, cal]) => {
      const d = new Date(date);
      return { name: labels[d.getDay()], calories: Math.round(cal) };
    });
  })();

  const calPct = Math.min((totals.calories / calorieGoal) * 100, 100);

  const toggleSymptom = (value: string) => {
    setSelectedSymptoms((prev) =>
      prev.includes(value) ? prev.filter((s) => s !== value) : [...prev, value]
    );
  };

  const handleSymptomSave = () => {
    upsertLog.mutate({ selected_symptoms: selectedSymptoms });
    setShowSymptoms(false);
  };

  return (
    <div className="pb-24 px-4 pt-6 bg-background min-h-screen">
      {/* Greeting */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">
          Bonjour {firstName ? firstName : ""} 👋
        </h1>
        <p className="text-muted-foreground text-sm">{formatFrenchDate()}</p>
      </div>

      {/* Calorie ring + macro bars */}
      <div className="bg-card rounded-2xl p-6 card-soft mb-4 animate-fade-in">
        {/* Large circular progress ring with gradient */}
        <div className="flex flex-col items-center mb-6">
          <div className="relative w-44 h-44">
            <svg className="w-44 h-44 -rotate-90" viewBox="0 0 100 100">
              <defs>
                <linearGradient id="ring-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="hsl(var(--primary))" />
                  <stop offset="100%" stopColor="hsl(340, 80%, 75%)" />
                </linearGradient>
              </defs>
              <circle cx="50" cy="50" r="42" fill="none" stroke="hsl(var(--muted))" strokeWidth="6" />
              <circle
                cx="50" cy="50" r="42" fill="none"
                stroke="url(#ring-gradient)"
                strokeWidth="6"
                strokeLinecap="round"
                strokeDasharray={`${calPct * 2.64} 264`}
                className="transition-all duration-700"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-bold text-foreground">{Math.round(totals.calories)}</span>
              <span className="text-xs text-muted-foreground">kcal consommées</span>
              <span className="text-[10px] text-muted-foreground mt-0.5">/ {calorieGoal} kcal</span>
            </div>
          </div>
        </div>

        {/* 3 macro bars side by side */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Protéines", value: totals.proteins, max: MACRO_GOALS.proteins, color: "bg-progress-high" },
            { label: "Glucides", value: totals.carbs, max: MACRO_GOALS.carbs, color: "bg-progress-mid" },
            { label: "Lipides", value: totals.fats, max: MACRO_GOALS.fats, color: "bg-primary" },
          ].map((m) => {
            const pct = Math.min((m.value / m.max) * 100, 100);
            return (
              <div key={m.label} className="text-center">
                <div className="text-xs text-muted-foreground mb-1">{m.label}</div>
                <div className="text-sm font-bold text-foreground">{Math.round(m.value)}g</div>
                <div className="text-[10px] text-muted-foreground mb-1">/ {m.max}g</div>
                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                  <div className={`h-full rounded-full transition-all duration-500 ${m.color}`} style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Micronutrients */}
      <div className="bg-card rounded-2xl p-5 card-soft mb-4 animate-fade-in">
        <h3 className="text-sm font-semibold text-foreground mb-3">Micronutriments clés</h3>
        <div className="space-y-2">
          <ProgressBar value={totals.calcium} max={DAILY_TARGETS.calcium} label="Calcium" unit="mg" />
          <ProgressBar value={totals.vitamin_d} max={DAILY_TARGETS.vitamin_d} label="Vitamine D" unit="µg" />
          <ProgressBar value={totals.magnesium} max={DAILY_TARGETS.magnesium} label="Magnésium" unit="mg" />
          <ProgressBar value={totals.iron} max={DAILY_TARGETS.iron} label="Fer" unit="mg" />
          <ProgressBar value={totals.omega3} max={DAILY_TARGETS.omega3} label="Oméga-3" unit="g" />
          <ProgressBar value={totals.phytoestrogens} max={DAILY_TARGETS.phytoestrogens} label="Phytoestrogènes" unit="mg" />
          <ProgressBar value={totals.vitamin_b12} max={DAILY_TARGETS.vitamin_b12} label="Vitamine B12" unit="µg" />
        </div>
      </div>

      {/* Symptom check-in */}
      <div className="bg-card rounded-2xl p-5 card-soft mb-4 animate-fade-in">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-sm font-semibold text-foreground">Check-in symptômes</h3>
          {!showSymptoms && (
            <button onClick={() => { setShowSymptoms(true); setSelectedSymptoms(todayLog?.selected_symptoms || []); }} className="text-xs font-medium text-primary-foreground bg-primary/30 px-3 py-1 rounded-full">
              {todayLog ? "Modifier" : "Remplir"}
            </button>
          )}
        </div>
        {showSymptoms ? (
          <div className="space-y-3">
            <SymptomChips selected={selectedSymptoms} onToggle={toggleSymptom} />
            <button onClick={handleSymptomSave} className="w-full mt-2 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium">
              Enregistrer
            </button>
          </div>
        ) : todayLog?.selected_symptoms && todayLog.selected_symptoms.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {todayLog.selected_symptoms.map((s) => {
              const label = FULL_SYMPTOMS_LIST.find((x) => x.value === s)?.label || s;
              return (
                <span key={s} className="text-[10px] px-2 py-0.5 rounded-full bg-primary/20 text-foreground">
                  {label}
                </span>
              );
            })}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">Aucun check-in aujourd'hui</p>
        )}
      </div>

      {/* 7-day chart */}
      <div className="bg-card rounded-2xl p-5 card-soft animate-fade-in">
        <h3 className="text-sm font-semibold text-foreground mb-3">Tendances 7 jours</h3>
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
    </div>
  );
}
