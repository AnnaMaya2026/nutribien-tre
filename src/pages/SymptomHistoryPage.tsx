import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useJournalEntries, JOURNAL_CATEGORIES } from "@/hooks/useJournalEntries";
import { SymptomScores } from "@/hooks/useSymptomLogs";
import { FULL_SYMPTOMS_LIST } from "@/lib/symptoms";
import { SYMPTOM_FOOD_MAP } from "@/lib/symptomFoods";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import { AlertTriangle, TrendingUp } from "lucide-react";

const PERIODS = [
  { value: 7, label: "7 jours" },
  { value: 30, label: "30 jours" },
  { value: 90, label: "3 mois" },
  { value: 180, label: "6 mois" },
];

const CHART_COLORS = [
  "hsl(330, 60%, 65%)", "hsl(200, 60%, 55%)", "hsl(145, 50%, 45%)",
  "hsl(35, 80%, 55%)", "hsl(270, 50%, 60%)", "hsl(10, 70%, 55%)",
];

export default function SymptomHistoryPage() {
  const { user } = useAuth();
  const [period, setPeriod] = useState(7);
  const { entries: journalEntries } = useJournalEntries();

  const startDate = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - (period - 1));
    return d.toISOString().split("T")[0];
  }, [period]);

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

  // Collect all active symptom keys across the period
  const activeSymptomKeys = useMemo(() => {
    const keys = new Set<string>();
    symptomLogs.forEach((log) => {
      const scores = (log.symptom_scores && typeof log.symptom_scores === "object" && !Array.isArray(log.symptom_scores))
        ? log.symptom_scores as SymptomScores : {};
      Object.entries(scores).forEach(([k, v]) => { if (v > 0) keys.add(k); });
    });
    return Array.from(keys);
  }, [symptomLogs]);

  // Build chart data
  const chartData = useMemo(() => {
    const days: string[] = [];
    for (let i = period - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      days.push(d.toISOString().split("T")[0]);
    }

    // Journal entries by date for markers
    const journalByDate = new Map<string, string[]>();
    journalEntries.forEach((e) => {
      const notes = journalByDate.get(e.entry_date) || [];
      const catLabel = JOURNAL_CATEGORIES.find((c) => c.value === e.category)?.label || e.category;
      notes.push(`${catLabel}: ${e.content}`);
      journalByDate.set(e.entry_date, notes);
    });

    return days.map((date) => {
      const log = symptomLogs.find((l) => l.logged_at === date);
      const scores = (log?.symptom_scores && typeof log.symptom_scores === "object" && !Array.isArray(log.symptom_scores))
        ? log.symptom_scores as SymptomScores : {};

      const d = new Date(date);
      const label = period <= 30
        ? `${d.getDate()}/${d.getMonth() + 1}`
        : `${d.getDate()}/${d.getMonth() + 1}`;

      const journalNotes = journalByDate.get(date);

      return { date, label, ...scores, _hasJournal: !!journalNotes, _journalNotes: journalNotes };
    });
  }, [symptomLogs, journalEntries, period]);

  // Latest scores for high-symptom alerts
  const latestScores = useMemo(() => {
    if (symptomLogs.length === 0) return {} as SymptomScores;
    const last = symptomLogs[symptomLogs.length - 1];
    const scores = (last?.symptom_scores && typeof last.symptom_scores === "object" && !Array.isArray(last.symptom_scores))
      ? last.symptom_scores as SymptomScores : {};
    return scores;
  }, [symptomLogs]);

  const highSymptoms = useMemo(() => {
    return Object.entries(latestScores)
      .filter(([, score]) => score >= 7)
      .map(([key]) => key)
      .filter((key) => SYMPTOM_FOOD_MAP[key]);
  }, [latestScores]);

  // Journal entry dates for reference lines
  const journalDates = useMemo(() => {
    const dates = new Set<string>();
    journalEntries.forEach((e) => dates.add(e.entry_date));
    return Array.from(dates);
  }, [journalEntries]);

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload) return null;
    const dataPoint = chartData.find((d) => d.label === label);
    return (
      <div className="bg-card border border-border rounded-lg p-3 shadow-lg text-xs max-w-[220px]">
        <p className="font-semibold text-foreground mb-1">{label}</p>
        {payload.map((p: any) => (
          <div key={p.name} className="flex justify-between gap-3">
            <span style={{ color: p.color }}>{p.name}</span>
            <span className="font-bold text-foreground">{p.value}/10</span>
          </div>
        ))}
        {dataPoint?._hasJournal && dataPoint._journalNotes && (
          <div className="mt-2 pt-2 border-t border-border">
            <p className="font-semibold text-primary mb-0.5">📝 Journal :</p>
            {dataPoint._journalNotes.map((n: string, i: number) => (
              <p key={i} className="text-muted-foreground text-[10px]">{n}</p>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="pb-24 px-4 pt-6 bg-background min-h-screen">
      <h1 className="text-2xl font-bold text-foreground mb-1">Historique symptômes</h1>
      <p className="text-muted-foreground text-sm mb-4">Suivez l'évolution de vos symptômes</p>

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

      {/* High symptom alerts */}
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
                      Votre score de {rec.label} est élevé ({latestScores[sKey]}/10)
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      Voici les aliments qui peuvent aider :
                    </p>
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

      {/* Chart */}
      {activeSymptomKeys.length > 0 ? (
        <div className="bg-card rounded-2xl p-4 card-soft mb-4 animate-fade-in">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-4 h-4 text-primary" />
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
              {/* Journal entry reference lines */}
              {journalDates.map((date) => {
                const idx = chartData.findIndex((d) => d.date === date);
                if (idx === -1) return null;
                return (
                  <ReferenceLine
                    key={date}
                    x={chartData[idx].label}
                    stroke="hsl(var(--primary))"
                    strokeDasharray="3 3"
                    strokeOpacity={0.5}
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
                    connectNulls
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
            <span className="text-[10px] flex items-center gap-1 text-muted-foreground">
              <span className="w-3 border-t border-dashed border-primary" /> Journal
            </span>
          </div>
        </div>
      ) : (
        <div className="bg-card rounded-2xl p-8 card-soft mb-4 text-center animate-fade-in">
          <div className="text-5xl mb-3">📊</div>
          <p className="text-sm text-muted-foreground">
            Aucune donnée de symptômes pour cette période.
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Remplissez le check-in symptômes sur le dashboard pour voir les tendances.
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
