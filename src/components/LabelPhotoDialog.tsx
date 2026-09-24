import { useRef, useState } from "react";
import { Camera, Image as ImageIcon, X, Plus, Loader2, Trash2, Pencil } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { useQueryClient } from "@tanstack/react-query";
import { useFavoriteMeals } from "@/hooks/useFavoriteMeals";
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

type Source = "etiquette" | "converti_ar" | "manuel" | "estime" | "calcule" | "fiche" | "ingredients";

const SOURCE_LABEL: Record<Source, string> = {
  etiquette: "lu sur l'étiquette",
  converti_ar: "converti depuis le % AR",
  calcule: "calculé depuis l'étiquette",
  estime: "estimé depuis les ingrédients",
  fiche: "lu sur la fiche",
  ingredients: "calculé depuis les ingrédients",
  manuel: "saisie manuelle",
};

type Row = {
  key: string;
  label: string;
  amount: string;
  unit: string;
  source: Source;
};

type Step = "capture" | "analyzing" | "review";

const UNITS = ["mg", "µg", "g", "ml"];

const MEAL_TYPES = [
  { value: "petit-dejeuner", label: "🌅 Petit-déjeuner" },
  { value: "dejeuner", label: "🍽️ Déjeuner" },
  { value: "diner", label: "🌙 Dîner" },
  { value: "collation", label: "☕ Collation" },
];

// Champs mesurés du tableau nutritionnel (par portion)
const MACRO_FIELDS: { key: string; label: string; unit: string; col: string }[] = [
  { key: "calories", label: "Calories", unit: "kcal", col: "calories" },
  { key: "proteins", label: "Protéines", unit: "g", col: "proteins" },
  { key: "carbs", label: "Glucides", unit: "g", col: "carbs" },
  { key: "sugars", label: "dont sucres", unit: "g", col: "sucres" },
  { key: "fats", label: "Lipides", unit: "g", col: "fats" },
  { key: "saturated_fats", label: "dont saturés", unit: "g", col: "acides_gras_satures" },
  { key: "fibres", label: "Fibres", unit: "g", col: "fibres" },
  { key: "salt", label: "Sel", unit: "g", col: "sel" },
  { key: "sodium", label: "Sodium (sel ÷ 2,54)", unit: "g", col: "sodium" },
];

// Micronutriments estimés depuis la liste d'ingrédients
const MICRO_FIELDS: { key: string; label: string; unit: string; col: string }[] = [
  { key: "calcium", label: "Calcium", unit: "mg", col: "calcium" },
  { key: "magnesium", label: "Magnésium", unit: "mg", col: "magnesium" },
  { key: "iron", label: "Fer", unit: "mg", col: "iron" },
  { key: "zinc", label: "Zinc", unit: "mg", col: "zinc" },
  { key: "potassium", label: "Potassium", unit: "mg", col: "potassium" },
  { key: "vitamin_d", label: "Vitamine D", unit: "µg", col: "vitamin_d" },
  { key: "vitamin_b12", label: "Vitamine B12", unit: "µg", col: "vitamin_b12" },
  { key: "vitamin_b6", label: "Vitamine B6", unit: "mg", col: "vitamin_b6" },
  { key: "vitamin_b9", label: "Vitamine B9", unit: "µg", col: "vitamin_b9" },
  { key: "vitamin_k", label: "Vitamine K", unit: "µg", col: "vitamin_k" },
  { key: "vitamin_e", label: "Vitamine E", unit: "mg", col: "vitamin_e" },
  { key: "omega3", label: "Oméga-3", unit: "g", col: "omega3" },
  { key: "phytoestrogens", label: "Phytoestrogènes", unit: "mg", col: "phytoestrogens" },
];

const numOrNull = (s: string): number | null => {
  const n = Number(String(s).replace(",", "."));
  return s.trim() === "" || !isFinite(n) || n < 0 ? null : n;
};

export default function LabelPhotoDialog({
  open,
  onClose,
  dateStr,
  mode,
  defaultMealType = "dejeuner",
}: {
  open: boolean;
  onClose: () => void;
  dateStr: string;
  mode: "supplement" | "product" | "recipe";
  defaultMealType?: string;
}) {
  const isSupplement = mode === "supplement";
  const isRecipe = mode === "recipe";
  const { addSupplement } = useSupplements(dateStr);
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { saveFavorite } = useFavoriteMeals();

  const [step, setStep] = useState<Step>("capture");
  const [nom, setNom] = useState("");
  const [marque, setMarque] = useState("");
  // complément
  const [dose, setDose] = useState("");
  const [doseUnit, setDoseUnit] = useState("");
  const [poidsDose, setPoidsDose] = useState("");
  const [quotidien, setQuotidien] = useState(true);
  // plat préparé
  const [portion, setPortion] = useState("");
  const [mealType, setMealType] = useState(defaultMealType);
  const [coverage, setCoverage] = useState<number | null>(null);
  const [productIngredients, setProductIngredients] = useState<{ name: string; percent: number | null }[] | null>(null);
  const [macros, setMacros] = useState<Row[]>([]);
  const [micros, setMicros] = useState<Row[]>([]);
  // fiche recette
  const [servings, setServings] = useState("2");
  const [portionsEaten, setPortionsEaten] = useState("1");
  const [addedFat, setAddedFat] = useState("");
  const [asFavorite, setAsFavorite] = useState(false);
  const [manualIngredients, setManualIngredients] = useState<
    { name: string; quantity: number | null; unit: string | null; reason: string }[]
  >([]);

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
    setPortion(""); setMealType(defaultMealType); setCoverage(null);
    setMacros([]); setMicros([]);
    setServings("2"); setPortionsEaten("1"); setAddedFat(""); setAsFavorite(false);
    setManualIngredients([]);
    setNewKey(""); setNewAmount(""); setNewUnit("mg"); setSaving(false);
  };
  const close = () => { reset(); onClose(); };

  const blankProductRows = () => {
    setMacros(MACRO_FIELDS.map((f) => ({ key: f.key, label: f.label, amount: "", unit: f.unit, source: "manuel" as Source })));
    setMicros(MICRO_FIELDS.map((f) => ({ key: f.key, label: f.label, amount: "", unit: f.unit, source: "manuel" as Source })));
  };

  const goManual = () => {
    if (!isSupplement && macros.length === 0) blankProductRows();
    setStep("review");
  };

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) return toast.error("Merci de sélectionner une image.");
    if (file.size > 15 * 1024 * 1024) return toast.error("Image trop lourde (max 15 Mo).");
    try {
      setStep("analyzing");
      const compressed = await fileToCompressedDataUrl(file);
      const fn = isSupplement
        ? "analyze-supplement-label"
        : isRecipe
          ? "analyze-recipe-card"
          : "analyze-product-label";
      const { data, error } = await supabase.functions.invoke(fn, { body: { image: compressed } });
      if (error) throw error;

      setNom(data?.product_name || data?.recipe_name || "");
      setMarque(data?.brand || "");

      if (isSupplement) {
        if (data?.daily_dose_count) setDose(String(data.daily_dose_count));
        const detectedUnit = String(data?.dose_unit || "").toLowerCase();
        setDoseUnit(DOSE_UNITS.some((u) => u.value === detectedUnit) ? detectedUnit : "");
        const nutrients = Array.isArray(data?.nutrients) ? data.nutrients : [];
        setRows(
          nutrients.map((n: any) => ({
            key: n.nutrient_key,
            label: n.label || nutrientLabel(n.nutrient_key),
            amount: String(n.amount ?? ""),
            unit: n.unit || "mg",
            source: (n.source === "converti_ar" ? "converti_ar" : "etiquette") as Source,
          })),
        );
        setIgnored([...(data?.other_ingredients || []), ...(data?.unrecognized || [])]);
        if (data?.issue === "blurry") toast.error("Photo floue : vérifiez chaque valeur avant d'enregistrer.");
        else if (data?.issue === "too_dark") toast.error("Photo trop sombre : saisissez les valeurs à la main.");
        else if (nutrients.length === 0) toast.error("Aucun nutriment lu. Ajoutez-les manuellement.");
        else toast.success(`${nutrients.length} nutriment(s) lus — vérifiez chaque ligne.`);
      } else if (isRecipe) {
        const mp = data?.macros_per_portion || {};
        const mi = data?.micros_per_portion || {};
        const macroSrc = (data?.macros_source === "etiquette" ? "fiche" : "ingredients") as Source;
        setServings(String(data?.servings || 2));
        setPortionsEaten("1");
        setPortion(data?.portion_grams ? String(data.portion_grams) : "");
        setMacros(
          MACRO_FIELDS.map((f) => {
            const v = mp[f.key];
            return {
              key: f.key,
              label: f.label,
              amount: v === null || v === undefined ? "" : String(v),
              unit: f.unit,
              source: (f.key === "sodium" ? "calcule" : f.key === "sugars" || f.key === "saturated_fats" ? "fiche" : macroSrc) as Source,
            };
          }),
        );
        setMicros(
          MICRO_FIELDS.map((f) => {
            const v = mi[f.key];
            return {
              key: f.key,
              label: f.label,
              amount: v === null || v === undefined ? "" : String(v),
              unit: f.unit,
              source: "ingredients" as Source,
            };
          }),
        );
        setManualIngredients(Array.isArray(data?.needs_manual) ? data.needs_manual : []);
        setIgnored((data?.pantry_items || []).map((l: string) => ({ label: l, amount: null, unit: null })));
        if (data?.issue === "blurry") toast.error("Photo floue : vérifiez chaque valeur avant d'enregistrer.");
        else if (data?.issue === "too_dark") toast.error("Photo trop sombre : saisissez les valeurs à la main.");
        else toast.success(`Fiche lue (${data?.servings || 2} portions) — vérifiez chaque valeur.`);
      } else {
        const mp = data?.measured?.per_portion || {};
        const est = data?.estimated_micros?.per_portion || {};
        setPortion(data?.portion_weight_g ? String(data.portion_weight_g) : "");
        setCoverage(
          data?.estimated_micros?.coverage_percent !== undefined && data?.estimated_micros?.coverage_percent !== null
            ? Number(data.estimated_micros.coverage_percent)
            : null,
        );
        setMacros(
          MACRO_FIELDS.map((f) => {
            const v = mp[f.key];
            return {
              key: f.key,
              label: f.label,
              amount: v === null || v === undefined ? "" : String(v),
              unit: f.unit,
              source: (f.key === "sodium" ? "calcule" : "etiquette") as Source,
            };
          }),
        );
        setMicros(
          MICRO_FIELDS.map((f) => {
            const v = est[f.key];
            return {
              key: f.key,
              label: f.label,
              amount: v === null || v === undefined ? "" : String(v),
              unit: f.unit,
              source: "estime" as Source,
            };
          }),
        );
        const unmatched = data?.estimated_micros?.unmatched_ingredients || [];
        setProductIngredients(Array.isArray(data?.ingredients) ? data.ingredients : null);
        setIgnored(unmatched.map((l: string) => ({ label: l, amount: null, unit: null })));
        if (data?.issue === "blurry") toast.error("Photo floue : vérifiez chaque valeur avant d'enregistrer.");
        else if (data?.issue === "too_dark") toast.error("Photo trop sombre : saisissez les valeurs à la main.");
        else toast.success("Étiquette lue — vérifiez chaque valeur.");
      }
      setStep("review");
    } catch (e) {
      console.error(e);
      toast.error("Lecture impossible. Vous pouvez saisir les valeurs à la main.");
      if (!isSupplement) blankProductRows();
      setStep("review");
    }
  };

  const addRow = () => {
    if (!newKey) return toast.error("Choisissez un nutriment.");
    const a = Number(newAmount.replace(",", "."));
    if (!isFinite(a) || a <= 0) return toast.error("Quantité invalide.");
    setRows((p) => [...p, { key: newKey, label: nutrientLabel(newKey), amount: String(a), unit: newUnit, source: "manuel" }]);
    setNewKey(""); setNewAmount("");
  };

  const saveSupplement = async () => {
    if (!nom.trim()) return toast.error("Le nom du produit est requis.");
    const doseNum = Number(String(dose).replace(",", "."));
    if (!isFinite(doseNum) || doseNum <= 0) return toast.error("Indiquez la dose par jour.");
    if (!doseUnit) return toast.error("Choisissez l'unité de la dose.");
    const poidsNum = Number(String(poidsDose).replace(",", "."));
    if (doseUnitNeedsWeight(doseUnit) && (!isFinite(poidsNum) || poidsNum <= 0))
      return toast.error(`Indiquez le poids d'une ${doseUnit} en grammes : sans lui, aucun calcul n'est possible.`);
    const nutrients = rows
      .map((r) => ({ nutrient_key: r.key, amount: Number(String(r.amount).replace(",", ".")), unit: r.unit }))
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

  const saveProduct = async () => {
    if (!user) return toast.error("Connectez-vous pour enregistrer.");
    if (!nom.trim()) return toast.error("Le nom du plat est requis.");
    const portionNum = Number(String(portion).replace(",", "."));
    if (!isFinite(portionNum) || portionNum <= 0) return toast.error("Indiquez le poids de la portion en grammes.");

    const entry: Record<string, any> = {
      user_id: user.id,
      logged_at: dateStr,
      food_name: nom.trim(),
      brand: marque.trim() || null,
      meal_type: mealType,
      portion_size: portionNum,
      micros_estimes: true,
      micros_coverage_percent: coverage,
      ingredients: productIngredients,
    };
    for (const f of MACRO_FIELDS) {
      const row = macros.find((r) => r.key === f.key);
      entry[f.col] = row ? numOrNull(row.amount) : null;
    }
    for (const f of MICRO_FIELDS) {
      const row = micros.find((r) => r.key === f.key);
      entry[f.col] = row ? numOrNull(row.amount) : null;
    }
    if (entry.calories === null) return toast.error("Les calories sont requises : elles sont lues sur le tableau.");

    setSaving(true);
    try {
      const { error } = await supabase.from("food_logs").insert(entry as any);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["food_logs"] });
      queryClient.invalidateQueries({ queryKey: ["food_logs_week"] });
      toast.success("Plat ajouté à votre journal.");
      close();
    } catch (e) {
      console.error(e);
      toast.error("Enregistrement impossible.");
    } finally {
      setSaving(false);
    }
  };

  const saveRecipe = async () => {
    if (!user) return toast.error("Connectez-vous pour enregistrer.");
    if (!nom.trim()) return toast.error("Le nom de la recette est requis.");
    const mult = Number(portionsEaten) || 1;
    const fatG = numOrNull(addedFat) ?? 0;
    const portionNum = numOrNull(portion);

    const entry: Record<string, any> = {
      user_id: user.id,
      logged_at: dateStr,
      food_name: nom.trim(),
      brand: marque.trim() || null,
      meal_type: mealType,
      portion_size: portionNum === null ? null : Math.round(portionNum * mult + fatG),
      micros_estimes: true,
      micros_coverage_percent: null,
    };
    for (const f of MACRO_FIELDS) {
      const row = macros.find((r) => r.key === f.key);
      const v = row ? numOrNull(row.amount) : null;
      entry[f.col] = v === null ? null : Math.round(v * mult * 100) / 100;
    }
    for (const f of MICRO_FIELDS) {
      const row = micros.find((r) => r.key === f.key);
      const v = row ? numOrNull(row.amount) : null;
      entry[f.col] = v === null ? null : Math.round(v * mult * 1000) / 1000;
    }
    // Matières grasses ajoutées (huile) : saisie manuelle, jamais estimée
    if (fatG > 0) {
      entry.fats = Math.round(((entry.fats ?? 0) + fatG) * 100) / 100;
      entry.calories = Math.round(((entry.calories ?? 0) + fatG * 9) * 100) / 100;
    }
    if (entry.calories === null) return toast.error("Les calories sont requises : complétez la ligne Calories.");

    setSaving(true);
    try {
      const { error } = await supabase.from("food_logs").insert(entry as any);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["food_logs"] });
      queryClient.invalidateQueries({ queryKey: ["food_logs_week"] });

      if (asFavorite) {
        const { user_id, logged_at, meal_type, micros_coverage_percent, ...rest } = entry;
        await saveFavorite.mutateAsync({
          name: nom.trim(),
          meal_type: mealType,
          items: [{ ...rest, micros_estimes: true, micros_coverage_percent: null } as any],
        });
        toast.success("Recette ajoutée à votre journal et à vos favoris.");
      } else {
        toast.success("Recette ajoutée à votre journal.");
      }
      close();
    } catch (e) {
      console.error(e);
      toast.error("Enregistrement impossible.");
    } finally {
      setSaving(false);
    }
  };

  const updateList = (
    setter: React.Dispatch<React.SetStateAction<Row[]>>,
    i: number,
    value: string,
  ) => setter((p) => p.map((x, j) => (j === i ? { ...x, amount: value, source: "manuel" } : x)));

  const valueRow = (r: Row, i: number, setter: React.Dispatch<React.SetStateAction<Row[]>>) => (
    <div key={r.key} className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">{r.label}</p>
        <p className="text-[11px] text-muted-foreground truncate">{SOURCE_LABEL[r.source]}</p>
      </div>
      <Input
        value={r.amount}
        inputMode="decimal"
        placeholder="—"
        onChange={(e) => updateList(setter, i, e.target.value)}
        className="w-24 h-9"
      />
      <span className="text-xs text-muted-foreground w-10">{r.unit}</span>
    </div>
  );

  return (
    <div className="fixed inset-0 z-[60] bg-black/60 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-background w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl max-h-[92vh] overflow-y-auto shadow-xl pb-[calc(96px+env(safe-area-inset-bottom))] sm:pb-0">
        <div className="sticky top-0 bg-background border-b border-border px-4 py-3 flex items-center justify-between z-10">
          <h2 className="text-base font-bold text-foreground">
            {isSupplement ? "💊 Photo de mon complément" : isRecipe ? "📋 Photo de ma fiche recette" : "🥘 Photo de l'étiquette du plat"}
          </h2>
          <button onClick={close} className="w-9 h-9 rounded-full hover:bg-muted flex items-center justify-center" aria-label="Fermer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {step === "capture" && (
            <>
              <p className="text-sm text-muted-foreground">
                {isSupplement
                  ? "Photographiez le tableau nutritionnel au dos de la boîte. Toutes les valeurs lues vous seront présentées, modifiables, avant enregistrement."
                  : isRecipe
                    ? "Photographiez la fiche recette : le nom du plat, le nombre de portions et la liste des ingrédients avec leurs quantités. Tout est ramené à une portion, et vous pourrez ensuite dire combien vous en avez mangé."
                    : "Photographiez le dos de l'emballage : le tableau nutritionnel et la liste d'ingrédients. Les macros sont reprises telles quelles ; les micronutriments sont estimés depuis les ingrédients. Tout reste modifiable avant enregistrement."}
              </p>
              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => cameraRef.current?.click()} className="flex flex-col items-center gap-2 p-5 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 min-h-[120px] justify-center shadow-md">
                  <Camera className="w-8 h-8" /><span className="text-sm font-medium">Prendre une photo</span>
                </button>
                <button onClick={() => galleryRef.current?.click()} className="flex flex-col items-center gap-2 p-5 rounded-xl bg-muted hover:bg-muted/70 min-h-[120px] justify-center">
                  <ImageIcon className="w-8 h-8" /><span className="text-sm font-medium">Importer une image</span>
                </button>
              </div>
              <button onClick={goManual} className="w-full text-sm text-muted-foreground underline py-2">
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
                {isSupplement
                  ? "Vérifiez chaque ligne : un dosage erroné fausserait ensuite vos couvertures et vos alertes de dépassement."
                  : "Vérifiez chaque ligne. Les valeurs du tableau sont mesurées ; les micronutriments sont estimés depuis la liste d'ingrédients et restent approximatifs."}
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">
                  {isSupplement ? "Nom du produit" : isRecipe ? "Nom de la recette" : "Nom du plat"}
                </label>
                <Input value={nom} onChange={(e) => setNom(e.target.value)} placeholder={isSupplement ? "Ex : Ménoliance SP" : isRecipe ? "Ex : Curry de crevettes et lentilles corail" : "Ex : Crevettes à l'indienne, lentilles corail"} />
                <label className="text-xs font-medium text-muted-foreground">Marque</label>
                <Input value={marque} onChange={(e) => setMarque(e.target.value)} placeholder={isSupplement ? "Ex : Physiomance" : "Ex : Picard"} />

                {isSupplement ? (
                  <>
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
                  </>
                ) : (
                  <>
                    {isRecipe && (
                      <>
                        <label className="text-xs font-medium text-muted-foreground">
                          Portions de la recette (indiquées sur la fiche)
                        </label>
                        <Input value={servings} onChange={(e) => setServings(e.target.value)} inputMode="decimal" placeholder="2" />
                        <p className="text-[11px] text-muted-foreground">
                          Toutes les valeurs ci-dessous sont déjà données POUR UNE portion.
                        </p>
                        <div>
                          <label className="text-xs font-medium text-muted-foreground block mb-1">
                            Combien de portions avez-vous mangé ?
                          </label>
                          <div className="flex gap-1.5 flex-wrap">
                            {["0.5", "1", "1.5", "2"].map((p) => (
                              <button
                                key={p}
                                type="button"
                                onClick={() => setPortionsEaten(p)}
                                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${portionsEaten === p ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
                              >
                                {p === "0.5" ? "une demie" : p === "1" ? "une" : p === "1.5" ? "une et demie" : "deux"}
                              </button>
                            ))}
                          </div>
                        </div>
                      </>
                    )}
                    <label className="text-xs font-medium text-muted-foreground">
                      {isRecipe ? "Poids d'une portion (g)" : "Poids de la portion (g) *"}
                    </label>
                    <Input value={portion} onChange={(e) => setPortion(e.target.value)} inputMode="decimal" placeholder="Ex : 350" />
                    {isRecipe && (
                      <div>
                        <label className="text-xs font-medium text-muted-foreground">
                          Matières grasses ajoutées — huile, beurre (g)
                        </label>
                        <Input value={addedFat} onChange={(e) => setAddedFat(e.target.value)} inputMode="decimal" placeholder="Vide : à vous de le remplir" />
                        <p className="text-[11px] text-muted-foreground mt-1">
                          La fiche ne les chiffre pas et je ne les estime pas. 1 cuillère à soupe d'huile = 10 g, 1 cuillère à café = 5 g, 1 cuillère à soupe de beurre = 15 g.
                        </p>
                      </div>
                    )}
                    <div>
                      <label className="text-xs font-medium text-muted-foreground block mb-1">Repas</label>
                      <div className="flex gap-1.5 flex-wrap">
                        {MEAL_TYPES.map((m) => (
                          <button
                            key={m.value}
                            onClick={() => setMealType(m.value)}
                            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${mealType === m.value ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
                          >
                            {m.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>

              {isSupplement ? (
                <div>
                  <h3 className="text-sm font-semibold mb-2">Composition ({rows.length})</h3>
                  <div className="space-y-2">
                    {rows.map((r, i) => (
                      <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
                        <div className="flex-1 min-w-0">
                          <select
                            value={r.key}
                            onChange={(e) => setRows((p) => p.map((x, j) => (j === i ? { ...x, key: e.target.value } : x)))}
                            className="w-full bg-transparent text-sm font-medium outline-none"
                          >
                            {Object.keys(NUTRIENT_KEY_LABELS).map((k) => (
                              <option key={k} value={k}>{NUTRIENT_KEY_LABELS[k]}</option>
                            ))}
                          </select>
                          <p className="text-[11px] text-muted-foreground truncate">
                            {r.label} · {SOURCE_LABEL[r.source]}
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
              ) : (
                <>
                  <div>
                    <h3 className="text-sm font-semibold mb-2">Tableau nutritionnel — valeurs mesurées (par portion)</h3>
                    <div className="space-y-2">
                      {macros.map((r, i) => valueRow(r, i, setMacros))}
                    </div>
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold mb-1">Micronutriments — estimés depuis les ingrédients</h3>
                    <p className="text-[11px] text-muted-foreground mb-2">
                      {coverage !== null
                        ? `Les pourcentages d'ingrédients couvrent environ ${coverage} % du plat. Le reste est inconnu : les valeurs vides le restent, elles ne valent pas zéro.`
                        : "Une valeur vide reste inconnue : elle ne vaut pas zéro."}
                    </p>
                    <div className="space-y-2">
                      {micros.map((r, i) => valueRow(r, i, setMicros))}
                    </div>
                  </div>
                </>
              )}

              {ignored.length > 0 && (
                <div className="text-xs text-muted-foreground">
                  <p className="font-medium mb-1">
                    {isSupplement
                      ? "Non comptabilisé (information) :"
                      : isRecipe
                        ? "Ingrédients non estimés (information) :"
                        : `${ignored.length} ingrédient${ignored.length > 1 ? "s" : ""} non reconnu${ignored.length > 1 ? "s" : ""} (non comptés dans les micronutriments) :`}
                  </p>
                  <p>{ignored.map((o) => `${o.label}${o.amount ? ` ${o.amount}${o.unit || ""}` : ""}`).join(" · ")}</p>
                </div>
              )}

              {isRecipe && manualIngredients.length > 0 && (
                <div className="rounded-lg border border-border p-3 text-xs">
                  <p className="font-medium mb-1 text-foreground">Ingrédients non comptés — à saisir à la main</p>
                  <p className="text-muted-foreground mb-2">
                    Leur poids n'est pas connu : ils ne sont PAS inclus dans les valeurs ci-dessus. Ajoutez-les
                    séparément depuis « Ajouter un aliment » si vous voulez les compter.
                  </p>
                  <ul className="space-y-1 text-muted-foreground">
                    {manualIngredients.map((m, i) => (
                      <li key={i}>
                        • {m.name}
                        {m.quantity !== null ? ` — ${m.quantity} ${m.unit || ""}` : ""} ({m.reason})
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {isRecipe && (
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={asFavorite} onChange={(e) => setAsFavorite(e.target.checked)} className="w-4 h-4" />
                  Enregistrer aussi cette recette dans mes favoris
                </label>
              )}



              <div className="flex gap-2 pt-2">
                <button onClick={() => setStep("capture")} className="flex-1 py-3 rounded-xl bg-muted text-sm font-medium">
                  <Pencil className="w-4 h-4 inline mr-1" /> Reprendre la photo
                </button>
                <button
                  onClick={isSupplement ? saveSupplement : isRecipe ? saveRecipe : saveProduct}
                  disabled={saving}
                  className="flex-1 py-3 rounded-xl bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-60"
                >
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
