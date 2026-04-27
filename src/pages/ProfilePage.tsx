import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, RefreshCw, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useProfile } from "@/hooks/useProfile";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  ACTIVITY_LEVELS,
  calculateCalorieGoal,
  calculateProteinGoal,
  calculateBMR,
  calculateCarbsGoal,
  calculateFatsGoal,
  getActivityLevel,
  FIBRES_GOAL_MIN,
  FIBRES_GOAL_MAX,
} from "@/lib/calorieGoal";
import { DIETARY_RESTRICTIONS, splitDietary, buildDietary } from "@/lib/dietaryRestrictions";
import { HEALTH_CONDITIONS } from "@/lib/healthConditions";
import { FULL_SYMPTOMS_LIST } from "@/lib/symptoms";

const MENOPAUSE_STAGES = [
  { value: "perimenopause", label: "Périménopause" },
  { value: "menopause", label: "Ménopause" },
  { value: "postmenopause", label: "Postménopause" },
];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="bg-card rounded-2xl p-5 card-soft space-y-4">
      <h2 className="text-base font-semibold text-foreground">{title}</h2>
      {children}
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-foreground">{label}</label>
      {children}
    </div>
  );
}

export default function ProfilePage() {
  const navigate = useNavigate();
  const { profile, updateProfile } = useProfile();

  const [displayName, setDisplayName] = useState("");
  const [age, setAge] = useState<string>("");
  const [weight, setWeight] = useState<string>("");
  const [height, setHeight] = useState<string>("");
  const [activityLevel, setActivityLevel] = useState<string>("sedentaire");
  const [menopauseStage, setMenopauseStage] = useState<string>("");
  const [healthConditions, setHealthConditions] = useState<string[]>([]);
  const [dietPrefs, setDietPrefs] = useState<string[]>([]);
  const [dietOther, setDietOther] = useState("");
  const [symptoms, setSymptoms] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  // Hydrate state from profile
  useEffect(() => {
    if (!profile) return;
    const p = profile as any;
    setDisplayName(p.display_name ?? "");
    setAge(p.age != null ? String(p.age) : "");
    setWeight(p.weight != null ? String(p.weight) : "");
    setHeight(p.height != null ? String(p.height) : "");
    setActivityLevel(p.activity_level ?? "sedentaire");
    setMenopauseStage(p.menopause_stage ?? "");
    setHealthConditions(p.health_conditions ?? []);
    const diet = splitDietary(p.dietary_preferences);
    setDietPrefs(diet.codes);
    setDietOther(diet.other);
    setSymptoms(p.symptoms ?? []);
  }, [profile]);

  const computedBMR = useMemo(
    () =>
      calculateBMR({
        weight: weight ? Number(weight) : null,
        height: height ? Number(height) : null,
        age: age ? Number(age) : null,
      }),
    [weight, height, age]
  );
  const computedCalorieGoal = useMemo(
    () =>
      calculateCalorieGoal({
        weight: weight ? Number(weight) : null,
        height: height ? Number(height) : null,
        age: age ? Number(age) : null,
        activityLevel,
      }),
    [weight, height, age, activityLevel]
  );
  const computedProteinGoal = useMemo(
    () => calculateProteinGoal(weight ? Number(weight) : null),
    [weight]
  );
  const computedCarbsGoal = useMemo(
    () => calculateCarbsGoal(computedCalorieGoal),
    [computedCalorieGoal]
  );
  const computedFatsGoal = useMemo(
    () => calculateFatsGoal(computedCalorieGoal),
    [computedCalorieGoal]
  );
  const activityInfo = useMemo(() => getActivityLevel(activityLevel), [activityLevel]);

  const toggle = (list: string[], setter: (v: string[]) => void, value: string) => {
    setter(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);
  };

  const handleRecalculate = () => {
    toast.success(`🔄 Objectifs recalculés : ${computedCalorieGoal} kcal · ${computedProteinGoal}g protéines`);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateProfile.mutateAsync({
        display_name: displayName.trim() || null,
        age: age ? Number(age) : null,
        weight: weight ? Number(weight) : null,
        height: height ? Number(height) : null,
        activity_level: activityLevel,
        menopause_stage: menopauseStage || null,
        health_conditions: healthConditions,
        dietary_preferences: buildDietary(dietPrefs, dietOther),
        symptoms,
        daily_calorie_goal: computedCalorieGoal,
      } as any);
      toast.success("✅ Profil mis à jour avec succès");
    } catch (e) {
      console.error(e);
      toast.error("Erreur lors de la sauvegarde");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="pb-32 px-4 pt-6 bg-background min-h-screen">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(-1)}
          aria-label="Retour"
          className="shrink-0"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-2xl font-bold text-foreground">Mon profil</h1>
      </div>

      <div className="space-y-4">
        {/* Informations personnelles */}
        <Section title="Informations personnelles">
          <Field label="Prénom affiché">
            <Input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Votre prénom"
              className="bg-background"
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Âge">
              <Input
                type="number"
                inputMode="numeric"
                value={age}
                onChange={(e) => setAge(e.target.value)}
                placeholder="50"
                className="bg-background"
              />
            </Field>
            <Field label="Taille (cm)">
              <Input
                type="number"
                inputMode="numeric"
                value={height}
                onChange={(e) => setHeight(e.target.value)}
                placeholder="165"
                className="bg-background"
              />
            </Field>
          </div>
          <Field label="Poids (kg)">
            <Input
              type="number"
              inputMode="decimal"
              step="0.1"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              placeholder="65"
              className="bg-background"
            />
            <p className="text-xs text-muted-foreground">
              La mise à jour du poids recalcule vos objectifs caloriques et protéiques.
            </p>
          </Field>

          <Field label="Niveau d'activité">
            <div className="grid grid-cols-2 gap-2">
              {ACTIVITY_LEVELS.map((level) => (
                <button
                  key={level.value}
                  type="button"
                  onClick={() => setActivityLevel(level.value)}
                  className={`p-3 rounded-lg text-left text-sm transition-all border ${
                    activityLevel === level.value
                      ? "bg-primary/15 border-primary text-foreground"
                      : "bg-background border-border text-foreground hover:border-primary/50"
                  }`}
                >
                  <div className="font-medium">{level.label}</div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">{level.description}</div>
                </button>
              ))}
            </div>
          </Field>

          <Field label="Stade ménopause">
            <div className="grid grid-cols-3 gap-2">
              {MENOPAUSE_STAGES.map((s) => (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => setMenopauseStage(s.value)}
                  className={`p-2.5 rounded-lg text-sm font-medium transition-all border ${
                    menopauseStage === s.value
                      ? "bg-primary/15 border-primary text-foreground"
                      : "bg-background border-border text-foreground hover:border-primary/50"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </Field>
        </Section>

        {/* Objectifs */}
        <Section title="Objectifs (calculés automatiquement)">
          <div className="bg-primary/10 border border-primary/20 rounded-xl p-3">
            <div className="text-xs text-muted-foreground mb-0.5">Votre objectif calorique</div>
            <div className="text-2xl font-bold text-foreground">{computedCalorieGoal} kcal/jour</div>
            <div className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
              Basé sur votre métabolisme de base de <strong>{computedBMR} kcal</strong> ×
              niveau d'activité <strong>{activityInfo.label.toLowerCase()}</strong> (×{activityInfo.factor}).
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-muted/40 rounded-xl p-3">
              <div className="text-xs text-muted-foreground">Protéines</div>
              <div className="text-lg font-bold text-foreground">{computedProteinGoal} g</div>
              <div className="text-[10px] text-muted-foreground">1g × kg de poids</div>
            </div>
            <div className="bg-muted/40 rounded-xl p-3">
              <div className="text-xs text-muted-foreground">Glucides</div>
              <div className="text-lg font-bold text-foreground">{computedCarbsGoal} g</div>
              <div className="text-[10px] text-muted-foreground">50% des calories</div>
            </div>
            <div className="bg-muted/40 rounded-xl p-3">
              <div className="text-xs text-muted-foreground">Lipides</div>
              <div className="text-lg font-bold text-foreground">{computedFatsGoal} g</div>
              <div className="text-[10px] text-muted-foreground">30% des calories</div>
            </div>
            <div className="bg-muted/40 rounded-xl p-3">
              <div className="text-xs text-muted-foreground">Fibres</div>
              <div className="text-lg font-bold text-foreground">{FIBRES_GOAL_MIN}–{FIBRES_GOAL_MAX} g</div>
              <div className="text-[10px] text-muted-foreground">Recommandation OMS</div>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={handleRecalculate}
            className="w-full"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Recalculer mes objectifs
          </Button>
          <p className="text-[11px] text-muted-foreground">
            ⚠️ Ces recommandations sont indicatives. Consultez votre médecin pour un suivi personnalisé.
          </p>
        </Section>

        {/* Santé & restrictions */}
        <Section title="Santé & restrictions">
          <Field label="Problèmes de santé à surveiller">
            <div className="flex flex-wrap gap-2">
              {HEALTH_CONDITIONS.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => toggle(healthConditions, setHealthConditions, c.value)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${
                    healthConditions.includes(c.value)
                      ? "bg-primary/15 border-primary text-foreground"
                      : "bg-background border-border text-foreground hover:border-primary/50"
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </Field>

          <Field label="Restrictions alimentaires">
            <div className="flex flex-wrap gap-2">
              {DIETARY_RESTRICTIONS.map((d) => (
                <button
                  key={d.value}
                  type="button"
                  onClick={() => toggle(dietPrefs, setDietPrefs, d.value)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${
                    dietPrefs.includes(d.value)
                      ? "bg-primary/15 border-primary text-foreground"
                      : "bg-background border-border text-foreground hover:border-primary/50"
                  }`}
                >
                  <span className="mr-1">{d.emoji}</span>
                  {d.label}
                </button>
              ))}
            </div>
            <Input
              value={dietOther}
              onChange={(e) => setDietOther(e.target.value)}
              placeholder="Autre (ex: sans soja, halal…)"
              className="bg-background mt-2"
            />
          </Field>
        </Section>

        {/* Préférences */}
        <Section title="Symptômes actifs">
          <div className="flex flex-wrap gap-2">
            {FULL_SYMPTOMS_LIST.map((s) => (
              <button
                key={s.value}
                type="button"
                onClick={() => toggle(symptoms, setSymptoms, s.value)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${
                  symptoms.includes(s.value)
                    ? "bg-primary/15 border-primary text-foreground"
                    : "bg-background border-border text-foreground hover:border-primary/50"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </Section>

        {/* Save */}
        <Button
          onClick={handleSave}
          disabled={saving}
          className="w-full h-12 rounded-xl font-semibold"
        >
          <Save className="w-4 h-4 mr-2" />
          {saving ? "Sauvegarde…" : "Sauvegarder"}
        </Button>
      </div>
    </div>
  );
}
