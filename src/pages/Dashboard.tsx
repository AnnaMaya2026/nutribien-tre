import { useFoodLogs } from "@/hooks/useFoodLogs";
import { useProfile } from "@/hooks/useProfile";
import { useAuth } from "@/hooks/useAuth";
import { useSymptomLogs, SymptomScores } from "@/hooks/useSymptomLogs";
import { DAILY_TARGETS } from "@/lib/mockData";
import { useState, useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";
import { FULL_SYMPTOMS_LIST } from "@/lib/symptoms";
import { SYMPTOM_FOOD_MAP } from "@/lib/symptomFoods";
import { AlertTriangle, ChevronDown, ChevronUp } from "lucide-react";

function getNutrientColor(pct: number, isMicro = false) {
  if (isMicro) {
    if (pct > 100) return { bg: "bg-blue-500", text: "text-blue-500", emoji: "💧" };
    if (pct >= 80) return { bg: "bg-green-500", text: "text-green-500", emoji: "🟢" };
    if (pct >= 50) return { bg: "bg-orange-500", text: "text-orange-500", emoji: "🟠" };
    return { bg: "bg-red-500", text: "text-red-500", emoji: "🔴" };
  }
  // Macros
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
  return { stroke: "hsl(var(--primary))", text: "text-primary", emoji: "" };
}

function ProgressBar({ value, max, label, unit, isMicro = false }: { value: number; max: number; label: string; unit: string; isMicro?: boolean }) {
  const rawPct = (value / max) * 100;
  const barPct = Math.min(rawPct, 100);
  const { bg, text, emoji } = getNutrientColor(rawPct, isMicro);
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className={`font-medium ${text}`}>{emoji} {Math.round(value)}/{max}{unit}</span>
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

function getUserFirstName(email?: string): string {
  if (!email) return "";
  const local = email.split("@")[0];
  const name = local.replace(/[._-]/g, " ").split(" ")[0];
  return name.charAt(0).toUpperCase() + name.slice(1);
}

const MACRO_GOALS = { proteins: 100, carbs: 200, fats: 65, fibres: 25 };

const MEAL_LABELS: Record<string, string> = {
  "petit-dejeuner": "🌅 Petit-déj",
  dejeuner: "☀️ Déjeuner",
  diner: "🌙 Dîner",
  collation: "🍎 Collation",
};

export default function Dashboard() {
  const { user } = useAuth();
  const { profile } = useProfile();
  const { logs, weekLogs } = useFoodLogs();
  const { todayLog, upsertLog, weekLogs: symptomWeekLogs } = useSymptomLogs();
  const [showSymptoms, setShowSymptoms] = useState(false);
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>(todayLog?.selected_symptoms || []);
  const [symptomScores, setSymptomScores] = useState<SymptomScores>(() => {
    const raw = todayLog?.symptom_scores;
    if (raw && typeof raw === "object" && !Array.isArray(raw)) return raw as SymptomScores;
    return {};
  });
  const [showMealBreakdown, setShowMealBreakdown] = useState(false);
  

  const calorieGoal = profile?.daily_calorie_goal || 1800;
  const firstName = getUserFirstName(user?.email);

  const totals = logs.reduce(
    (acc, log) => ({
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
    }),
    { calories: 0, proteins: 0, carbs: 0, fats: 0, fibres: 0, calcium: 0, vitamin_d: 0, magnesium: 0, iron: 0, omega3: 0, phytoestrogens: 0, vitamin_b12: 0 }
  );

  // Meal breakdown
  const mealBreakdown = useMemo(() => {
    const meals: Record<string, number> = {};
    logs.forEach((log) => {
      const mt = log.meal_type || "autre";
      meals[mt] = (meals[mt] || 0) + (log.calories || 0);
    });
    return Object.entries(meals).map(([key, cal]) => ({
      label: MEAL_LABELS[key] || key,
      calories: Math.round(cal),
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

  // High symptoms (score ≥ 7) for food recommendations
  const highSymptoms = useMemo(() => {
    return Object.entries(symptomScores)
      .filter(([, score]) => score >= 7)
      .map(([key]) => key)
      .filter((key) => SYMPTOM_FOOD_MAP[key]);
  }, [symptomScores]);

  const calPct = (totals.calories / calorieGoal) * 100;
  const calColor = getCalorieColor(calPct);
  const calRingPct = Math.min(calPct, 100);

  const toggleSymptom = (value: string) => {
    setSelectedSymptoms((prev) => {
      const next = prev.includes(value) ? prev.filter((s) => s !== value) : [...prev, value];
      if (!next.includes(value)) {
        setSymptomScores((s) => { const copy = { ...s }; delete copy[value]; return copy; });
      } else if (!symptomScores[value]) {
        setSymptomScores((s) => ({ ...s, [value]: 5 }));
      }
      return next;
    });
  };

  const handleSymptomSave = () => {
    upsertLog.mutate({ selected_symptoms: selectedSymptoms, symptom_scores: symptomScores });
    setShowSymptoms(false);
  };

  return (
    <div className="pb-24 px-4 pt-6 bg-background min-h-screen">
      {/* Greeting */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Bonjour {firstName ? firstName : ""} 👋</h1>
        <p className="text-muted-foreground text-sm">{formatFrenchDate()}</p>
      </div>

      {/* Calorie ring + macro bars */}
      <div className="bg-card rounded-2xl p-6 card-soft mb-4 animate-fade-in">
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
            { label: "Protéines", value: totals.proteins, max: MACRO_GOALS.proteins },
            { label: "Glucides", value: totals.carbs, max: MACRO_GOALS.carbs },
            { label: "Lipides", value: totals.fats, max: MACRO_GOALS.fats },
            { label: "Fibres", value: totals.fibres, max: MACRO_GOALS.fibres },
          ].map((m) => {
            const rawPct = (m.value / m.max) * 100;
            const barPct = Math.min(rawPct, 100);
            const { bg, text, emoji } = getNutrientColor(rawPct);
            return (
              <div key={m.label} className="text-center">
                <div className="text-xs text-muted-foreground mb-1">{m.label}</div>
                <div className={`text-sm font-bold ${text}`}>{emoji} {Math.round(m.value)}g</div>
                <div className="text-[10px] text-muted-foreground mb-1">/ {m.max}g</div>
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
                    <span className="text-xs font-semibold text-foreground">{m.calories} kcal</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Micronutrients */}
      <div className="bg-card rounded-2xl p-5 card-soft mb-4 animate-fade-in">
        <h3 className="text-sm font-semibold text-foreground mb-3">Micronutriments clés</h3>
        <div className="space-y-2">
          <ProgressBar value={totals.calcium} max={DAILY_TARGETS.calcium} label="Calcium" unit="mg" isMicro />
          <ProgressBar value={totals.vitamin_d} max={DAILY_TARGETS.vitamin_d} label="Vitamine D" unit="µg" isMicro />
          <ProgressBar value={totals.magnesium} max={DAILY_TARGETS.magnesium} label="Magnésium" unit="mg" isMicro />
          <ProgressBar value={totals.iron} max={DAILY_TARGETS.iron} label="Fer" unit="mg" isMicro />
          <ProgressBar value={totals.omega3} max={DAILY_TARGETS.omega3} label="Oméga-3" unit="g" isMicro />
          <ProgressBar value={totals.phytoestrogens} max={DAILY_TARGETS.phytoestrogens} label="Phytoestrogènes" unit="mg" isMicro />
          <ProgressBar value={totals.vitamin_b12} max={DAILY_TARGETS.vitamin_b12} label="Vitamine B12" unit="µg" isMicro />
        </div>
      </div>

      {/* Symptom check-in with 1-10 scale */}
      <div className="bg-card rounded-2xl p-5 card-soft mb-4 animate-fade-in">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-sm font-semibold text-foreground">Check-in symptômes</h3>
          {!showSymptoms && (
            <button onClick={() => {
              setShowSymptoms(true);
              setSelectedSymptoms(todayLog?.selected_symptoms || []);
              const raw = todayLog?.symptom_scores;
              if (raw && typeof raw === "object" && !Array.isArray(raw)) setSymptomScores(raw as SymptomScores);
            }} className="text-xs font-medium text-primary-foreground bg-primary/30 px-3 py-1 rounded-full">
              {todayLog ? "Modifier" : "Remplir"}
            </button>
          )}
        </div>

        {showSymptoms ? (
          <div className="space-y-3">
            {/* Symptom selection */}
            <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
              {FULL_SYMPTOMS_LIST.map((s) => {
                const isSelected = selectedSymptoms.includes(s.value);
                return (
                  <button
                    key={s.value}
                    onClick={() => toggleSymptom(s.value)}
                    className={`px-3 py-2 rounded-full text-xs font-medium transition-all text-left truncate ${
                      isSelected ? "bg-primary/30 text-foreground border border-primary" : "bg-muted text-muted-foreground border border-transparent"
                    }`}
                  >
                    {isSelected && "✓ "}{s.label}
                  </button>
                );
              })}
            </div>

            {/* Score sliders for selected symptoms */}
            {selectedSymptoms.length > 0 && (
              <div className="space-y-3 mt-3 pt-3 border-t border-border">
                <p className="text-xs text-muted-foreground font-medium">Intensité (1 = léger, 10 = très intense)</p>
                {selectedSymptoms.map((sKey) => {
                  const label = FULL_SYMPTOMS_LIST.find((x) => x.value === sKey)?.label || sKey;
                  const score = symptomScores[sKey] || 5;
                  return (
                    <div key={sKey}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-foreground">{label}</span>
                        <span className={`font-bold ${score >= 7 ? "text-destructive" : score >= 4 ? "text-warning" : "text-progress-high"}`}>{score}/10</span>
                      </div>
                      <input
                        type="range"
                        min={1}
                        max={10}
                        value={score}
                        onChange={(e) => setSymptomScores((s) => ({ ...s, [sKey]: parseInt(e.target.value) }))}
                        className="w-full h-2 bg-muted rounded-full appearance-none cursor-pointer accent-primary"
                      />
                    </div>
                  );
                })}
              </div>
            )}

            <button onClick={handleSymptomSave} className="w-full mt-2 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium">
              Enregistrer
            </button>
          </div>
        ) : todayLog?.selected_symptoms && todayLog.selected_symptoms.length > 0 ? (
          <div>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {todayLog.selected_symptoms.map((s) => {
                const label = FULL_SYMPTOMS_LIST.find((x) => x.value === s)?.label || s;
                const score = symptomScores[s];
                return (
                  <span key={s} className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                    score && score >= 7 ? "bg-destructive/20 text-destructive" : "bg-primary/20 text-foreground"
                  }`}>
                    {label}{score ? ` ${score}/10` : ""}
                  </span>
                );
              })}
            </div>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">Aucun check-in aujourd'hui</p>
        )}
      </div>

      {/* Food recommendations for high symptoms */}
      {highSymptoms.length > 0 && (
        <div className="space-y-3 mb-4">
          {highSymptoms.map((sKey) => {
            const rec = SYMPTOM_FOOD_MAP[sKey];
            if (!rec) return null;
            return (
              <div key={sKey} className="bg-card rounded-2xl p-4 card-soft animate-fade-in border border-warning/30">
                <div className="flex items-start gap-2 mb-2">
                  <AlertTriangle className="w-4 h-4 text-warning flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-semibold text-foreground">
                      Votre score de {rec.label} est élevé ({symptomScores[sKey]}/10)
                    </p>
                    <p className="text-[10px] text-muted-foreground">{rec.description}</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {rec.foods.map((food) => (
                    <span key={food} className="text-[10px] px-2 py-0.5 rounded-full bg-progress-high/15 text-progress-high font-medium">
                      {food}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}


      {/* 7-day chart */}
      <div className="bg-card rounded-2xl p-5 card-soft animate-fade-in">
        <h3 className="text-sm font-semibold text-foreground mb-3">Tendances calories 7 jours</h3>
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
