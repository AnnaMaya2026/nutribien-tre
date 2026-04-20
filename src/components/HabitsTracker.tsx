import { useState, useMemo, useEffect } from "react";
import { Plus, Trash2, X, Minus, AlertTriangle, Check, XCircle, Droplet } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useHabits, UserHabit } from "@/hooks/useHabits";
import { LineChart, Line, ResponsiveContainer, YAxis } from "recharts";
import { toast } from "sonner";

function statusColor(count: number, goal: number) {
  if (goal === 0) {
    return count === 0 ? "progress-high" : "destructive";
  }
  if (count < goal) return "progress-high"; // green
  if (count === goal) return "warning"; // orange
  return "destructive"; // red
}

// Binary (yes/no) daily habit card — used when goal === 0 (e.g. "Écrans avant lit")
function BinaryHabitCard({ habit }: { habit: UserHabit }) {
  const { logs, today, setCount, deleteHabit } = useHabits();
  const todayLog = logs.find(
    (l) => l.habit_key === habit.habit_key && l.logged_at === today
  );
  // count: 0 = pas de réponse, 1 = respecté (évité), 2 = non respecté (regardé)
  const state = todayLog?.count ?? 0;

  const setState = (next: 1 | 2) => {
    setCount.mutate({ habit, count: next });
    if (next === 2 && habit.symptom_warning) {
      toast.warning(`⚠️ ${habit.habit_name} : ${habit.symptom_warning}`);
    }
  };

  // 7-day chart: 1 = vert, 2 = rouge, 0 = gris (rien)
  const chartData = useMemo(() => {
    const days: { date: string; value: number; respected: boolean | null }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split("T")[0];
      const log = logs.find(
        (l) => l.habit_key === habit.habit_key && l.logged_at === dateStr
      );
      const c = log?.count ?? 0;
      days.push({
        date: dateStr,
        value: c === 0 ? 0 : 1,
        respected: c === 1 ? true : c === 2 ? false : null,
      });
    }
    return days;
  }, [logs, habit.habit_key]);

  return (
    <div className="bg-card rounded-2xl p-4 card-soft">
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className="text-2xl">{habit.habit_emoji}</span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground truncate">
              {habit.habit_name}
            </p>
            <p className="text-[10px] text-muted-foreground">
              Objectif : éviter après 21h
            </p>
          </div>
        </div>
        <button
          onClick={() => {
            if (confirm(`Supprimer "${habit.habit_name}" ?`)) {
              deleteHabit.mutate(habit.id);
            }
          }}
          className="text-muted-foreground hover:text-destructive flex-shrink-0"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Binary buttons */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        <button
          onClick={() => setState(1)}
          className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-[11px] font-semibold transition-all ${
            state === 1
              ? "bg-progress-high text-white shadow-sm"
              : "bg-muted text-foreground hover:bg-progress-high/10"
          }`}
        >
          <Check className="w-3.5 h-3.5" />
          J'ai évité ✓
        </button>
        <button
          onClick={() => setState(2)}
          className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-[11px] font-semibold transition-all ${
            state === 2
              ? "bg-destructive text-white shadow-sm"
              : "bg-muted text-foreground hover:bg-destructive/10"
          }`}
        >
          <XCircle className="w-3.5 h-3.5" />
          J'ai regardé
        </button>
      </div>

      {state === 2 && (
        <div className="flex items-start gap-1.5 mb-2 text-[10px] text-destructive">
          <AlertTriangle className="w-3 h-3 flex-shrink-0 mt-0.5" />
          <span>Objectif non respecté aujourd'hui</span>
        </div>
      )}

      {/* 7-day binary chart: colored dots */}
      <div className="flex items-end justify-between gap-1 h-10 px-1">
        {chartData.map((d) => {
          const bg =
            d.respected === true
              ? "bg-progress-high"
              : d.respected === false
              ? "bg-destructive"
              : "bg-muted";
          return (
            <div key={d.date} className="flex-1 flex justify-center items-end h-full">
              <div className={`w-full max-w-[16px] h-6 rounded ${bg}`} />
            </div>
          );
        })}
      </div>
      <div className="flex justify-between text-[9px] text-muted-foreground mt-0.5 px-1">
        <span>il y a 7j</span>
        <span>aujourd'hui</span>
      </div>
    </div>
  );
}

// Hydration card — "good" habit: count UP toward goal (8 glasses)
function HydrationCard({ habit }: { habit: UserHabit }) {
  const { logs, today, setCount, deleteHabit } = useHabits();
  const todayLog = logs.find(
    (l) => l.habit_key === habit.habit_key && l.logged_at === today
  );
  const count = todayLog?.count ?? 0;
  const goal = habit.goal || 8;

  // Inverted color logic vs other habits
  const color =
    count >= goal ? "progress-high" : count >= 4 ? "warning" : "destructive";
  const colorClass =
    color === "destructive"
      ? "text-destructive"
      : color === "warning"
      ? "text-warning"
      : "text-progress-high";

  // Hydration reminder after 8pm if < 6 glasses
  useEffect(() => {
    const now = new Date();
    if (now.getHours() >= 20 && count < 6) {
      const key = `hydration_alert_${today}`;
      if (!sessionStorage.getItem(key)) {
        sessionStorage.setItem(key, "1");
        toast.warning(
          "💧 Pensez à vous hydrater ! Une bonne hydratation aide à réduire les bouffées de chaleur et la fatigue.",
          { duration: 6000 }
        );
      }
    }
  }, [count, today]);

  const handleInc = () => {
    const next = count + 1;
    setCount.mutate({ habit, count: next });
    if (next === goal) {
      toast.success("🎉 Objectif hydratation atteint ! Bravo 💧");
    }
  };

  return (
    <div className="bg-card rounded-2xl p-4 card-soft">
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className="text-2xl">💧</span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground truncate">
              {habit.habit_name}
            </p>
            <p className="text-[10px] text-muted-foreground">
              Objectif : {goal} verres/jour
            </p>
          </div>
        </div>
        <button
          onClick={() => {
            if (confirm(`Supprimer "${habit.habit_name}" ?`)) {
              deleteHabit.mutate(habit.id);
            }
          }}
          className="text-muted-foreground hover:text-destructive flex-shrink-0"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Counter */}
      <div className="flex items-center justify-between gap-3 mb-3">
        <button
          onClick={() => setCount.mutate({ habit, count: count - 1 })}
          disabled={count <= 0}
          className="w-9 h-9 rounded-full bg-muted text-foreground flex items-center justify-center disabled:opacity-30"
        >
          <Minus className="w-4 h-4" />
        </button>
        <div className="flex-1 text-center">
          <p className={`text-2xl font-bold ${colorClass}`}>
            {count} / {goal}
          </p>
          <p className="text-[10px] text-muted-foreground">
            verres aujourd'hui
            {count >= goal && " ✅"}
          </p>
        </div>
        <button
          onClick={handleInc}
          className="w-9 h-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {/* 8 water drops */}
      <div className="flex items-center justify-between gap-1 mb-1">
        {Array.from({ length: goal }).map((_, i) => {
          const filled = i < count;
          return (
            <Droplet
              key={i}
              className={`w-5 h-5 transition-all ${
                filled
                  ? "text-blue-500 fill-blue-500"
                  : "text-muted-foreground/30"
              }`}
            />
          );
        })}
      </div>
      {count > goal && (
        <p className="text-[10px] text-progress-high mt-2">
          +{count - goal} verre(s) au-delà de l'objectif 💪
        </p>
      )}
    </div>
  );
}


  const { logs, today, setCount, deleteHabit } = useHabits();
  const todayLog = logs.find(
    (l) => l.habit_key === habit.habit_key && l.logged_at === today
  );
  const count = todayLog?.count ?? 0;
  const color = statusColor(count, habit.goal);
  const exceeded = habit.goal === 0 ? count > 0 : count > habit.goal;
  const reachedLimit = habit.goal > 0 && count === habit.goal;

  // Build 7-day chart data
  const chartData = useMemo(() => {
    const days: { date: string; count: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split("T")[0];
      const log = logs.find(
        (l) => l.habit_key === habit.habit_key && l.logged_at === dateStr
      );
      days.push({ date: dateStr, count: log?.count ?? 0 });
    }
    return days;
  }, [logs, habit.habit_key]);

  const handleInc = () => {
    const next = count + 1;
    setCount.mutate({ habit, count: next });
    if (habit.goal > 0 && next > habit.goal && habit.symptom_warning) {
      toast.warning(
        `⚠️ Tu as dépassé ton objectif ${habit.habit_name.toLowerCase()} aujourd'hui — ${habit.symptom_warning}`
      );
    } else if (habit.goal === 0 && next === 1 && habit.symptom_warning) {
      toast.warning(
        `⚠️ ${habit.habit_name} : ${habit.symptom_warning}`
      );
    }
  };

  const colorClass =
    color === "destructive"
      ? "text-destructive"
      : color === "warning"
      ? "text-warning"
      : "text-progress-high";
  const bgClass =
    color === "destructive"
      ? "bg-destructive"
      : color === "warning"
      ? "bg-warning"
      : "bg-progress-high";
  const strokeColor =
    color === "destructive"
      ? "hsl(var(--destructive))"
      : color === "warning"
      ? "hsl(var(--warning))"
      : "hsl(var(--progress-high))";

  return (
    <div className="bg-card rounded-2xl p-4 card-soft">
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className="text-2xl">{habit.habit_emoji}</span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground truncate">
              {habit.habit_name}
            </p>
            <p className="text-[10px] text-muted-foreground">
              Objectif : max {habit.goal} {habit.unit}/jour
            </p>
          </div>
        </div>
        <button
          onClick={() => {
            if (confirm(`Supprimer "${habit.habit_name}" ?`)) {
              deleteHabit.mutate(habit.id);
            }
          }}
          className="text-muted-foreground hover:text-destructive flex-shrink-0"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Counter */}
      <div className="flex items-center justify-between gap-3 mb-3">
        <button
          onClick={() => setCount.mutate({ habit, count: count - 1 })}
          disabled={count <= 0}
          className="w-9 h-9 rounded-full bg-muted text-foreground flex items-center justify-center disabled:opacity-30"
        >
          <Minus className="w-4 h-4" />
        </button>
        <div className="flex-1 text-center">
          <p className={`text-3xl font-bold ${colorClass}`}>{count}</p>
          <p className="text-[10px] text-muted-foreground">{habit.unit}</p>
        </div>
        <button
          onClick={handleInc}
          className="w-9 h-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {/* Progress bar */}
      {habit.goal > 0 && (
        <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden mb-2">
          <div
            className={`h-full ${bgClass} transition-all`}
            style={{ width: `${Math.min(100, (count / habit.goal) * 100)}%` }}
          />
        </div>
      )}

      {exceeded && (
        <div className="flex items-start gap-1.5 mb-2 text-[10px] text-destructive">
          <AlertTriangle className="w-3 h-3 flex-shrink-0 mt-0.5" />
          <span>Objectif dépassé</span>
        </div>
      )}
      {reachedLimit && !exceeded && (
        <p className="text-[10px] text-warning mb-2">Limite atteinte</p>
      )}

      {/* 7-day mini chart */}
      <div className="h-10 -mx-1">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <YAxis hide domain={[0, Math.max(habit.goal + 1, ...chartData.map((d) => d.count), 1)]} />
            <Line
              type="monotone"
              dataKey="count"
              stroke={strokeColor}
              strokeWidth={2}
              dot={{ r: 2, fill: strokeColor }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="flex justify-between text-[9px] text-muted-foreground mt-0.5 px-1">
        <span>il y a 7j</span>
        <span>aujourd'hui</span>
      </div>
    </div>
  );
}

function AddHabitModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { addHabit } = useHabits();
  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState("");
  const [goal, setGoal] = useState("1");
  const [unit, setUnit] = useState("fois");

  const submit = async () => {
    if (!name.trim()) return;
    await addHabit.mutateAsync({
      habit_name: name.trim(),
      habit_emoji: emoji.trim() || "•",
      goal: Number(goal) || 0,
      unit: unit.trim() || "fois",
    });
    toast.success("Habitude ajoutée ✓");
    setName("");
    setEmoji("");
    setGoal("1");
    setUnit("fois");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-base">Nouvelle habitude</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-muted-foreground block mb-1">Nom</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Soda" />
          </div>
          <div className="flex gap-2">
            <div className="w-20">
              <label className="text-xs text-muted-foreground block mb-1">Emoji</label>
              <Input value={emoji} onChange={(e) => setEmoji(e.target.value)} placeholder="🥤" />
            </div>
            <div className="w-24">
              <label className="text-xs text-muted-foreground block mb-1">Limite/jour</label>
              <Input
                type="number"
                min="0"
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
              />
            </div>
            <div className="flex-1">
              <label className="text-xs text-muted-foreground block mb-1">Unité</label>
              <Input value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="fois" />
            </div>
          </div>
          <button
            onClick={submit}
            disabled={!name.trim() || addHabit.isPending}
            className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm disabled:opacity-50"
          >
            Ajouter
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function HabitsTracker() {
  const { habits, isLoading } = useHabits();
  const [showAdd, setShowAdd] = useState(false);

  return (
    <div>
      <div className="mb-4">
        <h2 className="text-lg font-bold text-foreground">🚫 Habitudes à surveiller</h2>
        <p className="text-xs text-muted-foreground">
          Suivez vos habitudes qui peuvent aggraver vos symptômes
        </p>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground text-center py-8">Chargement...</p>
      ) : (
        <>
          <div className="space-y-3">
            {habits.map((h) =>
              h.habit_key === "hydratation" ? (
                <HydrationCard key={h.id} habit={h} />
              ) : h.habit_key === "ecrans_lit" || h.goal === 0 ? (
                <BinaryHabitCard key={h.id} habit={h} />
              ) : (
                <HabitCard key={h.id} habit={h} />
              )
            )}
          </div>

          <button
            onClick={() => setShowAdd(true)}
            className="w-full mt-4 py-3 rounded-xl border-2 border-dashed border-pink-deep/40 text-pink-deep font-semibold text-sm flex items-center justify-center gap-2 hover:bg-primary/5"
          >
            <Plus className="w-4 h-4" /> Ajouter une habitude
          </button>
        </>
      )}

      <AddHabitModal open={showAdd} onOpenChange={setShowAdd} />
    </div>
  );
}
