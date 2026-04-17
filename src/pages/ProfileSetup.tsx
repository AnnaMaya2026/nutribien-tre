import { useState } from "react";
import { useProfile } from "@/hooks/useProfile";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChevronRight, ChevronLeft, Heart, LogOut } from "lucide-react";
import { SymptomChips } from "@/components/SymptomChips";
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

const MENOPAUSE_STAGES = [
  { value: "perimenopause", label: "Périménopause" },
  { value: "menopause", label: "Ménopause" },
  { value: "postmenopause", label: "Postménopause" },
];

const DIETARY_PREFS = [
  { value: "vegetarien", label: "Végétarien" },
  { value: "sans_gluten", label: "Sans gluten" },
  { value: "sans_lactose", label: "Sans lactose" },
];

function calculateCalories(age: number, weight: number, height: number): number {
  const bmr = 10 * weight + 6.25 * height - 5 * age - 161;
  return Math.round(bmr * 1.4);
}

export default function ProfileSetup() {
  const { updateProfile } = useProfile();
  const [step, setStep] = useState(0);
  const [displayName, setDisplayName] = useState("");
  const [age, setAge] = useState("");
  const [weight, setWeight] = useState("");
  const [height, setHeight] = useState("");
  const [stage, setStage] = useState("");
  const [symptoms, setSymptoms] = useState<string[]>([]);
  const [dietPrefs, setDietPrefs] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const toggleSymptom = (value: string) => {
    setSymptoms((prev) =>
      prev.includes(value) ? prev.filter((s) => s !== value) : [...prev, value]
    );
  };

  const toggleItem = (list: string[], setList: (v: string[]) => void, item: string) => {
    setList(list.includes(item) ? list.filter((i) => i !== item) : [...list, item]);
  };

  const handleFinish = async () => {
    setSaving(true);
    const cal = calculateCalories(Number(age), Number(weight), Number(height));
    await updateProfile.mutateAsync({
      display_name: displayName.trim() || null,
      age: Number(age),
      weight: Number(weight),
      height: Number(height),
      menopause_stage: stage,
      symptoms,
      dietary_preferences: dietPrefs,
      daily_calorie_goal: cal,
      profile_completed: true,
    } as any);
    setSaving(false);
  };

  const steps = [
    // Step 0: Display name
    <div key="name" className="space-y-6 animate-fade-in">
      <h2 className="text-xl font-semibold text-foreground">Comment souhaitez-vous être appelée ?</h2>
      <p className="text-muted-foreground text-sm">Votre prénom sera utilisé dans toute l'application</p>
      <div>
        <label className="text-sm font-medium text-foreground mb-1 block">Prénom affiché</label>
        <Input
          type="text"
          placeholder="Ex: Anna, Sophie, Marie..."
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          className="h-12 bg-card"
        />
      </div>
    </div>,

    // Step 1: Body info
    <div key="body" className="space-y-6 animate-fade-in">
      <h2 className="text-xl font-semibold text-foreground">Vos informations</h2>
      <p className="text-muted-foreground text-sm">Pour calculer vos besoins nutritionnels</p>
      <div className="space-y-4">
        <div>
          <label className="text-sm font-medium text-foreground mb-1 block">Âge</label>
          <Input type="number" placeholder="52" value={age} onChange={(e) => setAge(e.target.value)} className="h-12 bg-card" />
        </div>
        <div>
          <label className="text-sm font-medium text-foreground mb-1 block">Poids (kg)</label>
          <Input type="number" placeholder="65" value={weight} onChange={(e) => setWeight(e.target.value)} className="h-12 bg-card" />
        </div>
        <div>
          <label className="text-sm font-medium text-foreground mb-1 block">Taille (cm)</label>
          <Input type="number" placeholder="165" value={height} onChange={(e) => setHeight(e.target.value)} className="h-12 bg-card" />
        </div>
      </div>
    </div>,

    // Step 1: Menopause stage
    <div key="stage" className="space-y-6 animate-fade-in">
      <h2 className="text-xl font-semibold text-foreground">Étape de ménopause</h2>
      <p className="text-muted-foreground text-sm">Pour adapter vos recommandations</p>
      <div className="space-y-3">
        {MENOPAUSE_STAGES.map((s) => (
          <button
            key={s.value}
            onClick={() => setStage(s.value)}
            className={`w-full p-4 rounded-lg text-left font-medium transition-all border ${
              stage === s.value
                ? "bg-primary/20 border-primary text-foreground"
                : "bg-card border-border text-foreground hover:border-primary/50"
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>
    </div>,

    // Step 2: Symptoms (full list as toggle chips)
    <div key="symptoms" className="space-y-6 animate-fade-in">
      <h2 className="text-xl font-semibold text-foreground">Vos symptômes principaux</h2>
      <p className="text-muted-foreground text-sm">Sélectionnez ceux qui vous concernent</p>
      <SymptomChips selected={symptoms} onToggle={toggleSymptom} />
    </div>,

    // Step 3: Diet
    <div key="diet" className="space-y-6 animate-fade-in">
      <h2 className="text-xl font-semibold text-foreground">Préférences alimentaires</h2>
      <p className="text-muted-foreground text-sm">Optionnel — sélectionnez si applicable</p>
      <div className="space-y-3">
        {DIETARY_PREFS.map((d) => (
          <button
            key={d.value}
            onClick={() => toggleItem(dietPrefs, setDietPrefs, d.value)}
            className={`w-full p-4 rounded-lg text-left font-medium transition-all border ${
              dietPrefs.includes(d.value)
                ? "bg-primary/20 border-primary text-foreground"
                : "bg-card border-border text-foreground hover:border-primary/50"
            }`}
          >
            {d.label}
          </button>
        ))}
      </div>
    </div>,

    // Step 4: Summary
    <div key="summary" className="space-y-6 animate-fade-in">
      <h2 className="text-xl font-semibold text-foreground">Votre profil</h2>
      <div className="bg-card rounded-lg p-6 card-soft space-y-3">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Âge</span>
          <span className="font-medium text-foreground">{age} ans</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Poids</span>
          <span className="font-medium text-foreground">{weight} kg</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Taille</span>
          <span className="font-medium text-foreground">{height} cm</span>
        </div>
        <div className="border-t border-border pt-3">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Objectif calorique</span>
            <span className="font-bold text-foreground text-lg">
              {age && weight && height ? calculateCalories(Number(age), Number(weight), Number(height)) : "—"} kcal/jour
            </span>
          </div>
        </div>
      </div>
    </div>,
  ];

  const canNext =
    step === 0 ? displayName.trim().length > 0 :
    step === 1 ? age && weight && height :
    step === 2 ? stage :
    step === 3 ? true :
    step === 4 ? true :
    true;

  return (
    <div className="min-h-screen flex flex-col px-6 py-8 bg-background">
      <div className="flex items-center gap-2 mb-2">
        <Heart className="w-5 h-5 text-primary-foreground" />
        <span className="font-semibold text-foreground">NutriMéno</span>
      </div>

      {/* Progress */}
      <div className="flex gap-1.5 mb-8">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-all ${
              i <= step ? "bg-primary" : "bg-border"
            }`}
          />
        ))}
      </div>

      <div className="flex-1">{steps[step]}</div>

      <div className="flex gap-3 mt-6">
        {step > 0 && (
          <Button variant="outline" onClick={() => setStep(step - 1)} className="h-12 px-6 rounded-lg">
            <ChevronLeft className="w-4 h-4 mr-1" /> Retour
          </Button>
        )}
        {step < 5 ? (
          <Button
            onClick={() => setStep(step + 1)}
            disabled={!canNext}
            className="flex-1 h-12 rounded-lg font-semibold"
          >
            Suivant <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        ) : (
          <Button
            onClick={handleFinish}
            disabled={saving}
            className="flex-1 h-12 rounded-lg font-semibold"
          >
            {saving ? "..." : "Commencer"} 🎉
          </Button>
        )}
      </div>
    </div>
  );
}
