import { useRef, useState } from "react";
import { Camera, Image as ImageIcon, X, Plus, Loader2, Check, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";

interface FridgePhotoDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (foods: string[]) => void;
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

export default function FridgePhotoDialog({ open, onClose, onConfirm }: FridgePhotoDialogProps) {
  const [preview, setPreview] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [foods, setFoods] = useState<string[] | null>(null);
  const [newFood, setNewFood] = useState("");
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  if (!open) return null;

  const reset = () => {
    setPreview(null);
    setFoods(null);
    setNewFood("");
    setAnalyzing(false);
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
      setAnalyzing(true);
      const compressed = await fileToCompressedDataUrl(file);
      setPreview(compressed);

      const { data, error } = await supabase.functions.invoke("analyze-fridge-photo", {
        body: { image: compressed },
      });
      if (error) throw error;

      if (data?.issue === "blurry") {
        toast.error("La photo semble floue. Reprenez-la avec plus de lumière et de netteté.");
        setFoods([]);
      } else if (data?.issue === "too_dark") {
        toast.error("La photo est trop sombre pour être analysée. Réessayez avec plus de lumière.");
        setFoods([]);
      } else if (data?.issue === "no_food" || !Array.isArray(data?.foods) || data.foods.length === 0) {
        toast.error("Aucun aliment détecté sur la photo. Vérifiez le cadrage ou ajoutez-les manuellement.");
        setFoods([]);
      } else {
        setFoods(data.foods);
        toast.success(`${data.foods.length} aliment(s) détecté(s) — vérifiez la liste.`);
      }
    } catch (e) {
      console.error("analyze-fridge-photo error", e);
      toast.error("Analyse impossible. Réessayez dans un instant.");
      setFoods([]);
    } finally {
      setAnalyzing(false);
    }
  };

  const removeFood = (idx: number) => {
    setFoods((prev) => (prev ? prev.filter((_, i) => i !== idx) : prev));
  };

  const addFood = () => {
    const v = newFood.trim();
    if (!v) return;
    setFoods((prev) => [...(prev || []), v]);
    setNewFood("");
  };

  const confirm = () => {
    const list = (foods || []).map((f) => f.trim()).filter(Boolean);
    if (list.length === 0) {
      toast.error("Ajoutez au moins un aliment avant de valider.");
      return;
    }
    onConfirm(list);
    reset();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] bg-black/60 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-background w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl max-h-[92vh] overflow-y-auto shadow-xl pb-[calc(96px+env(safe-area-inset-bottom))] sm:pb-0">
        <div className="sticky top-0 bg-background border-b border-border px-4 py-3 flex items-center justify-between">
          <h2 className="text-base font-bold text-foreground">📸 Photo de votre frigo / placard</h2>
          <button
            onClick={handleClose}
            className="w-9 h-9 rounded-full hover:bg-muted flex items-center justify-center"
            aria-label="Fermer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {!preview && !analyzing && (
            <>
              <p className="text-sm text-muted-foreground">
                Prenez ou importez une photo de vos aliments : Sophie identifiera ce que vous avez sous la main pour vous proposer un menu adapté à vos calories restantes et à votre objectif du jour.
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
                💡 Astuce : cadrez l'ensemble avec de la lumière, ouvrez le frigo ou étalez les aliments pour une meilleure détection.
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

          {preview && (
            <div className="rounded-xl overflow-hidden border border-border bg-muted">
              <img src={preview} alt="Aperçu" className="w-full max-h-56 object-cover" />
            </div>
          )}

          {analyzing && (
            <div className="flex items-center justify-center gap-2 py-8 text-pink-deep">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="text-sm font-medium">Analyse de la photo…</span>
            </div>
          )}

          {foods !== null && !analyzing && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-foreground">
                  Aliments détectés {foods.length > 0 && <span className="text-muted-foreground font-normal">({foods.length})</span>}
                </h3>
                <button
                  onClick={() => {
                    setPreview(null);
                    setFoods(null);
                    cameraInputRef.current && (cameraInputRef.current.value = "");
                    galleryInputRef.current && (galleryInputRef.current.value = "");
                  }}
                  className="text-xs text-pink-deep underline"
                >
                  Reprendre une photo
                </button>
              </div>
              <p className="text-xs text-muted-foreground">
                Supprimez ce qui n'est pas correct, ajoutez ce qui manque, puis validez.
              </p>

              {foods.length > 0 ? (
                <ul className="space-y-2">
                  {foods.map((f, i) => (
                    <li
                      key={`${f}-${i}`}
                      className="flex items-center justify-between gap-2 bg-card border border-border rounded-lg px-3 py-2"
                    >
                      <span className="text-sm text-foreground flex-1">{f}</span>
                      <button
                        onClick={() => removeFood(i)}
                        className="w-8 h-8 rounded-full hover:bg-destructive/10 text-destructive flex items-center justify-center"
                        aria-label={`Supprimer ${f}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground italic bg-muted/50 rounded-lg p-3">
                  Aucun aliment détecté — ajoutez-les manuellement ci-dessous.
                </p>
              )}

              <div className="flex gap-2">
                <Input
                  value={newFood}
                  onChange={(e) => setNewFood(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addFood();
                    }
                  }}
                  placeholder="Ajouter un aliment (ex: tomates)"
                  className="flex-1 h-11"
                />
                <button
                  onClick={addFood}
                  disabled={!newFood.trim()}
                  className="w-11 h-11 rounded-lg bg-muted hover:bg-muted/70 flex items-center justify-center disabled:opacity-40"
                  aria-label="Ajouter"
                >
                  <Plus className="w-5 h-5" />
                </button>
              </div>

              <button
                onClick={confirm}
                disabled={foods.length === 0}
                className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground rounded-xl px-4 py-3 font-medium shadow-md hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Check className="w-5 h-5" />
                Valider et demander un menu à Sophie
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
