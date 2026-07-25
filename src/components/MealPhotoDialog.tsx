import { useRef, useState } from "react";
import { Camera, Image as ImageIcon, X, Plus, Loader2, Check, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { useSelectedDate } from "@/hooks/useSelectedDate";
import { useQueryClient } from "@tanstack/react-query";

interface MealItem {
  name: string;
  grams: number;
}

interface MealPhotoDialogProps {
  open: boolean;
  onClose: () => void;
}

const MAX_DIM = 1280;
const JPEG_QUALITY = 0.8;

async function fileToCompressedDataUrl(file: File): Promise<string> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = reject;
    r.readAsDataURL(file);
  });
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const i = new Image();
    i.onload = () => resolve(i);
    i.onerror = reject;
    i.src = dataUrl;
  });
  let { width, height } = img;
  if (width > MAX_DIM || height > MAX_DIM) {
    const ratio = Math.min(MAX_DIM / width, MAX_DIM / height);
    width = Math.round(width * ratio);
    height = Math.round(height * ratio);
  }
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return dataUrl;
  ctx.drawImage(img, 0, 0, width, height);
  return canvas.toDataURL("image/jpeg", JPEG_QUALITY);
}

type Step = "capture" | "analyzing" | "review" | "confirm" | "saving" | "done";

const MEAL_LABELS: Record<string, string> = {
  "petit-dejeuner": "Petit-déjeuner",
  dejeuner: "Déjeuner",
  diner: "Dîner",
  collation: "Collation",
};

function guessMealType(): string {
  const h = new Date().getHours();
  if (h < 10) return "petit-dejeuner";
  if (h < 15) return "dejeuner";
  if (h < 18) return "collation";
  return "diner";
}

export default function MealPhotoDialog({ open, onClose }: MealPhotoDialogProps) {
  const { user } = useAuth();
  const { selectedDateStr, todayStr } = useSelectedDate();
  const queryClient = useQueryClient();
  const [step, setStep] = useState<Step>("capture");
  const [preview, setPreview] = useState<string | null>(null);
  const [items, setItems] = useState<MealItem[]>([]);
  const [newName, setNewName] = useState("");
  const [newGrams, setNewGrams] = useState("");
  const [mealType, setMealType] = useState<string>(guessMealType());
  const [summary, setSummary] = useState<{ count: number; calories: number } | null>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  if (!open) return null;

  const reset = () => {
    setStep("capture");
    setPreview(null);
    setItems([]);
    setNewName("");
    setNewGrams("");
    setMealType(guessMealType());
    setSummary(null);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Merci de sélectionner une image.");
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      toast.error("Image trop lourde (max 15 Mo).");
      return;
    }
    try {
      setStep("analyzing");
      const compressed = await fileToCompressedDataUrl(file);
      setPreview(compressed);

      const { data, error } = await supabase.functions.invoke("analyze-meal-photo", {
        body: { image: compressed },
      });
      if (error) throw error;

      if (data?.issue === "blurry") {
        toast.error("La photo semble floue. Reprenez-la avec plus de lumière et de netteté.");
        setItems([]);
        setStep("review");
      } else if (data?.issue === "too_dark") {
        toast.error("La photo est trop sombre pour être analysée.");
        setItems([]);
        setStep("review");
      } else if (data?.issue === "no_food" || !Array.isArray(data?.foods) || data.foods.length === 0) {
        toast.error("Aucun aliment détecté sur l'assiette. Ajoutez-les manuellement.");
        setItems([]);
        setStep("review");
      } else {
        setItems(data.foods);
        toast.success(`${data.foods.length} aliment(s) détecté(s) — ajustez les quantités si besoin.`);
        setStep("review");
      }
    } catch (e) {
      console.error("analyze-meal-photo error", e);
      toast.error("Analyse impossible. Réessayez dans un instant.");
      setItems([]);
      setStep("review");
    }
  };

  const updateGrams = (idx: number, grams: number) => {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, grams: Math.max(1, grams) } : it)));
  };
  const removeItem = (idx: number) => setItems((prev) => prev.filter((_, i) => i !== idx));
  const addItem = () => {
    const n = newName.trim();
    const g = Math.max(1, Math.round(Number(newGrams) || 0));
    if (!n || !g) {
      toast.error("Nom et quantité (g) requis.");
      return;
    }
    setItems((prev) => [...prev, { name: n, grams: g }]);
    setNewName("");
    setNewGrams("");
  };

  const askConfirm = () => {
    if (items.length === 0) {
      toast.error("Ajoutez au moins un aliment.");
      return;
    }
    setStep("confirm");
  };

  const saveToJournal = async () => {
    if (!user) return;
    setStep("saving");
    try {
      const mealLabel = MEAL_LABELS[mealType] || "Repas";
      const menuContent = `${mealLabel}:\n${items.map((it) => `- ${it.name} (${it.grams}g)`).join("\n")}`;

      const { data, error } = await supabase.functions.invoke("parse-menu-foods", {
        body: { menu_content: menuContent },
      });
      if (error) throw error;
      const entries: any[] = (data?.entries as any[]) || [];
      if (entries.length === 0) {
        toast.error("Impossible d'estimer les nutriments. Réessayez.");
        setStep("review");
        return;
      }

      const loggedAt = selectedDateStr || todayStr;
      let inserted = 0;
      let totalCalories = 0;
      for (const entry of entries) {
        const { estimated, ...rest } = entry;
        const row = {
          ...rest,
          meal_type: mealType,
          user_id: user.id,
          logged_at: loggedAt,
        };
        const { error: insErr } = await supabase.from("food_logs").insert(row);
        if (!insErr) {
          inserted += 1;
          totalCalories += Number(entry.calories) || 0;
        } else {
          console.error("meal insert failed", insErr, row);
        }
      }

      queryClient.invalidateQueries({ queryKey: ["food_logs"] });
      queryClient.invalidateQueries({ queryKey: ["food_logs_week"] });

      setSummary({ count: inserted, calories: Math.round(totalCalories) });
      setStep("done");
      toast.success("Repas ajouté au journal !");
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Erreur lors de l'enregistrement.");
      setStep("review");
    }
  };

  return (
    <div className="fixed inset-0 z-[60] bg-black/60 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-background w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl max-h-[92vh] overflow-y-auto shadow-xl pb-[calc(96px+env(safe-area-inset-bottom))] sm:pb-0">
        <div className="sticky top-0 bg-background border-b border-border px-4 py-3 flex items-center justify-between">
          <h2 className="text-base font-bold text-foreground">🍽️ Photo de mon assiette</h2>
          <button
            onClick={handleClose}
            className="w-9 h-9 rounded-full hover:bg-muted flex items-center justify-center"
            aria-label="Fermer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {step === "capture" && (
            <>
              <p className="text-sm text-muted-foreground">
                Prenez ou importez une photo de votre repas : Sophie identifiera les aliments et estimera les quantités pour les ajouter à votre journal.
              </p>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => cameraInputRef.current?.click()}
                  className="flex flex-col items-center gap-2 p-5 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-md min-h-[120px] justify-center"
                >
                  <Camera className="w-8 h-8" />
                  <span className="text-sm font-medium">Prendre une photo</span>
                </button>
                <button
                  onClick={() => galleryInputRef.current?.click()}
                  className="flex flex-col items-center gap-2 p-5 rounded-xl bg-muted hover:bg-muted/70 text-foreground transition-colors min-h-[120px] justify-center"
                >
                  <ImageIcon className="w-8 h-8" />
                  <span className="text-sm font-medium">Importer une photo</span>
                </button>
              </div>
              <p className="text-xs text-muted-foreground italic">
                💡 Astuce : cadrez l'assiette de dessus avec un bon éclairage pour une meilleure estimation des portions.
              </p>
            </>
          )}

          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => handleFile(e.target.files?.[0])}
          />
          <input
            ref={galleryInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => handleFile(e.target.files?.[0])}
          />

          {preview && step !== "capture" && step !== "done" && (
            <div className="rounded-xl overflow-hidden border border-border bg-muted">
              <img src={preview} alt="Aperçu" className="w-full max-h-56 object-cover" />
            </div>
          )}

          {step === "analyzing" && (
            <div className="flex items-center justify-center gap-2 py-8 text-pink-deep">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="text-sm font-medium">Analyse de l'assiette…</span>
            </div>
          )}

          {step === "review" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-foreground">
                  Aliments détectés {items.length > 0 && <span className="text-muted-foreground font-normal">({items.length})</span>}
                </h3>
                <button
                  onClick={() => {
                    setPreview(null);
                    setItems([]);
                    setStep("capture");
                    if (cameraInputRef.current) cameraInputRef.current.value = "";
                    if (galleryInputRef.current) galleryInputRef.current.value = "";
                  }}
                  className="text-xs text-pink-deep underline"
                >
                  Reprendre une photo
                </button>
              </div>
              <p className="text-xs text-muted-foreground">
                Ajustez les quantités, supprimez ou ajoutez des aliments, puis validez.
              </p>

              {items.length > 0 ? (
                <ul className="space-y-2">
                  {items.map((it, i) => (
                    <li
                      key={`${it.name}-${i}`}
                      className="flex items-center gap-2 bg-card border border-border rounded-lg px-3 py-2"
                    >
                      <span className="text-sm text-foreground flex-1 truncate">{it.name}</span>
                      <Input
                        type="number"
                        min={1}
                        value={it.grams}
                        onChange={(e) => updateGrams(i, Number(e.target.value))}
                        className="w-20 h-9 text-sm"
                      />
                      <span className="text-xs text-muted-foreground">g</span>
                      <button
                        onClick={() => removeItem(i)}
                        className="w-8 h-8 rounded-full hover:bg-destructive/10 text-destructive flex items-center justify-center"
                        aria-label={`Supprimer ${it.name}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground italic bg-muted/50 rounded-lg p-3">
                  Aucun aliment — ajoutez-les manuellement ci-dessous.
                </p>
              )}

              <div className="flex gap-2">
                <Input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Aliment (ex: poulet grillé)"
                  className="flex-1 h-11"
                />
                <Input
                  type="number"
                  min={1}
                  value={newGrams}
                  onChange={(e) => setNewGrams(e.target.value)}
                  placeholder="g"
                  className="w-20 h-11"
                />
                <button
                  onClick={addItem}
                  className="w-11 h-11 rounded-lg bg-muted hover:bg-muted/70 flex items-center justify-center"
                  aria-label="Ajouter"
                >
                  <Plus className="w-5 h-5" />
                </button>
              </div>

              <button
                onClick={askConfirm}
                disabled={items.length === 0}
                className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground rounded-xl px-4 py-3 font-medium shadow-md hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Check className="w-5 h-5" />
                Valider la liste
              </button>
            </div>
          )}

          {step === "confirm" && (
            <div className="space-y-4">
              <p className="text-sm text-foreground">
                Souhaitez-vous ajouter ce repas à votre journal alimentaire ?
              </p>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Type de repas</label>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(MEAL_LABELS).map(([val, label]) => (
                    <button
                      key={val}
                      onClick={() => setMealType(val)}
                      className={`px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
                        mealType === val
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-card border-border hover:bg-muted text-foreground"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="bg-muted/50 rounded-lg p-3 text-xs text-muted-foreground max-h-40 overflow-y-auto">
                <p className="font-medium text-foreground mb-1">{items.length} aliment(s) :</p>
                <ul className="space-y-0.5">
                  {items.map((it, i) => (
                    <li key={i}>• {it.name} — {it.grams} g</li>
                  ))}
                </ul>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setStep("review")}
                  className="flex-1 px-4 py-3 rounded-xl bg-muted text-foreground font-medium hover:bg-muted/80"
                >
                  Non, annuler
                </button>
                <button
                  onClick={saveToJournal}
                  className="flex-1 px-4 py-3 rounded-xl bg-primary text-primary-foreground font-medium shadow-md hover:bg-primary/90"
                >
                  Oui, ajouter
                </button>
              </div>
            </div>
          )}

          {step === "saving" && (
            <div className="flex items-center justify-center gap-2 py-8 text-pink-deep">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="text-sm font-medium">Enregistrement…</span>
            </div>
          )}

          {step === "done" && summary && (
            <div className="space-y-4 text-center py-4">
              <div className="w-14 h-14 rounded-full bg-green-100 text-green-700 flex items-center justify-center mx-auto">
                <Check className="w-7 h-7" />
              </div>
              <div>
                <p className="text-base font-semibold text-foreground">Repas ajouté au journal !</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {summary.count} aliment{summary.count > 1 ? "s" : ""} • {summary.calories} kcal
                </p>
              </div>
              <button
                onClick={handleClose}
                className="w-full px-4 py-3 rounded-xl bg-primary text-primary-foreground font-medium hover:bg-primary/90"
              >
                Fermer
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
