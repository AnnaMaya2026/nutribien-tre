import { useState, useMemo, useEffect } from "react";
import { Plus, X, Trash2, Check, Flame, Star, Bell } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import {
  useRoutines,
  ROUTINE_CATEGORIES,
  ROUTINE_FREQUENCIES,
  calculateStreak,
  weekCompletionCount,
} from "@/hooks/useRoutines";
import {
  requestNotificationPermission,
  scheduleAllReminders,
} from "@/lib/routineReminders";

export function RoutinesTracker() {
  const { routines, logs, addRoutine, deleteRoutine, toggleToday, isLoading } = useRoutines();
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("complement");
  const [frequency, setFrequency] = useState("quotidien");
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [reminderTime, setReminderTime] = useState("08:00");

  // Schedule notifications for all routines with reminders
  useEffect(() => {
    scheduleAllReminders(routines as any);
  }, [routines]);

  const today = new Date().toISOString().split("T")[0];
  const completedTodayIds = useMemo(
    () => new Set(logs.filter((l) => l.logged_at === today && l.completed).map((l) => l.routine_id)),
    [logs, today]
  );

  const completedCount = routines.filter((r) => completedTodayIds.has(r.id)).length;
  const total = routines.length;
  const pct = total > 0 ? Math.round((completedCount / total) * 100) : 0;

  const handleAdd = async () => {
    if (!name.trim()) return;
    if (reminderEnabled) {
      const granted = await requestNotificationPermission();
      if (!granted) {
        // Continue saving even if denied — user can re-enable in browser settings
        console.warn("Notification permission not granted");
      }
    }
    addRoutine.mutate(
      {
        name: name.trim(),
        category,
        frequency,
        reminder_enabled: reminderEnabled,
        reminder_time: reminderEnabled ? reminderTime : null,
      },
      {
        onSuccess: () => {
          setName("");
          setCategory("complement");
          setFrequency("quotidien");
          setReminderEnabled(false);
          setReminderTime("08:00");
          setShowForm(false);
        },
      }
    );
  };

  if (isLoading) {
    return <div className="py-12 text-center text-sm text-muted-foreground">Chargement...</div>;
  }

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Summary card */}
      {total > 0 && (
        <div className="bg-card rounded-2xl p-4 card-soft">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-semibold text-foreground">
              Aujourd'hui : {completedCount}/{total} routines complétées{" "}
              {completedCount === total && "✅"}
            </p>
            <span className="text-xs text-muted-foreground">{pct}%</span>
          </div>
          <Progress value={pct} className="h-2" />
        </div>
      )}

      {/* Add button */}
      {!showForm && (
        <button
          onClick={() => setShowForm(true)}
          className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-semibold flex items-center justify-center gap-2 shadow-md"
        >
          <Plus className="w-4 h-4" /> Ajouter une routine
        </button>
      )}

      {/* Add form */}
      {showForm && (
        <div className="bg-card rounded-2xl p-5 card-soft animate-fade-in">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-sm font-semibold text-foreground">Nouvelle routine</h3>
            <button onClick={() => setShowForm(false)} aria-label="Fermer">
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>

          <div className="mb-3">
            <label className="text-xs text-muted-foreground block mb-1">Nom</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Collagène, Yoga, Magnésium..."
              className="h-9 bg-muted"
            />
          </div>

          <div className="mb-3">
            <label className="text-xs text-muted-foreground block mb-1">Catégorie</label>
            <div className="flex gap-1.5 flex-wrap">
              {ROUTINE_CATEGORIES.map((c) => (
                <button
                  key={c.value}
                  onClick={() => setCategory(c.value)}
                  className={`px-3 py-1.5 rounded-full text-[11px] font-medium transition-all ${
                    category === c.value
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          <div className="mb-4">
            <label className="text-xs text-muted-foreground block mb-1">Fréquence</label>
            <div className="flex gap-1.5">
              {ROUTINE_FREQUENCIES.map((f) => (
                <button
                  key={f.value}
                  onClick={() => setFrequency(f.value)}
                  className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all ${
                    frequency === f.value
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Reminder */}
          <div className="mb-3 rounded-lg bg-muted/40 p-3">
            <div className="flex items-center justify-between">
              <label htmlFor="reminder-toggle" className="text-sm font-medium text-foreground flex items-center gap-1.5">
                🔔 Activer un rappel
              </label>
              <Switch
                id="reminder-toggle"
                checked={reminderEnabled}
                onCheckedChange={(v) => setReminderEnabled(!!v)}
              />
            </div>
            {reminderEnabled && (
              <div className="mt-3">
                <label className="text-xs text-muted-foreground block mb-1">
                  À quelle heure ?
                </label>
                <Input
                  type="time"
                  value={reminderTime}
                  onChange={(e) => setReminderTime(e.target.value || "08:00")}
                  className="h-9 bg-background w-32"
                />
              </div>
            )}
            <p className="text-[12px] text-muted-foreground mt-2 leading-snug">
              💡 Pour recevoir les rappels même quand l'app est fermée,
              installez NutriMéno sur votre écran d'accueil
            </p>
          </div>

          <button
            onClick={handleAdd}
            disabled={!name.trim() || addRoutine.isPending}
            className="w-full py-3 bg-primary text-primary-foreground rounded-lg font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <Plus className="w-4 h-4" /> Enregistrer
          </button>
        </div>
      )}

      {/* Routines list */}
      {routines.length === 0 && !showForm ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="text-6xl mb-4">✅</div>
          <p className="text-sm text-muted-foreground max-w-[260px]">
            Ajoutez vos routines (compléments, sport, méditation...) pour les suivre
            au quotidien
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {routines.map((r) => {
            const done = completedTodayIds.has(r.id);
            const streak = calculateStreak(logs, r.id);
            const weekCount = weekCompletionCount(logs, r.id);
            const cat = ROUTINE_CATEGORIES.find((c) => c.value === r.category);
            return (
              <div
                key={r.id}
                className={`rounded-xl p-3 card-soft transition-all ${
                  done
                    ? "bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900"
                    : "bg-card border border-border"
                }`}
              >
                <div className="flex items-center gap-3">
                  <button
                    onClick={() =>
                      toggleToday.mutate({ routineId: r.id, completed: !done })
                    }
                    className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${
                      done
                        ? "bg-green-500 text-white"
                        : "border-2 border-border bg-background"
                    }`}
                    aria-label={done ? "Décocher" : "Cocher"}
                  >
                    {done && <Check className="w-5 h-5" strokeWidth={3} />}
                  </button>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-foreground">{r.name}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                        {cat?.label || "📝 Autre"}
                      </span>
                      {r.reminder_enabled && r.reminder_time && (
                        <span className="text-[11px] px-2 py-0.5 rounded-full bg-primary/10 text-primary flex items-center gap-1">
                          <Bell className="w-3 h-3" />
                          Rappel à {r.reminder_time.slice(0, 5)}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-0.5">
                      {streak > 0 && (
                        <span className="text-[11px] text-orange-500 font-medium flex items-center gap-1">
                          <Flame className="w-3 h-3" />
                          {streak} jour{streak > 1 ? "s" : ""} consécutif{streak > 1 ? "s" : ""}
                        </span>
                      )}
                      <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                        <Star className="w-3 h-3" />
                        {weekCount}/7 jours cette semaine
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      if (confirm(`Supprimer la routine "${r.name}" ?`)) {
                        deleteRoutine.mutate(r.id);
                      }
                    }}
                    className="text-muted-foreground hover:text-destructive transition-colors flex-shrink-0"
                    aria-label="Supprimer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
