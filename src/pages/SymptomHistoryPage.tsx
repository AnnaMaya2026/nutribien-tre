import { useState, useMemo, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { useJournalEntries, JOURNAL_CATEGORIES } from "@/hooks/useJournalEntries";
import { SymptomScores } from "@/hooks/useSymptomLogs";
import { FULL_SYMPTOMS_LIST } from "@/lib/symptoms";
import { SYMPTOM_FOOD_MAP } from "@/lib/symptomFoods";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import { AlertTriangle, TrendingUp, TrendingDown, ArrowRight, Check, Settings } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";
import { SymptomTipsCollapsible } from "@/components/SymptomTipsCollapsible";
import { CustomizeSymptomsModal } from "@/components/CustomizeSymptomsModal";

const PERIODS = [
  { value: 7, label: "7 jours" },
  { value: 30, label: "30 jours" },
  { value: 90, label: "3 mois" },
  { value: 180, label: "6 mois" },
  { value: 9999, label: "Tout" },
];

const CHART_COLORS = [
  "hsl(330, 60%, 65%)", "hsl(200, 60%, 55%)", "hsl(145, 50%, 45%)",
  "hsl(35, 80%, 55%)", "hsl(270, 50%, 60%)", "hsl(10, 70%, 55%)",
];

const JOURNAL_CATEGORY_COLORS: Record<string, string> = {
  complement: "hsl(270, 50%, 60%)",
  sport: "hsl(145, 50%, 45%)",
  alimentation: "hsl(330, 60%, 65%)",
  medecin: "hsl(200, 60%, 55%)",
  autre: "hsl(0, 0%, 60%)",
};

// ── Daily Rating Component ──
function DailyRating({
  scores,
  onScoresChange,
  onSubmit,
  isSubmitting,
  alreadySaved,
  symptomsList,
}: {
  scores: SymptomScores;
  onScoresChange: (s: SymptomScores) => void;
  onSubmit: () => void;
  isSubmitting: boolean;
  alreadySaved: boolean;
  symptomsList: { value: string; label: string }[];
}) {
  const activeSymptoms = symptomsList.filter((s) => (scores[s.value] ?? 0) > 0);
  const inactiveSymptoms = symptomsList.filter((s) => !scores[s.value] || scores[s.value] === 0);

  const setScore = (key: string, val: number) => {
    onScoresChange({ ...scores, [key]: val });
  };

  const highSymptoms = Object.entries(scores).filter(([, v]) => v >= 7);

  return (
    <div className="bg-card rounded-2xl p-4 card-soft mb-4 animate-fade-in">
      <h3 className="text-sm font-semibold text-foreground mb-1">🩺 Bilan du jour</h3>
      <p className="text-[10px] text-muted-foreground mb-3">
        Évaluez chaque symptôme de 1 (léger) à 10 (très intense)
      </p>

      {/* Active symptoms with sliders */}
      {activeSymptoms.map((s) => {
        const val = scores[s.value] || 0;
        const color = val >= 7 ? "text-destructive" : val >= 4 ? "text-warning" : "text-progress-high";
        return (
          <div key={s.value} className="mb-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-foreground">{s.label}</span>
              <span className={`text-xs font-bold ${color}`}>{val}/10</span>
            </div>
            <Slider
              value={[val]}
              onValueChange={([v]) => setScore(s.value, v)}
              min={0}
              max={10}
              step={1}
              className="w-full"
            />
            {/* Smart alert for high symptoms */}
            {val >= 7 && SYMPTOM_FOOD_MAP[s.value] && (
              <div className="mt-2 bg-destructive/10 rounded-xl p-3 border border-destructive/20">
                <div className="flex items-start gap-2 mb-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-destructive flex-shrink-0 mt-0.5" />
                  <p className="text-[10px] text-foreground font-medium">
                    Score élevé — aliments recommandés :
                  </p>
                </div>
                <div className="flex flex-wrap gap-1">
                  {SYMPTOM_FOOD_MAP[s.value].foods.slice(0, 3).map((food) => (
                    <span key={food} className="text-[10px] px-2 py-0.5 rounded-full bg-primary/15 text-pink-deep font-medium">
                      {food}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {/* Tips collapsible when score >= 5 */}
            {val >= 5 && <SymptomTipsCollapsible symptomKey={s.value} />}
          </div>
        );
      })}

      {/* Add more symptoms */}
      {inactiveSymptoms.length > 0 && (
        <div className="mt-2">
          <p className="text-[10px] text-muted-foreground mb-1.5">Ajouter un symptôme :</p>
          <div className="flex flex-wrap gap-1.5">
            {inactiveSymptoms.map((s) => (
              <button
                key={s.value}
                onClick={() => setScore(s.value, 3)}
                className="text-[10px] px-2.5 py-1 rounded-full bg-muted text-muted-foreground hover:bg-primary/10 hover:text-pink-deep transition-all"
              >
                + {s.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <button
        onClick={onSubmit}
        disabled={isSubmitting || activeSymptoms.length === 0}
        className="w-full mt-4 py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm disabled:opacity-40 flex items-center justify-center gap-2"
      >
        {isSubmitting ? (
          <span className="animate-pulse">Enregistrement...</span>
        ) : alreadySaved ? (
          <><Check className="w-4 h-4" /> Mettre à jour mon bilan</>
        ) : (
          "✅ Valider mon bilan du jour"
        )}
      </button>
    </div>
  );
}

// ── Weekly Summary Component ──
function WeeklySummary({ logs, period }: { logs: any[]; period: number }) {
  const summary = useMemo(() => {
    if (logs.length === 0) return null;

    // Aggregate all scores
    const totals: Record<string, { sum: number; count: number }> = {};
    logs.forEach((log) => {
      const scores = (log.symptom_scores && typeof log.symptom_scores === "object" && !Array.isArray(log.symptom_scores))
        ? log.symptom_scores as SymptomScores : {};
      Object.entries(scores).forEach(([k, v]) => {
        if (v > 0) {
          if (!totals[k]) totals[k] = { sum: 0, count: 0 };
          totals[k].sum += v;
          totals[k].count++;
        }
      });
    });

    const ranked = Object.entries(totals)
      .map(([key, { sum, count }]) => ({ key, avg: sum / count }))
      .sort((a, b) => b.avg - a.avg);

    // Trend: compare first half vs second half
    const mid = Math.floor(logs.length / 2);
    if (logs.length < 2) return { top3: ranked, trend: "stable" as const };

    const firstHalf = logs.slice(0, mid);
    const secondHalf = logs.slice(mid);
    const avgHalf = (half: any[]) => {
      let total = 0, count = 0;
      half.forEach((log) => {
        const scores = (log.symptom_scores && typeof log.symptom_scores === "object" && !Array.isArray(log.symptom_scores))
          ? log.symptom_scores as SymptomScores : {};
        Object.values(scores).forEach((v) => { if (v > 0) { total += v; count++; } });
      });
      return count > 0 ? total / count : 0;
    };

    const avgFirst = avgHalf(firstHalf);
    const avgSecond = avgHalf(secondHalf);
    const diff = avgSecond - avgFirst;
    const trend = diff < -0.5 ? "improving" as const : diff > 0.5 ? "worsening" as const : "stable" as const;

    return { top3: ranked, trend };
  }, [logs]);

  if (!summary || summary.top3.length === 0) return null;

  const trendConfig = {
    improving: { icon: TrendingDown, label: "En amélioration", color: "text-progress-high", emoji: "↓" },
    stable: { icon: ArrowRight, label: "Stable", color: "text-warning", emoji: "→" },
    worsening: { icon: TrendingUp, label: "En hausse", color: "text-destructive", emoji: "↑" },
  };
  const t = trendConfig[summary.trend];

  return (
    <div className="bg-card rounded-2xl p-4 card-soft mb-4 animate-fade-in">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-foreground">
          📊 Bilan {period <= 7 ? "de la semaine" : period <= 30 ? "du mois" : "de la période"}
        </h3>
        <span className={`text-xs font-bold flex items-center gap-1 ${t.color}`}>
          {t.emoji} {t.label}
        </span>
      </div>
      <div className="space-y-2">
        {summary.top3.map(({ key, avg }, i) => {
          const label = FULL_SYMPTOMS_LIST.find((s) => s.value === key)?.label || key;
          const pct = (avg / 10) * 100;
          const barColor = avg >= 7 ? "bg-destructive" : avg >= 4 ? "bg-warning" : "bg-progress-high";
          return (
            <div key={key} className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground w-4">{i + 1}.</span>
              <span className="text-xs font-medium text-foreground flex-1 truncate">{label}</span>
              <div className="w-20 h-2 rounded-full bg-muted overflow-hidden">
                <div className={`h-full rounded-full ${barColor}`} style={{ width: `${pct}%` }} />
              </div>
              <span className="text-xs font-bold text-foreground w-8 text-right">{avg.toFixed(1)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Main Page ──
export default function SymptomHistoryPage() {
  const { user } = useAuth();
  const { profile } = useProfile();
  const queryClient = useQueryClient();
  const [period, setPeriod] = useState(7);
  const [showCustomize, setShowCustomize] = useState(false);
  const { entries: journalEntries } = useJournalEntries();
  const today = new Date().toISOString().split("T")[0];

  // Merged symptoms list = default minus disabled + custom user-added
  const symptomsList = useMemo(() => {
    const disabled: string[] = (profile as any)?.disabled_symptoms || [];
    const custom: string[] = (profile as any)?.custom_symptoms || [];
    const base = FULL_SYMPTOMS_LIST.filter((s) => !disabled.includes(s.value));
    const customMapped = custom.map((name) => ({
      value: `custom_${name}`,
      label: name,
    }));
    return [...base, ...customMapped];
  }, [profile]);

  // Daily scores state
  const [dailyScores, setDailyScores] = useState<SymptomScores>({});
  const [scoresLoaded, setScoresLoaded] = useState(false);

  const startDate = useMemo(() => {
    if (period >= 9999) return "2000-01-01";
    const d = new Date();
    d.setDate(d.getDate() - (period - 1));
    return d.toISOString().split("T")[0];
  }, [period]);

  // Today's log
  const { data: todayLog } = useQuery({
    queryKey: ["symptom_log_today", user?.id, today],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from("symptom_logs")
        .select("*")
        .eq("user_id", user.id)
        .eq("logged_at", today)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Initialize scores from today's log
  if (todayLog && !scoresLoaded) {
    const existing = (todayLog.symptom_scores && typeof todayLog.symptom_scores === "object" && !Array.isArray(todayLog.symptom_scores))
      ? todayLog.symptom_scores as SymptomScores : {};
    setDailyScores(existing);
    setScoresLoaded(true);
  }

  // History logs
  const { data: symptomLogs = [] } = useQuery({
    queryKey: ["symptom_logs_history", user?.id, startDate],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("symptom_logs")
        .select("*")
        .eq("user_id", user.id)
        .gte("logged_at", startDate)
        .order("logged_at", { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not authenticated");
      const activeScores: SymptomScores = {};
      const selectedSymptoms: string[] = [];
      Object.entries(dailyScores).forEach(([k, v]) => {
        if (v > 0) { activeScores[k] = v; selectedSymptoms.push(k); }
      });

      const payload = {
        selected_symptoms: selectedSymptoms,
        symptom_scores: activeScores,
      };

      if (todayLog) {
        const { error } = await supabase.from("symptom_logs").update(payload).eq("id", todayLog.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("symptom_logs").insert({
          ...payload,
          user_id: user.id,
          logged_at: today,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["symptom_log"] });
      queryClient.invalidateQueries({ queryKey: ["symptom_logs_history"] });
      queryClient.invalidateQueries({ queryKey: ["symptom_log_today"] });
      queryClient.invalidateQueries({ queryKey: ["symptom_logs_week"] });
      toast.success("Bilan du jour enregistré !");
    },
    onError: () => toast.error("Erreur lors de l'enregistrement"),
  });

  // Chart data
  const activeSymptomKeys = useMemo(() => {
    const keys = new Set<string>();
    symptomLogs.forEach((log) => {
      const scores = (log.symptom_scores && typeof log.symptom_scores === "object" && !Array.isArray(log.symptom_scores))
        ? log.symptom_scores as SymptomScores : {};
      Object.entries(scores).forEach(([k, v]) => { if (v > 0) keys.add(k); });
    });
    return Array.from(keys);
  }, [symptomLogs]);

  const chartData = useMemo(() => {
    const effectivePeriod = period >= 9999 ? Math.max(symptomLogs.length, 30) : period;
    const days: string[] = [];
    for (let i = effectivePeriod - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      days.push(d.toISOString().split("T")[0]);
    }

    return days.map((date) => {
      const log = symptomLogs.find((l) => l.logged_at === date);
      const scores = (log?.symptom_scores && typeof log.symptom_scores === "object" && !Array.isArray(log.symptom_scores))
        ? log.symptom_scores as SymptomScores : {};

      const d = new Date(date);
      const label = `${d.getDate()}/${d.getMonth() + 1}`;

      // Only include actual data points, leave undefined for gaps
      const point: any = { date, label };
      activeSymptomKeys.forEach((key) => {
        if (scores[key] !== undefined && scores[key] > 0) {
          point[key] = scores[key];
        }
      });
      return point;
    });
  }, [symptomLogs, period, activeSymptomKeys]);

  const journalByDate = useMemo(() => {
    const map: Record<string, typeof journalEntries> = {};
    journalEntries.forEach((e) => {
      if (!map[e.entry_date]) map[e.entry_date] = [];
      map[e.entry_date].push(e);
    });
    return map;
  }, [journalEntries]);

  const journalDates = useMemo(() => Object.keys(journalByDate), [journalByDate]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload) return null;
    const dateStr = payload[0]?.payload?.date;
    const dayEntries = dateStr ? (journalByDate[dateStr] || []) : [];
    return (
      <div className="bg-card border border-border rounded-lg p-3 shadow-lg text-xs max-w-[250px]">
        <p className="font-semibold text-foreground mb-1">{label}</p>
        {payload.map((p: any) => (
          <div key={p.name} className="flex justify-between gap-3">
            <span style={{ color: p.color }}>{p.name}</span>
            <span className="font-bold text-foreground">{p.value}/10</span>
          </div>
        ))}
        {dayEntries.length > 0 && (
          <div className="mt-2 pt-2 border-t border-border space-y-1">
            {dayEntries.map((e) => {
              const cat = JOURNAL_CATEGORIES.find((c) => c.value === e.category);
              return (
                <div key={e.id} className="flex items-start gap-1.5">
                  <span
                    className="w-2 h-2 rounded-full mt-1 flex-shrink-0"
                    style={{ background: JOURNAL_CATEGORY_COLORS[e.category] || JOURNAL_CATEGORY_COLORS.autre }}
                  />
                  <span className="text-muted-foreground">
                    <span className="font-medium">{cat?.label || "📝 Autre"}</span>{" "}
                    {e.content}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="pb-24 px-4 pt-6 bg-background min-h-screen">
      <div className="flex items-start justify-between gap-2 mb-1">
        <h1 className="text-2xl font-bold text-foreground">Symptômes</h1>
        <button
          onClick={() => setShowCustomize(true)}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-muted text-pink-deep text-[11px] font-semibold hover:bg-primary/10 transition"
          aria-label="Personnaliser mes symptômes"
        >
          <Settings className="w-3.5 h-3.5" />
          Personnaliser
        </button>
      </div>
      <p className="text-muted-foreground text-sm mb-4">Suivez et évaluez vos symptômes au quotidien</p>

      <CustomizeSymptomsModal open={showCustomize} onOpenChange={setShowCustomize} />

      {/* Daily Rating — moved here as first element */}
      <DailyRating
        scores={dailyScores}
        onScoresChange={setDailyScores}
        onSubmit={() => saveMutation.mutate()}
        isSubmitting={saveMutation.isPending}
        alreadySaved={!!todayLog}
        symptomsList={symptomsList}
      />

      {/* Weekly Summary */}
      <WeeklySummary logs={symptomLogs} period={period} />

      {/* Period selector */}
      <div className="flex gap-2 mb-4">
        {PERIODS.map((p) => (
          <button
            key={p.value}
            onClick={() => setPeriod(p.value)}
            className={`flex-1 py-2 rounded-xl text-xs font-medium transition-all ${
              period === p.value ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Chart */}
      {activeSymptomKeys.length > 0 ? (
        <div className="bg-card rounded-2xl p-4 card-soft mb-4 animate-fade-in">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-4 h-4 text-pink-deep" />
            <h3 className="text-sm font-semibold text-foreground">Évolution</h3>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={chartData}>
              <XAxis
                dataKey="label"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                interval={period <= 7 ? 0 : period <= 30 ? 4 : 14}
              />
              <YAxis domain={[0, 10]} hide />
              <Tooltip content={<CustomTooltip />} />
              {journalDates.map((date) => {
                const idx = chartData.findIndex((d) => d.date === date);
                if (idx === -1) return null;
                const entries = journalByDate[date] || [];
                const topCategory = entries[0]?.category || "autre";
                const color = JOURNAL_CATEGORY_COLORS[topCategory] || JOURNAL_CATEGORY_COLORS.autre;
                return (
                  <ReferenceLine
                    key={date}
                    x={chartData[idx].label}
                    stroke={color}
                    strokeDasharray="3 3"
                    strokeOpacity={0.6}
                    label={{
                      value: "●",
                      position: "insideBottomLeft",
                      fill: color,
                      fontSize: 10,
                      offset: -2,
                    }}
                  />
                );
              })}
              {activeSymptomKeys.slice(0, 6).map((key, i) => {
                const label = FULL_SYMPTOMS_LIST.find((x) => x.value === key)?.label || key;
                return (
                  <Line
                    key={key}
                    type="monotone"
                    dataKey={key}
                    name={label}
                    stroke={CHART_COLORS[i % CHART_COLORS.length]}
                    strokeWidth={2}
                    dot={{ r: 2 }}
                    connectNulls={false}
                  />
                );
              })}
            </LineChart>
          </ResponsiveContainer>

          {/* Legend */}
          <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2">
            {activeSymptomKeys.slice(0, 6).map((key, i) => {
              const label = FULL_SYMPTOMS_LIST.find((x) => x.value === key)?.label || key;
              return (
                <span key={key} className="text-[10px] flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
                  {label}
                </span>
              );
            })}
          </div>
          {journalDates.length > 0 && (
            <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1.5">
              <span className="text-[10px] text-muted-foreground">Notes :</span>
              {Object.entries(JOURNAL_CATEGORY_COLORS).map(([cat, color]) => {
                const catLabel = JOURNAL_CATEGORIES.find((c) => c.value === cat)?.label || cat;
                return (
                  <span key={cat} className="text-[10px] flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full" style={{ background: color }} />
                    {catLabel}
                  </span>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        <div className="bg-card rounded-2xl p-8 card-soft mb-4 text-center animate-fade-in">
          <div className="text-5xl mb-3">📊</div>
          <p className="text-sm text-muted-foreground">
            Aucune donnée pour cette période.
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Remplissez le bilan du jour ci-dessus pour voir les tendances.
          </p>
        </div>
      )}

      {/* Per-symptom detail cards */}
      {activeSymptomKeys.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-foreground">Détail par symptôme</h3>
          {activeSymptomKeys.slice(0, 6).map((key, i) => {
            const label = FULL_SYMPTOMS_LIST.find((x) => x.value === key)?.label || key;
            const values = chartData.map((d) => (d as any)[key] as number | undefined).filter((v): v is number => v !== undefined && v > 0);
            const avg = values.length > 0 ? (values.reduce((a, b) => a + b, 0) / values.length).toFixed(1) : "–";
            const max = values.length > 0 ? Math.max(...values) : 0;
            const latest = values.length > 0 ? values[values.length - 1] : 0;

            return (
              <div key={key} className="bg-card rounded-xl p-3 card-soft">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
                    <span className="text-xs font-semibold text-foreground">{label}</span>
                  </div>
                  <span className={`text-xs font-bold ${latest >= 7 ? "text-destructive" : latest >= 4 ? "text-warning" : "text-progress-high"}`}>
                    {latest}/10
                  </span>
                </div>
                <div className="flex gap-4 text-[10px] text-muted-foreground">
                  <span>Moyenne : <strong className="text-foreground">{avg}</strong></span>
                  <span>Max : <strong className="text-foreground">{max}</strong></span>
                  <span>Entrées : <strong className="text-foreground">{values.length}</strong></span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
