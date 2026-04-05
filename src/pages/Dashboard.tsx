import { useFoodLogs } from "@/hooks/useFoodLogs";
import { useProfile } from "@/hooks/useProfile";
import { useSymptomLogs } from "@/hooks/useSymptomLogs";
import { DAILY_TARGETS } from "@/lib/mockData";
import { useState } from "react";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";
import { Activity, Flame, Moon, ThermometerSun } from "lucide-react";

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

export default function Dashboard() {
  const { profile } = useProfile();
  const { logs, weekLogs } = useFoodLogs();
  const { todayLog, upsertLog } = useSymptomLogs();
  const [showSymptoms, setShowSymptoms] = useState(false);
  const [symptoms, setSymptoms] = useState({
    fatigue: todayLog?.fatigue || 0,
    bouffees_chaleur: todayLog?.bouffees_chaleur || 0,
    insomnie: todayLog?.insomnie || 0,
    sautes_humeur: todayLog?.sautes_humeur || 0,
  });

  const calorieGoal = profile?.daily_calorie_goal || 1800;
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

  // 7-day chart data
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

  const handleSymptomSave = () => {
    upsertLog.mutate(symptoms);
    setShowSymptoms(false);
  };

  return (
    <div className="pb-24 px-4 pt-6 bg-background min-h-screen">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Bonjour 👋</h1>
        <p className="text-muted-foreground text-sm">Votre suivi du jour</p>
      </div>

      {/* Calorie ring */}
      <div className="bg-card rounded-2xl p-6 card-soft mb-4 animate-fade-in">
        <div className="flex items-center gap-6">
          <div className="relative w-24 h-24 flex-shrink-0">
            <svg className="w-24 h-24 -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="42" fill="none" stroke="hsl(var(--muted))" strokeWidth="8" />
              <circle
                cx="50" cy="50" r="42" fill="none"
                stroke={calPct < 50 ? "hsl(var(--progress-low))" : calPct < 80 ? "hsl(var(--progress-mid))" : "hsl(var(--progress-high))"}
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={`${calPct * 2.64} 264`}
                className="transition-all duration-700"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-lg font-bold text-foreground">{Math.round(totals.calories)}</span>
              <span className="text-[10px] text-muted-foreground">/{calorieGoal}</span>
            </div>
          </div>
          <div className="flex-1 space-y-2">
            <ProgressBar value={totals.proteins} max={DAILY_TARGETS.proteins} label="Protéines" unit="g" />
            <ProgressBar value={totals.carbs} max={DAILY_TARGETS.carbs} label="Glucides" unit="g" />
            <ProgressBar value={totals.fats} max={DAILY_TARGETS.fats} label="Lipides" unit="g" />
          </div>
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
            <button onClick={() => setShowSymptoms(true)} className="text-xs font-medium text-primary-foreground bg-primary/30 px-3 py-1 rounded-full">
              {todayLog ? "Modifier" : "Remplir"}
            </button>
          )}
        </div>
        {showSymptoms ? (
          <div className="space-y-3">
            {[
              { key: "fatigue" as const, label: "Fatigue", icon: Activity },
              { key: "bouffees_chaleur" as const, label: "Bouffées de chaleur", icon: ThermometerSun },
              { key: "insomnie" as const, label: "Insomnie", icon: Moon },
              { key: "sautes_humeur" as const, label: "Sautes d'humeur", icon: Flame },
            ].map(({ key, label, icon: Icon }) => (
              <div key={key} className="flex items-center gap-3">
                <Icon className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm flex-1 text-foreground">{label}</span>
                <div className="flex gap-1">
                  {[0, 1, 2, 3, 4, 5].map((v) => (
                    <button
                      key={v}
                      onClick={() => setSymptoms({ ...symptoms, [key]: v })}
                      className={`w-7 h-7 rounded-full text-xs font-medium transition-all ${
                        symptoms[key] === v
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground hover:bg-primary/20"
                      }`}
                    >
                      {v}
                    </button>
                  ))}
                </div>
              </div>
            ))}
            <button onClick={handleSymptomSave} className="w-full mt-2 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium">
              Enregistrer
            </button>
          </div>
        ) : todayLog ? (
          <div className="flex gap-4 text-xs text-muted-foreground">
            <span>Fatigue: {todayLog.fatigue}/5</span>
            <span>Chaleur: {todayLog.bouffees_chaleur}/5</span>
            <span>Insomnie: {todayLog.insomnie}/5</span>
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
