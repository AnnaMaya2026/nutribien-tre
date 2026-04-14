import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { DAILY_TARGETS } from "@/lib/mockData";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import { TrendingUp } from "lucide-react";

const PERIODS = [
  { value: 7, label: "7 jours" },
  { value: 30, label: "30 jours" },
  { value: 90, label: "3 mois" },
];

const NUTRIENTS = [
  { key: "calcium", label: "Calcium", color: "hsl(330, 60%, 65%)", target: DAILY_TARGETS.calcium },
  { key: "vitamin_d", label: "Vitamine D", color: "hsl(45, 80%, 50%)", target: DAILY_TARGETS.vitamin_d },
  { key: "magnesium", label: "Magnésium", color: "hsl(145, 50%, 45%)", target: DAILY_TARGETS.magnesium },
  { key: "iron", label: "Fer", color: "hsl(0, 65%, 55%)", target: DAILY_TARGETS.iron },
  { key: "omega3", label: "Oméga-3", color: "hsl(200, 60%, 55%)", target: DAILY_TARGETS.omega3 },
];

export default function MicronutrientTrendChart() {
  const { user } = useAuth();
  const [period, setPeriod] = useState(7);
  const [hidden, setHidden] = useState<Set<string>>(new Set());

  const startDate = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - (period - 1));
    return d.toISOString().split("T")[0];
  }, [period]);

  const { data: logs = [] } = useQuery({
    queryKey: ["food_logs_micro_trend", user?.id, startDate],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("food_logs")
        .select("logged_at, calcium, vitamin_d, magnesium, iron, omega3")
        .eq("user_id", user.id)
        .gte("logged_at", startDate)
        .order("logged_at", { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  const chartData = useMemo(() => {
    // Aggregate per day
    const byDay: Record<string, Record<string, number>> = {};
    logs.forEach((log) => {
      const day = log.logged_at;
      if (!byDay[day]) byDay[day] = { calcium: 0, vitamin_d: 0, magnesium: 0, iron: 0, omega3: 0 };
      NUTRIENTS.forEach((n) => {
        byDay[day][n.key] += (log as any)[n.key] || 0;
      });
    });

    // Build timeline
    const days: string[] = [];
    for (let i = period - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      days.push(d.toISOString().split("T")[0]);
    }

    return days.map((date) => {
      const d = new Date(date);
      const label = `${d.getDate()}/${d.getMonth() + 1}`;
      const totals = byDay[date];
      const point: any = { date, label };
      if (totals) {
        NUTRIENTS.forEach((n) => {
          point[n.key] = Math.round((totals[n.key] / n.target) * 100);
        });
      }
      return point;
    });
  }, [logs, period]);

  const toggleNutrient = (key: string) => {
    setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload) return null;
    return (
      <div className="bg-card border border-border rounded-lg p-3 shadow-lg text-xs max-w-[220px]">
        <p className="font-semibold text-foreground mb-1">{label}</p>
        {payload.map((p: any) => (
          <div key={p.name} className="flex justify-between gap-3">
            <span style={{ color: p.color }}>{p.name}</span>
            <span className="font-bold text-foreground">{p.value}%</span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="bg-card rounded-2xl p-5 card-soft mb-4 animate-fade-in">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">Évolution de mes micronutriments</h3>
        </div>
      </div>

      {/* Period selector */}
      <div className="flex gap-2 mb-4">
        {PERIODS.map((p) => (
          <button
            key={p.value}
            onClick={() => setPeriod(p.value)}
            className={`flex-1 py-1.5 rounded-xl text-[10px] font-medium transition-all ${
              period === p.value ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      <ResponsiveContainer width="100%" height={180}>
        <LineChart data={chartData}>
          <XAxis
            dataKey="label"
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
            interval={period <= 7 ? 0 : period <= 30 ? 4 : 14}
          />
          <YAxis
            domain={[0, 150]}
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
            tickFormatter={(v) => `${v}%`}
            width={35}
          />
          <Tooltip content={<CustomTooltip />} />
          <ReferenceLine y={100} stroke="hsl(145, 50%, 45%)" strokeDasharray="4 4" strokeOpacity={0.6} />
          {NUTRIENTS.filter((n) => !hidden.has(n.key)).map((n) => (
            <Line
              key={n.key}
              type="monotone"
              dataKey={n.key}
              name={n.label}
              stroke={n.color}
              strokeWidth={2}
              dot={{ r: 2 }}
              connectNulls={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>

      {/* Clickable legend */}
      <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2">
        {NUTRIENTS.map((n) => {
          const isHidden = hidden.has(n.key);
          return (
            <button
              key={n.key}
              onClick={() => toggleNutrient(n.key)}
              className={`text-[10px] flex items-center gap-1 transition-opacity ${isHidden ? "opacity-30" : "opacity-100"}`}
            >
              <span className="w-2 h-2 rounded-full" style={{ background: n.color }} />
              {n.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
