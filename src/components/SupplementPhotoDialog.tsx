import { useRef, useState } from "react";
import { Camera, Image as ImageIcon, X, Plus, Loader2, Trash2, Pencil } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import {
  NUTRIENT_KEY_LABELS,
  nutrientLabel,
  useSupplements,
  DOSE_UNITS,
  doseUnitNeedsWeight,
} from "@/hooks/useSupplements";


const MAX_DIM = 1400;
const JPEG_QUALITY = 0.82;

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

type Row = {
  nutrient_key: string;
  label: string;
  amount: string;
  unit: string;
  source: "etiquette" | "converti_ar" | "manuel";
};

type Step = "capture" | "analyzing" | "review";

const UNITS = ["mg", "µg", "g", "ml"];

export default function SupplementPhotoDialog({
  open,
  onClose,
  dateStr,
}: {
  open: boolean;
  onClose: () => void;
  dateStr: string;
}) {
  const { addSupplement } = useSupplements(dateStr);
  const [step, setStep] = useState<Step>("capture");
  const [nom, setNom] = useState("");
  const [marque, setMarque] = useState("");
  const [dose, setDose] = useState("");
  const [doseUnit, setDoseUnit] = useState("");
  const [poidsDose, setPoidsDose] = useState("");
  const [quotidien, setQuotidien] = useState(true);


  const [rows, setRows] = useState<Row[]>([]);
  const [ignored, setIgnored] = useState<{ label: string; amount: number | null; unit: string | null }[]>([]);
  const [newKey, setNewKey] = useState("");
  const [newAmount, setNewAmount] = useState("");
  const [newUnit, setNewUnit] = useState("mg");
  const [saving, setSaving] = useState(false);
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);

  if (!open) return null;

  const reset = () => {
    setStep("capture");
    setNom(""); setMarque(""); setDose(""); setDoseUnit(""); setPoidsDose("");
    setQuotidien(true); setRows([]); setIgnored([]);

    setNewKey(""); setNewAmount(""); setNewUnit("mg"); setSaving(false);
  };
  const close = () => { reset(); onClose(); };

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) return toast.error("Merci de sélectionner une image.");
    if (file.size > 15 * 1024 * 1024) return toast.error("Image trop lourde (max 15 Mo).");
    try {
      setStep("analyzing");
      const compressed = await fileToCompressedDataUrl(file);
      const { data, error } = await supabase.functions.invoke("analyze-supplement-label", {
        body: { image: compressed },
      });
      if (error) throw error;

      setNom(data?.product_name || "");
      setMarque(data?.brand || "");
      if (data?.daily_dose_count) setDose(String(data.daily_dose_count));
      const detectedUnit = String(data?.dose_unit || "").toLowerCase();
      setDoseUnit(DOSE_UNITS.some((u) => u.value === detectedUnit) ? detectedUnit : "");

      const nutrients = Array.isArray(data?.nutrients) ? data.nutrients : [];
      setRows(
        nutrients.map((n: any) => ({
          nutrient_key: n.nutrient_key,
          label: n.label || nutrientLabel(n.nutrient_key),
          amount: String(n.amount ?? ""),
          unit: n.unit || "mg",
          source: n.source === "converti_ar" ? "converti_ar" : "etiquette",
        })),
      );
      setIgnored([...(data?.other_ingredients || []), ...(data?.unrecognized || [])]);

      if (data?.issue === "blurry") toast.error("Photo floue : vérifiez chaque valeur avant d'enregistrer.");
      else if (data?.issue === "too_dark") toast.error("Photo trop sombre : saisissez les valeurs à la main.");
      else if (nutrients.length === 0) toast.error("Aucun nutriment lu. Ajoutez-les manuellement.");
      else toast.success(`${nutrients.length} nutriment(s) lus — vérifiez chaque ligne.`);
      setStep("review");
    } catch (e) {
      console.error(e);
      toast.error("Lecture impossible. Vous pouvez saisir le complément à la main.");
      setStep("review");
    }
  };

  const addRow = () => {
    if (!newKey) return toast.error("Choisissez un nutriment.");
    const a = Number(newAmount.replace(",", "."));
    if (!isFinite(a) || a <= 0) return toast.error("Quantité invalide.");
    setRows((p) => [...p, { nutrient_key: newKey, label: nutrientLabel(newKey), amount: String(a), unit: newUnit, source: "manuel" }]);
    setNewKey(""); setNewAmount("");
  };

  const save = async () => {
    if (!nom.trim()) return toast.error("Le nom du produit est requis.");
    const doseNum = Number(String(dose).replace(",", "."));
    if (!isFinite(doseNum) || doseNum <= 0) return toast.error("Indiquez la dose par jour.");
    if (!doseUnit) return toast.error("Choisissez l'unité de la dose.");
    const poidsNum = Number(String(poidsDose).replace(",", "."));
    if (doseUnitNeedsWeight(doseUnit) && (!isFinite(poidsNum) || poidsNum <= 0))
      return toast.error(`Indiquez le poids d'une ${doseUnit} en grammes : sans lui, aucun calcul n'est possible.`);
    const nutrients = rows
      .map((r) => ({ nutrient_key: r.nutrient_key, amount: Number(String(r.amount).replace(",", ".")), unit: r.unit }))
      .filter((n) => n.nutrient_key && isFinite(n.amount) && n.amount > 0);
    if (nutrients.length === 0) return toast.error("Ajoutez au moins un nutriment.");
    setSaving(true);
    try {
      await addSupplement.mutateAsync({
        nom: nom.trim(),
        marque: marque.trim() || null,
        dose_par_prise: doseNum,
        unite_dose: doseUnit,
        poids_dose_g: doseUnitNeedsWeight(doseUnit) ? poidsNum : null,
        quotidien,
        nutrients,
      });
      close();
    } finally {
      setSaving(false);
    }
  };


  return (
    <div className="fixed inset-0 z-[60] bg-black/60 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-background w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl max-h-[92vh] overflow-y-auto shadow-xl pb-[calc(96px+env(safe-area-inset-bottom))] sm:pb-0">
        <div className="sticky top-0 bg-background border-b border-border px-4 py-3 flex items-center justify-between z-10">
          <h2 className="text-base font-bold text-foreground">💊 Photo de mon complément</h2>
          <button onClick={close} className="w-9 h-9 rounded-full hover:bg-muted flex items-center justify-center" aria-label="Fermer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {step === "capture" && (
            <>
              <p className="text-sm text-muted-foreground">
                Photographiez le tableau nutritionnel au dos de la boîte. Toutes les valeurs lues vous seront présentées, modifiables, avant enregistrement.
              </p>
              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => cameraRef.current?.click()} className="flex flex-col items-center gap-2 p-5 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 min-h-[120px] justify-center shadow-md">
                  <Camera className="w-8 h-8" /><span className="text-sm font-medium">Prendre une photo</span>
                </button>
                <button onClick={() => galleryRef.current?.click()} className="flex flex-col items-center gap-2 p-5 rounded-xl bg-muted hover:bg-muted/70 min-h-[120px] justify-center">
                  <ImageIcon className="w-8 h-8" /><span className="text-sm font-medium">Importer une image</span>
                </button>
              </div>
              <button onClick={() => setStep("review")} className="w-full text-sm text-muted-foreground underline py-2">
                Saisir à la main plutôt
              </button>
              <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => handleFile(e.target.files?.[0])} />
              <input ref={galleryRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleFile(e.target.files?.[0])} />
            </>
          )}

          {step === "analyzing" && (
            <div className="py-12 flex flex-col items-center gap-3 text-muted-foreground">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-sm">Lecture de l'étiquette…</p>
            </div>
          )}

          {step === "review" && (
            <>
              <div className="rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 p-3 text-xs text-amber-900 dark:text-amber-200">
                Vérifiez chaque ligne : un dosage erroné fausserait ensuite vos couvertures et vos alertes de dépassement.
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">Nom du produit</label>
                <Input value={nom} onChange={(e) => setNom(e.target.value)} placeholder="Ex : Ménoliance SP" />
                <label className="text-xs font-medium text-muted-foreground">Marque</label>
                <Input value={marque} onChange={(e) => setMarque(e.target.value)} placeholder="Ex : Physiomance" />
                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className="text-xs font-medium text-muted-foreground">Dose / jour *</label>
                    <Input value={dose} onChange={(e) => setDose(e.target.value)} inputMode="decimal" placeholder="2" />
                  </div>
                  <div className="flex-1">
                    <label className="text-xs font-medium text-muted-foreground">Unité *</label>
                    <select
                      value={doseUnit}
                      onChange={(e) => setDoseUnit(e.target.value)}
                      className="w-full h-10 rounded-md border border-input bg-background text-sm px-2"
                    >
                      <option value="">Choisir…</option>
                      {DOSE_UNITS.map((u) => <option key={u.value} value={u.value}>{u.label}</option>)}
                    </select>
                  </div>
                </div>
                {doseUnitNeedsWeight(doseUnit) && (
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">
                      Poids d'une {doseUnit} en grammes *
                    </label>
                    <Input value={poidsDose} onChange={(e) => setPoidsDose(e.target.value)} inputMode="decimal" placeholder="Ex : 5" />
                    <p className="text-[11px] text-muted-foreground mt-1">
                      Indiqué sur l'emballage. Sans ce poids, aucun calcul n'est possible.
                    </p>
                  </div>
                )}

                <label className="flex items-center gap-2 text-sm pt-1">
                  <input type="checkbox" checked={quotidien} onChange={(e) => setQuotidien(e.target.checked)} className="w-4 h-4" />
                  Je le prends tous les jours (pré-coché chaque jour)
                </label>
              </div>

              <div>
                <h3 className="text-sm font-semibold mb-2">Composition ({rows.length})</h3>
                <div className="space-y-2">
                  {rows.map((r, i) => (
                    <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
                      <div className="flex-1 min-w-0">
                        <select
                          value={r.nutrient_key}
                          onChange={(e) => setRows((p) => p.map((x, j) => (j === i ? { ...x, nutrient_key: e.target.value } : x)))}
                          className="w-full bg-transparent text-sm font-medium outline-none"
                        >
                          {Object.keys(NUTRIENT_KEY_LABELS).map((k) => (
                            <option key={k} value={k}>{NUTRIENT_KEY_LABELS[k]}</option>
                          ))}
                        </select>
                        <p className="text-[11px] text-muted-foreground truncate">
                          {r.label}
                          {r.source === "converti_ar" && " · converti depuis le % AR"}
                          {r.source === "manuel" && " · saisie manuelle"}
                        </p>
                      </div>
                      <Input
                        value={r.amount}
                        inputMode="decimal"
                        onChange={(e) => setRows((p) => p.map((x, j) => (j === i ? { ...x, amount: e.target.value } : x)))}
                        className="w-20 h-9"
                      />
                      <select
                        value={r.unit}
                        onChange={(e) => setRows((p) => p.map((x, j) => (j === i ? { ...x, unit: e.target.value } : x)))}
                        className="h-9 rounded-md border border-input bg-background text-sm px-1"
                      >
                        {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
                      </select>
                      <button onClick={() => setRows((p) => p.filter((_, j) => j !== i))} className="p-1 text-muted-foreground hover:text-destructive" aria-label="Supprimer">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  {rows.length === 0 && <p className="text-sm text-muted-foreground">Aucun nutriment pour l'instant.</p>}
                </div>

                <div className="flex items-center gap-2 mt-3">
                  <select value={newKey} onChange={(e) => setNewKey(e.target.value)} className="flex-1 h-9 rounded-md border border-input bg-background text-sm px-2">
                    <option value="">Ajouter un nutriment…</option>
                    {Object.keys(NUTRIENT_KEY_LABELS).map((k) => (
                      <option key={k} value={k}>{NUTRIENT_KEY_LABELS[k]}</option>
                    ))}
                  </select>
                  <Input value={newAmount} onChange={(e) => setNewAmount(e.target.value)} inputMode="decimal" placeholder="0" className="w-20 h-9" />
                  <select value={newUnit} onChange={(e) => setNewUnit(e.target.value)} className="h-9 rounded-md border border-input bg-background text-sm px-1">
                    {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
                  </select>
                  <button onClick={addRow} className="p-2 rounded-md bg-primary text-primary-foreground" aria-label="Ajouter">
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {ignored.length > 0 && (
                <div className="text-xs text-muted-foreground">
                  <p className="font-medium mb-1">Non comptabilisé (information) :</p>
                  <p>{ignored.map((o) => `${o.label}${o.amount ? ` ${o.amount}${o.unit || ""}` : ""}`).join(" · ")}</p>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <button onClick={() => setStep("capture")} className="flex-1 py-3 rounded-xl bg-muted text-sm font-medium">
                  <Pencil className="w-4 h-4 inline mr-1" /> Reprendre la photo
                </button>
                <button onClick={save} disabled={saving} className="flex-1 py-3 rounded-xl bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-60">
                  {saving ? "Enregistrement…" : "Confirmer et enregistrer"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
