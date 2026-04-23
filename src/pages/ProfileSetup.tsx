import { useState } from "react";
import { useProfile } from "@/hooks/useProfile";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChevronRight, ChevronLeft, Heart, LogOut } from "lucide-react";
import { SymptomChips } from "@/components/SymptomChips";
import { DIETARY_RESTRICTIONS, splitDietary, buildDietary } from "@/lib/dietaryRestrictions";
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


export default function ProfileSetup() {
  const { profile, updateProfile } = useProfile();
  const { signOut } = useAuth();
  const [step, setStep] = useState(0);
  const [displayName, setDisplayName] = useState((profile as any)?.display_name ?? "");
  const [stage, setStage] = useState((profile as any)?.menopause_stage ?? "");
  const [symptoms, setSymptoms] = useState<string[]>((profile as any)?.symptoms ?? []);
  const [dietPrefs, setDietPrefs] = useState<string[]>((profile as any)?.dietary_preferences ?? []);
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
    await updateProfile.mutateAsync({
      display_name: displayName.trim() || null,
      menopause_stage: stage,
      symptoms,
      dietary_preferences: dietPrefs,
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

    // Step 2: Symptoms
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
  ];

  const lastStep = steps.length - 1;
  const canNext =
    step === 0 ? displayName.trim().length > 0 :
    step === 1 ? !!stage :
    true;

  return (
    <div className="min-h-screen flex flex-col px-6 py-8 bg-background">
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <Heart className="w-5 h-5 text-primary-foreground" />
          <span className="font-semibold text-foreground">NutriMéno</span>
        </div>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-destructive">
              <LogOut className="w-4 h-4 mr-1" />
              Se déconnecter
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Êtes-vous sûre de vouloir vous déconnecter ?</AlertDialogTitle>
              <AlertDialogDescription>
                Vous devrez vous reconnecter pour accéder à votre profil et à vos données.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Annuler</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => signOut()}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Se déconnecter
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      {/* Progress */}
      <div className="flex gap-1.5 mb-8">
        {steps.map((_, i) => (
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
        {step < lastStep ? (
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
