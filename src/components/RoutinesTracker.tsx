import { useState, useMemo, useEffect } from "react";
import { Plus, X, Trash2, Check, Flame, Star, Bell, Pencil, BellRing } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  useRoutines,
  ROUTINE_CATEGORIES,
  ROUTINE_FREQUENCIES,
  SUPPLEMENT_NUTRIENTS,
  calculateStreak,
  weekCompletionCount,
  type Routine,
} from "@/hooks/useRoutines";
import {
  requestNotificationPermission,
  scheduleAllReminders,
  sendTestNotification,
} from "@/lib/routineReminders";
import { toast } from "sonner";

interface FormState {
  name: string;
  category: string;
  frequency: string;
  reminder_enabled: boolean;
  reminder_time: string;
  provides_nutrient: boolean;
  nutrient_key: string;
  nutrient_amount: string;
  nutrient_unit: "mg" | "µg";
}

const emptyForm = (): FormState => ({
  name: "",
  category: "complement",
  frequency: "quotidien",
  reminder_enabled: false,
  reminder_time: "08:00",
  provides_nutrient: false,
  nutrient_key: "calcium",
  nutrient_amount: "",
  nutrient_unit: "mg",
});

function RoutineForm({
  state,
  setState,
}: {
  state: FormState;
  setState: (s: FormState) => void;
}) {
  const isSupplement = state.category === "complement";
  return (
    <>
      <div className="mb-3">
        <label className="text-xs text-muted-foreground block mb-1">Nom</label>
        <Input
          value={state.name}
          onChange={(e) => setState({ ...state, name: e.target.value })}
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
              onClick={() => setState({ ...state, category: c.value })}
              className={`px-3 py-1.5 rounded-full text-[11px] font-medium transition-all ${
                state.category === c.value
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
              onClick={() => setState({ ...state, frequency: f.value })}
              className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all ${
                state.frequency === f.value
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Supplement nutrient */}
      {isSupplement && (
        <div className="mb-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 p-3">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-foreground">
              💊 Ce complément apporte-t-il un nutriment ?
            </label>
            <Switch
              checked={state.provides_nutrient}
              onCheckedChange={(v) => setState({ ...state, provides_nutrient: !!v })}
            />
          </div>
          {state.provides_nutrient && (
            <div className="mt-3 space-y-2">
              <div>
                <label className="text-xs text-muted-foreground block mb-1">
                  Nutriment apporté
                </label>
                <select
                  value={state.nutrient_key}
                  onChange={(e) => {
                    const key = e.target.value;
                    const def = SUPPLEMENT_NUTRIENTS.find((n) => n.value === key);
                    setState({
                      ...state,
                      nutrient_key: key,
                      nutrient_unit: def?.unit || "mg",
                    });
                  }}
                  className="w-full h-9 rounded-md bg-background border border-border px-2 text-sm"
                >
                  {SUPPLEMENT_NUTRIENTS.map((n) => (
                    <option key={n.value} value={n.value}>
                      {n.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="text-xs text-muted-foreground block mb-1">Quantité</label>
                  <Input
                    type="number"
                    inputMode="decimal"
                    value={state.nutrient_amount}
                    onChange={(e) =>
                      setState({ ...state, nutrient_amount: e.target.value })
                    }
                    placeholder="ex: 500"
                    className="h-9 bg-background"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">Unité</label>
                  <div className="flex gap-1">
                    {(["mg", "µg"] as const).map((u) => (
                      <button
                        key={u}
                        type="button"
                        onClick={() => setState({ ...state, nutrient_unit: u })}
                        className={`px-3 h-9 rounded-md text-xs font-medium ${
                          state.nutrient_unit === u
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {u}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Reminder */}
      <div className="mb-3 rounded-lg bg-muted/40 p-3">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-foreground flex items-center gap-1.5">
            🔔 Activer un rappel
          </label>
          <Switch
            checked={state.reminder_enabled}
            onCheckedChange={(v) => setState({ ...state, reminder_enabled: !!v })}
          />
        </div>
        {state.reminder_enabled && (
          <div className="mt-3">
            <label className="text-xs text-muted-foreground block mb-1">À quelle heure ?</label>
            <Input
              type="time"
              value={state.reminder_time}
              onChange={(e) =>
                setState({ ...state, reminder_time: e.target.value || "08:00" })
              }
              className="h-9 bg-background w-32"
            />
            {typeof window !== "undefined" &&
              "Notification" in window &&
              Notification.permission !== "granted" && (
                <p className="text-[11px] text-amber-700 dark:text-amber-300 mt-2 leading-snug">
                  ⚠️ Activez les notifications dans les paramètres de votre navigateur pour
                  recevoir les rappels.
                </p>
              )}
          </div>
        )}
        <p className="text-[12px] text-muted-foreground mt-2 leading-snug">
          💡 Pour recevoir les rappels même quand l'app est fermée, installez NutriMéno sur
          votre écran d'accueil
        </p>
      </div>
    </>
  );
}

export function RoutinesTracker() {
  const { routines, logs, addRoutine, updateRoutine, deleteRoutine, toggleToday, isLoading } =
    useRoutines();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Routine | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm());

  // Schedule notifications for all routines with reminders
  useEffect(() => {
    scheduleAllReminders(routines as any);
  }, [routines]);

  const today = new Date().toISOString().split("T")[0];
  const completedTodayIds = useMemo(
    () =>
      new Set(
        logs.filter((l) => l.logged_at === today && l.completed).map((l) => l.routine_id)
      ),
    [logs, today]
  );

  const completedCount = routines.filter((r) => completedTodayIds.has(r.id)).length;
  const total = routines.length;
  const pct = total > 0 ? Math.round((completedCount / total) * 100) : 0;

  const handleAdd = async () => {
    if (!form.name.trim()) return;
    if (form.reminder_enabled) {
      const granted = await requestNotificationPermission();
      if (!granted) {
        toast.message(
          "Les notifications sont bloquées. Activez-les dans les paramètres de votre navigateur."
        );
      }
    }
    addRoutine.mutate(
      {
        name: form.name.trim(),
        category: form.category,
        frequency: form.frequency,
        reminder_enabled: form.reminder_enabled,
        reminder_time: form.reminder_enabled ? form.reminder_time : null,
        provides_nutrient: form.provides_nutrient,
        nutrient_key: form.provides_nutrient ? form.nutrient_key : null,
        nutrient_amount: form.provides_nutrient
          ? parseFloat(form.nutrient_amount) || null
          : null,
        nutrient_unit: form.provides_nutrient ? form.nutrient_unit : null,
      },
      {
        onSuccess: () => {
          setForm(emptyForm());
          setShowForm(false);
        },
      }
    );
  };

  const openEdit = (r: Routine) => {
    setEditing(r);
    const def = SUPPLEMENT_NUTRIENTS.find((n) => n.value === (r.nutrient_key || ""));
    setForm({
      name: r.name,
      category: r.category,
      frequency: r.frequency,
      reminder_enabled: !!r.reminder_enabled,
      reminder_time: (r.reminder_time || "08:00").slice(0, 5),
      provides_nutrient: !!r.provides_nutrient,
      nutrient_key: r.nutrient_key || "calcium",
      nutrient_amount: r.nutrient_amount != null ? String(r.nutrient_amount) : "",
      nutrient_unit: ((r.nutrient_unit as "mg" | "µg") || def?.unit || "mg") as "mg" | "µg",
    });
  };

  const handleEditSave = async () => {
    if (!editing || !form.name.trim()) return;
    if (form.reminder_enabled) await requestNotificationPermission();
    updateRoutine.mutate(
      {
        id: editing.id,
        name: form.name.trim(),
        category: form.category,
        frequency: form.frequency,
        reminder_enabled: form.reminder_enabled,
        reminder_time: form.reminder_enabled ? form.reminder_time : null,
        provides_nutrient: form.provides_nutrient,
        nutrient_key: form.provides_nutrient ? form.nutrient_key : null,
        nutrient_amount: form.provides_nutrient
          ? parseFloat(form.nutrient_amount) || null
          : null,
        nutrient_unit: form.provides_nutrient ? form.nutrient_unit : null,
      },
      {
        onSuccess: () => {
          setEditing(null);
          setForm(emptyForm());
        },
      }
    );
  };

  const handleTest = async (r: Routine) => {
    const key = "nutrimeno:test-notif-explained";
    const hasSeen = localStorage.getItem(key);
    if (!hasSeen) {
      toast.info(
        "Ceci envoie une notification test immédiate pour vérifier que vos rappels fonctionnent correctement.",
        { duration: 4000 }
      );
      localStorage.setItem(key, "true");
    }
    const ok = await sendTestNotification(r.name);
    if (ok) {
      toast.success("Notification de test envoyée 🔔");
    } else {
      toast.error(
        "Notifications bloquées. Autorisez-les dans votre navigateur pour recevoir les rappels."
      );
    }
  };

  if (isLoading) {
    return (
      <div className="py-12 text-center text-sm text-muted-foreground">Chargement...</div>
    );
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
          onClick={() => {
            setForm(emptyForm());
            setShowForm(true);
          }}
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

          <RoutineForm state={form} setState={setForm} />

          <button
            onClick={handleAdd}
            disabled={!form.name.trim() || addRoutine.isPending}
            className="w-full py-3 bg-primary text-primary-foreground rounded-lg font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <Plus className="w-4 h-4" /> Enregistrer
          </button>
        </div>
      )}

      {/* Edit modal */}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Modifier la routine</DialogTitle>
          </DialogHeader>
          <RoutineForm state={form} setState={setForm} />
          <div className="flex gap-2">
            <button
              onClick={() => setEditing(null)}
              className="flex-1 py-2.5 rounded-lg bg-muted text-muted-foreground text-sm font-medium"
            >
              Annuler
            </button>
            <button
              onClick={handleEditSave}
              disabled={!form.name.trim() || updateRoutine.isPending}
              className="flex-1 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-50"
            >
              Enregistrer
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Routines list */}
      {routines.length === 0 && !showForm ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="text-6xl mb-4">✅</div>
          <p className="text-sm text-muted-foreground max-w-[260px]">
            Ajoutez vos routines (compléments, sport, méditation...) pour les suivre au
            quotidien
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {routines.map((r) => {
            const done = completedTodayIds.has(r.id);
            const streak = calculateStreak(logs, r.id);
            const weekCount = weekCompletionCount(logs, r.id);
            const cat = ROUTINE_CATEGORIES.find((c) => c.value === r.category);
            const nutrientDef = SUPPLEMENT_NUTRIENTS.find(
              (n) => n.value === (r.nutrient_key || "")
            );
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
                          {r.reminder_time.slice(0, 5)}
                        </span>
                      )}
                      {r.provides_nutrient && r.nutrient_amount && (
                        <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                          +{r.nutrient_amount}
                          {r.nutrient_unit} {nutrientDef?.label || r.nutrient_key}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-0.5">
                      {streak > 0 && (
                        <span className="text-[11px] text-orange-500 font-medium flex items-center gap-1">
                          <Flame className="w-3 h-3" />
                          {streak} jour{streak > 1 ? "s" : ""} consécutif
                          {streak > 1 ? "s" : ""}
                        </span>
                      )}
                      <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                        <Star className="w-3 h-3" />
                        {weekCount}/7 jours cette semaine
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {r.reminder_enabled && (
                      <button
                        onClick={() => handleTest(r)}
                        className="text-[10px] px-2 py-1 rounded-full bg-primary/10 text-pink-deep font-medium hover:bg-primary/20 transition-colors flex items-center gap-1"
                        aria-label="Rappel"
                        title="Envoyer une notification de test"
                      >
                        <BellRing className="w-3 h-3" />
                        Rappel 🔔
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        console.log("[Routines] Edit clicked", r.id, r.name);
                        openEdit(r);
                      }}
                      className="text-muted-foreground hover:text-primary transition-colors p-1"
                      aria-label="Modifier"
                      title="Modifier"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`Supprimer la routine "${r.name}" ?`)) {
                          deleteRoutine.mutate(r.id);
                        }
                      }}
                      className="text-muted-foreground hover:text-destructive transition-colors"
                      aria-label="Supprimer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
