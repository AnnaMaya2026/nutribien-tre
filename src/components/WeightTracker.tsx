import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import { ChevronDown, ChevronUp, Scale } from "lucide-react";
import { toast } from "sonner";

const PERIODS = [
  { value: 7, label: "7j" },
  { value: 30, label: "30j" },
  { value: 90, label: "3 mois" },
  { value: 180, label: "6 mois" },
];

export default function WeightTracker() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [period, setPeriod] = useState(30);
  const [weightInput, setWeightInput] = useState("");
  const [goalInput, setGoalInput] = useState("");
  const [editingGoal, setEditingGoal] = useState(false);

  const startDate = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - (period - 1));
    return d.toISOString().split("T")[0];
  }, [period]);

  const { data: logs = [] } = useQuery({
    queryKey: ["weight_logs", user?.id, startDate],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("weight_logs")
        .select("*")
        .eq("user_id", user.id)
        .gte("logged_at", startDate)
        .order("logged_at", { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  const { data: lastLog } = useQuery({
    queryKey: ["weight_last", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from("weight_logs")
        .select("*")
        .eq("user_id", user.id)
        .order("logged_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const upsertMutation = useMutation({
    mutationFn: async ({ weight, goal }: { weight: number; goal?: number | null }) => {
      if (!user) throw new Error("Non connecté");
      const today = new Date().toISOString().split("T")[0];

      // Check if entry exists for today
      const { data: existing } = await supabase
        .from("weight_logs")
        .select("id")
        .eq("user_id", user.id)
        .eq("logged_at", today)
        .maybeSingle();

      if (existing) {
        const updateData: any = { weight_kg: weight };
        if (goal !== undefined) updateData.goal_weight = goal;
        const { error } = await supabase
          .from("weight_logs")
          .update(updateData)
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("weight_logs")
          .insert({
            user_id: user.id,
            weight_kg: weight,
            logged_at: today,
            goal_weight: goal ?? null,
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["weight_logs"] });
      queryClient.invalidateQueries({ queryKey: ["weight_last"] });
      toast.success("Poids enregistré ✓");
      setWeightInput("");
    },
  });

  const saveGoalMutation = useMutation({
    mutationFn: async (goal: number) => {
      if (!user) throw new Error("Non connecté");
      // Update goal on all user's weight logs (store on latest)
      const { data: latest } = await supabase
        .from("weight_logs")
        .select("id")
        .eq("user_id", user.id)
        .order("logged_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (latest) {
        const { error } = await supabase
          .from("weight_logs")
          .update({ goal_weight: goal })
          .eq("id", latest.id);
        if (error) throw error;
      } else {
        // Create an entry for today with just the goal
        const today = new Date().toISOString().split("T")[0];
        const { error } = await supabase
          .from("weight_logs")
          .insert({ user_id: user.id, weight_kg: goal, logged_at: today, goal_weight: goal });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["weight_logs"] });
      queryClient.invalidateQueries({ queryKey: ["weight_last"] });
      toast.success("Objectif enregistré ✓");
      setEditingGoal(false);
    },
  });

  const handleSave = () => {
    const w = parseFloat(weightInput);
    if (isNaN(w) || w < 20 || w > 300) {
      toast.error("Entrez un poids valide (20-300 kg)");
      return;
    }
    upsertMutation.mutate({ weight: w });
  };

  const handleGoalSave = () => {
    const g = parseFloat(goalInput);
    if (isNaN(g) || g < 20 || g > 300) {
      toast.error("Entrez un objectif valide (20-300 kg)");
      return;
    }
    saveGoalMutation.mutate(g);
  };

  const goalWeight = useMemo(() => {
    for (let i = logs.length - 1; i >= 0; i--) {
      if (logs[i].goal_weight) return Number(logs[i].goal_weight);
    }
    return lastLog?.goal_weight ? Number(lastLog.goal_weight) : null;
  }, [logs, lastLog]);

  const chartData = useMemo(() => {
    return logs
      .filter((l) => l.weight_kg)
      .map((l) => {
        const d = new Date(l.logged_at);
        return {
          date: l.logged_at,
          label: `${d.getDate()}/${d.getMonth() + 1}`,
          poids: Number(l.weight_kg),
        };
      });
  }, [logs]);

  const stats = useMemo(() => {
    if (!chartData.length) return null;
    const weights = chartData.map((d) => d.poids);
    return {
      min: Math.min(...weights),
      max: Math.max(...weights),
      avg: Math.round((weights.reduce((a, b) => a + b, 0) / weights.length) * 10) / 10,
    };
  }, [chartData]);

  const formatLastDate = (dateStr: string) => {
    const months = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
    const d = new Date(dateStr);
    return `${d.getDate()} ${months[d.getMonth()]}`;
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload) return null;
    return (
      <div className="bg-card border border-border rounded-lg p-3 shadow-lg text-xs">
        <p className="font-semibold text-foreground mb-1">{label}</p>
        {payload.map((p: any) => (
          <div key={p.name} className="flex justify-between gap-3">
            <span style={{ color: p.color }}>{p.name}</span>
            <span className="font-bold text-foreground">{p.value} kg</span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="bg-card rounded-2xl card-soft mb-4 animate-fade-in overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-5"
      >
        <div className="flex items-center gap-2">
          <Scale className="w-4 h-4 text-pink-deep" />
          <h3 className="text-sm font-semibold text-foreground">⚖️ Suivi de poids</h3>
        </div>
        {open ? (
          <ChevronUp className="w-4 h-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        )}
      </button>

      {open && (
        <div className="px-5 pb-5 space-y-4">
          {/* Weight input */}
          <div className="flex gap-2 items-end">
            <div className="flex-1">
              <label className="text-xs text-muted-foreground mb-1 block">
                {new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
              </label>
              <input
                type="number"
                step="0.1"
                placeholder="Ex: 62.5"
                value={weightInput}
                onChange={(e) => setWeightInput(e.target.value)}
                className="w-full h-10 rounded-xl border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <span className="text-sm text-muted-foreground mb-2">kg</span>
            <button
              onClick={handleSave}
              disabled={upsertMutation.isPending}
              className="h-10 px-4 bg-primary text-primary-foreground rounded-xl text-sm font-medium disabled:opacity-50"
            >
              Enregistrer
            </button>
          </div>

          {/* Last recorded */}
          {lastLog && (
            <p className="text-xs text-muted-foreground">
              Dernier poids enregistré : <span className="font-semibold text-foreground">{Number(lastLog.weight_kg)} kg</span> — {formatLastDate(lastLog.logged_at)}
            </p>
          )}

          {/* Goal weight */}
          <div className="flex items-center gap-2">
            {!editingGoal ? (
              <>
                {goalWeight ? (
                  <p className="text-xs text-muted-foreground">
                    🎯 Objectif : <span className="font-semibold text-foreground">{goalWeight} kg</span>
                  </p>
                ) : null}
                <button
                  onClick={() => {
                    setEditingGoal(true);
                    setGoalInput(goalWeight ? String(goalWeight) : "");
                  }}
                  className="text-[10px] text-pink-deep underline"
                >
                  {goalWeight ? "Modifier" : "Définir un objectif"}
                </button>
              </>
            ) : (
              <div className="flex gap-2 items-center">
                <input
                  type="number"
                  step="0.1"
                  placeholder="Objectif en kg"
                  value={goalInput}
                  onChange={(e) => setGoalInput(e.target.value)}
                  className="h-8 w-28 rounded-lg border border-input bg-background px-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <button onClick={handleGoalSave} className="text-xs text-pink-deep font-medium">OK</button>
                <button onClick={() => setEditingGoal(false)} className="text-xs text-muted-foreground">Annuler</button>
              </div>
            )}
          </div>

          {/* Period selector */}
          <div className="flex gap-2">
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

          {/* Chart */}
          {chartData.length > 1 ? (
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
                  domain={["dataMin - 1", "dataMax + 1"]}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                  tickFormatter={(v) => `${v}kg`}
                  width={40}
                />
                <Tooltip content={<CustomTooltip />} />
                {goalWeight && (
                  <ReferenceLine
                    y={goalWeight}
                    stroke="hsl(var(--primary))"
                    strokeDasharray="4 4"
                    strokeOpacity={0.6}
                    label={{ value: `Objectif: ${goalWeight}kg`, position: "insideTopRight", fontSize: 10, fill: "hsl(var(--primary))" }}
                  />
                )}
                <Line
                  type="monotone"
                  dataKey="poids"
                  name="Poids"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  dot={{ r: 3, fill: "hsl(var(--primary))" }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-xs text-muted-foreground text-center py-4">
              {chartData.length === 1 ? "Ajoutez plus d'entrées pour voir le graphique" : "Aucune donnée pour cette période"}
            </p>
          )}

          {/* Stats */}
          {stats && (
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: "Min", value: `${stats.min} kg` },
                { label: "Moy", value: `${stats.avg} kg` },
                { label: "Max", value: `${stats.max} kg` },
              ].map((s) => (
                <div key={s.label} className="bg-muted/30 rounded-xl p-2 text-center">
                  <p className="text-[10px] text-muted-foreground">{s.label}</p>
                  <p className="text-xs font-semibold text-foreground">{s.value}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
