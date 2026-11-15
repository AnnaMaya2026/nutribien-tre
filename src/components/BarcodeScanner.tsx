import { useState, useEffect, useRef, useCallback } from "react";
import { X, ScanBarcode, Loader2, Plus, Minus, Keyboard } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { amountToNutritionGrams, formatStandardPortionHint, getDefaultPortion, getPortionStep, getPortionUnit } from "@/lib/portionUnits";
import { isIndustrialFood } from "@/lib/industrialFood";
import { estimatePhytoestrogensPer100g } from "@/lib/phytoestrogenEstimator";
import { findCiqualMatch } from "@/lib/ciqualMatcher";
import { scaleOrNull } from "@/lib/ciqual";
import { readOffMicros, fillMissingFromCiqual, OFF_MICRO_KEYS } from "@/lib/openFoodFacts";

const MEAL_TYPES = [
  { value: "petit-dejeuner", label: "🌅 Petit-déjeuner" },
  { value: "dejeuner", label: "☀️ Déjeuner" },
  { value: "diner", label: "🌙 Dîner" },
  { value: "collation", label: "🍎 Collation" },
];

interface ScannedProduct {
  name: string;
  brand: string;
  barcode: string;
  calories_100g: number;
  proteins_100g: number;
  carbs_100g: number;
  fats_100g: number;
  fiber_100g: number;
  /** Sel, sodium, sucres et graisses saturées de l'étiquette, en g pour 100 g ; null = non fourni. */
  salt_100g: number | null;
  sodium_100g: number | null;
  sugars_100g: number | null;
  saturated_fat_100g: number | null;
  calcium_100g: number | null;
  vitamin_d_100g: number | null;
  magnesium_100g: number | null;
  iron_100g: number | null;
  omega3_100g: number | null;
  vitamin_b12_100g: number | null;
  phytoestrogens_100g: number | null;
  potassium_100g: number | null;
  zinc_100g: number | null;
  vitamin_k_100g: number | null;
  vitamin_b6_100g: number | null;
  vitamin_b9_100g: number | null;
  vitamin_e_100g: number | null;
  microsAvailable: boolean;
  microsSource?: "openfoodfacts" | "ciqual" | "none";
  ciqualMatchName?: string;
}

interface BarcodeScannerProps {
  mealType: string;
  onAdd: (log: {
    food_name: string;
    portion_size: number;
    calories: number;
    proteins: number;
    carbs: number;
    fats: number;
    fibres: number;
    sel?: number | null;
    sodium?: number | null;
    sucres?: number | null;
    acides_gras_satures?: number | null;
    calcium: number | null;
    vitamin_d: number | null;
    magnesium: number | null;
    iron: number | null;
    omega3: number | null;
    phytoestrogens: number | null;
    vitamin_b12: number | null;
    potassium: number | null;
    zinc: number | null;
    vitamin_k: number | null;
    vitamin_b6: number | null;
    vitamin_b9: number | null;
    vitamin_e: number | null;
    meal_type: string;
  }) => void;
  isPending?: boolean;
}

function n(v: number | undefined | null): number | null {
  return v !== undefined && v !== null && isFinite(Number(v)) ? Number(v) : null;
}
const macro = (v: number | undefined | null): number => (v && isFinite(v) ? v : 0);

export default function BarcodeScanner({ mealType, onAdd, isPending }: BarcodeScannerProps) {
  const [showScanner, setShowScanner] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [loading, setLoading] = useState(false);
  const [product, setProduct] = useState<ScannedProduct | null>(null);
  const [grams, setGrams] = useState(100);
  const [selectedMeal, setSelectedMeal] = useState(mealType);
  const [manualMode, setManualMode] = useState(false);
  const [manualCode, setManualCode] = useState("");
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanningRef = useRef(false);

  const stopCamera = useCallback(() => {
    scanningRef.current = false;
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  const lookupBarcode = async (barcode: string) => {
    setLoading(true);
    try {
      const res = await fetch(`https://world.openfoodfacts.org/api/v2/product/${barcode}.json`);
      const data = await res.json();
      if (data.status !== 1 || !data.product) {
        toast.error("Produit non trouvé dans la base de données. Essaie la recherche manuelle.");
        setShowScanner(false);
        return;
      }
      const p = data.product;
      const nm = p.nutriments || {};
      const productName = p.product_name || p.product_name_fr || "Produit inconnu";

      // Open Food Facts donne tout en grammes : conversion en mg / µg dans readOffMicros.
      const micros = readOffMicros(nm);
      const fromOff = OFF_MICRO_KEYS.some((k) => micros[k] !== null);
      let phytoestrogens: number | null = null;
      let ciqualMatchName: string | undefined;
      let filledFromCiqual = 0;

      // Ce qu'Open Food Facts ne fournit pas est complété, nutriment par nutriment,
      // par la ligne CIQUAL la plus proche du nom du produit.
      if (OFF_MICRO_KEYS.some((k) => micros[k] === null)) {
        try {
          const match = await findCiqualMatch(productName);
          if (match) {
            filledFromCiqual = fillMissingFromCiqual(micros, match.food as any).length;
            phytoestrogens = match.food.phytoestrogenes_100mg ?? null;
            if (filledFromCiqual > 0) ciqualMatchName = match.food.nom;
          }
        } catch (err) {
          console.warn("CIQUAL match failed:", err);
        }
      }
      const microsAvailable = OFF_MICRO_KEYS.some((k) => micros[k] !== null);
      const microsSource: "openfoodfacts" | "ciqual" | "none" = filledFromCiqual > 0 ? "ciqual" : fromOff ? "openfoodfacts" : "none";
      const { calcium, vitamin_d, magnesium, iron, omega3, vitamin_b12, potassium, zinc, vitamin_k, vitamin_b6, vitamin_b9, vitamin_e } = micros;

      // Isoflavones estimées d'après le nom pour les produits à base de soja ; sinon inconnu (null).
      if (phytoestrogens == null) {
        phytoestrogens = estimatePhytoestrogensPer100g(productName);
      }

      setProduct({
        name: productName,
        brand: p.brands || "",
        barcode,
        calories_100g: n(nm["energy-kcal_100g"]),
        proteins_100g: n(nm.proteins_100g),
        carbs_100g: n(nm.carbohydrates_100g),
        fats_100g: n(nm.fat_100g),
        fiber_100g: n(nm.fiber_100g),
        // Open Food Facts donne ces quatre valeurs en grammes, comme les colonnes du journal.
        salt_100g: n(nm.salt_100g),
        sodium_100g: n(nm.sodium_100g) ?? (n(nm.salt_100g) !== null ? Math.round((n(nm.salt_100g)! / 2.54) * 1000) / 1000 : null),
        sugars_100g: n(nm.sugars_100g),
        saturated_fat_100g: n(nm["saturated-fat_100g"]),
        calcium_100g: calcium,
        vitamin_d_100g: vitamin_d,
        magnesium_100g: magnesium,
        iron_100g: iron,
        omega3_100g: omega3,
        vitamin_b12_100g: vitamin_b12,
        phytoestrogens_100g: phytoestrogens,
        potassium_100g: potassium,
        zinc_100g: zinc,
        vitamin_k_100g: vitamin_k,
        vitamin_b6_100g: vitamin_b6,
        vitamin_b9_100g: vitamin_b9,
        vitamin_e_100g: vitamin_e,
        microsAvailable: microsAvailable || (phytoestrogens ?? 0) > 0,
        microsSource,
        ciqualMatchName,
      });
      setGrams(getDefaultPortion(productName));
    } catch {
      toast.error("Erreur de connexion, réessaie");
      setShowScanner(false);
    } finally {
      setLoading(false);
    }
  };

  const startScanning = useCallback(async () => {
    if (!videoRef.current) return;
    setScanning(true);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "environment",
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });
      streamRef.current = stream;
      videoRef.current.srcObject = stream;
      await videoRef.current.play();

      // Dynamically import @zxing/browser
      const { BrowserMultiFormatReader } = await import("@zxing/browser");
      const codeReader = new BrowserMultiFormatReader();

      scanningRef.current = true;

      // Continuous decode loop
      const tryDecode = async () => {
        if (!scanningRef.current || !videoRef.current) return;
        try {
          const result = await codeReader.decodeOnceFromVideoDevice(undefined, videoRef.current);
          if (result) {
            const text = result.getText();
            stopCamera();
            setScanning(false);
            lookupBarcode(text);
            return;
          }
        } catch (err: any) {
          // NotFoundException is normal during scanning
          if (err?.name !== "NotFoundException" && scanningRef.current) {
          }
        }
        // If still scanning, the decodeOnce handles the loop internally
      };

      tryDecode();
    } catch (err: any) {
      console.error("Camera error:", err);
      setScanning(false);
      const msg = err?.toString() || "";
      if (msg.includes("NotAllowedError") || msg.includes("Permission")) {
        toast.error("Caméra non disponible sur cet appareil");
      } else {
        toast.error("Impossible d'accéder à la caméra");
      }
      setShowScanner(false);
    }
  }, [stopCamera]);

  useEffect(() => {
    if (showScanner && !product && !loading && !manualMode) {
      const timer = setTimeout(startScanning, 300);
      return () => {
        clearTimeout(timer);
        stopCamera();
      };
    }
    return () => {
      stopCamera();
    };
  }, [showScanner, product, loading, manualMode, startScanning, stopCamera]);

  const handleClose = () => {
    stopCamera();
    setShowScanner(false);
    setProduct(null);
    setScanning(false);
    setLoading(false);
    setGrams(100);
    setManualMode(false);
    setManualCode("");
  };

  const handleManualSubmit = () => {
    const code = manualCode.trim();
    if (!code || code.length < 8) {
      toast.error("Saisis un code-barres valide (8-13 chiffres)");
      return;
    }
    setManualMode(false);
    lookupBarcode(code);
  };

  const unit = product ? getPortionUnit(product.name) : "g";
  const step = product ? getPortionStep(product.name) : 10;
  const nutritionGrams = product ? amountToNutritionGrams(product.name, grams) : grams;
  const scaled = product
    ? {
        calories: Math.round((product.calories_100g * nutritionGrams) / 100),
        proteins: Math.round((product.proteins_100g * nutritionGrams) / 100),
        carbs: Math.round((product.carbs_100g * nutritionGrams) / 100),
        fats: Math.round((product.fats_100g * nutritionGrams) / 100),
        fibres: Math.round((product.fiber_100g * nutritionGrams) / 100),
        sel: scaleOrNull(product.salt_100g, nutritionGrams / 100, 2),
        sodium: scaleOrNull(product.sodium_100g, nutritionGrams / 100, 3),
        sucres: scaleOrNull(product.sugars_100g, nutritionGrams / 100, 1),
        acides_gras_satures: scaleOrNull(product.saturated_fat_100g, nutritionGrams / 100, 1),
        calcium: scaleOrNull(product.calcium_100g, nutritionGrams / 100),
        vitamin_d: scaleOrNull(product.vitamin_d_100g, nutritionGrams / 100, 1),
        magnesium: scaleOrNull(product.magnesium_100g, nutritionGrams / 100),
        iron: scaleOrNull(product.iron_100g, nutritionGrams / 100, 1),
        omega3: scaleOrNull(product.omega3_100g, nutritionGrams / 100, 1),
        vitamin_b12: scaleOrNull(product.vitamin_b12_100g, nutritionGrams / 100, 1),
        phytoestrogens: scaleOrNull(product.phytoestrogens_100g, nutritionGrams / 100, 1),
        potassium: scaleOrNull(product.potassium_100g, nutritionGrams / 100),
        zinc: scaleOrNull(product.zinc_100g, nutritionGrams / 100, 1),
        vitamin_k: scaleOrNull(product.vitamin_k_100g, nutritionGrams / 100, 1),
        vitamin_b6: scaleOrNull(product.vitamin_b6_100g, nutritionGrams / 100, 2),
        vitamin_b9: scaleOrNull(product.vitamin_b9_100g, nutritionGrams / 100),
        vitamin_e: scaleOrNull(product.vitamin_e_100g, nutritionGrams / 100, 1),
      }
    : null;

  const handleAdd = () => {
    if (!product || !scaled) return;
    onAdd({
      food_name: `${product.name}${product.brand ? ` (${product.brand})` : ""}${isIndustrialFood(product.name) ? " 📦" : ""}`,
      portion_size: grams,
      calories: scaled.calories,
      proteins: scaled.proteins,
      carbs: scaled.carbs,
      fats: scaled.fats,
      fibres: scaled.fibres,
      sel: scaled.sel,
      sodium: scaled.sodium,
      sucres: scaled.sucres,
      acides_gras_satures: scaled.acides_gras_satures,
      calcium: scaled.calcium,
      vitamin_d: scaled.vitamin_d,
      magnesium: scaled.magnesium,
      iron: scaled.iron,
      omega3: scaled.omega3,
      phytoestrogens: scaled.phytoestrogens,
      vitamin_b12: scaled.vitamin_b12,
      potassium: scaled.potassium,
      zinc: scaled.zinc,
      vitamin_k: scaled.vitamin_k,
      vitamin_b6: scaled.vitamin_b6,
      vitamin_b9: scaled.vitamin_b9,
      vitamin_e: scaled.vitamin_e,
      meal_type: selectedMeal,
    });
    toast.success("Produit ajouté au journal ✓");
    handleClose();
  };

  return (
    <>
      <button
        onClick={() => {
          setShowScanner(true);
          setProduct(null);
        }}
        className="w-12 h-12 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shadow-md"
        title="Scanner un code-barres"
      >
        <ScanBarcode className="w-5 h-5" />
      </button>

      {showScanner && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={handleClose}>
          <div
            className="bg-card rounded-2xl w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto animate-fade-in"
            style={{ paddingBottom: 80 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h3 className="font-semibold text-foreground text-sm">
                {product ? "Produit scanné" : manualMode ? "Saisie manuelle" : "Scanner un code-barres"}
              </h3>
              <button onClick={handleClose}>
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>

            {/* Scanner view */}
            {!product && !loading && !manualMode && (
              <div className="p-4">
                <div className="relative rounded-xl overflow-hidden bg-black">
                  <video ref={videoRef} className="w-full aspect-[4/3] object-cover" playsInline muted autoPlay />
                  {/* Scanning overlay */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-[250px] h-[120px] relative">
                      <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-primary rounded-tl" />
                      <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-primary rounded-tr" />
                      <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-primary rounded-bl" />
                      <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-primary rounded-br" />
                      <div className="absolute left-2 right-2 h-0.5 bg-red-500/80 animate-scan-line" />
                    </div>
                  </div>
                </div>
                {scanning && (
                  <p className="text-xs text-muted-foreground text-center mt-3 animate-pulse">
                    📷 Place le code-barres dans le cadre...
                  </p>
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    stopCamera();
                    setManualMode(true);
                  }}
                  className="flex items-center justify-center gap-1.5 text-xs text-pink-deep mt-3 mx-auto hover:underline"
                >
                  <Keyboard className="w-3.5 h-3.5" />
                  Saisir le code manuellement
                </button>
              </div>
            )}

            {/* Manual input */}
            {!product && !loading && manualMode && (
              <div className="p-4 space-y-3">
                <p className="text-xs text-muted-foreground">Entre le code-barres (8 à 13 chiffres) :</p>
                <Input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  placeholder="3017620422003"
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value.replace(/\D/g, ""))}
                  maxLength={13}
                  className="text-center text-lg tracking-widest"
                  autoFocus
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setManualMode(false);
                      setManualCode("");
                    }}
                    className="flex-1 py-2.5 rounded-xl bg-muted text-muted-foreground text-sm font-medium"
                  >
                    Retour au scanner
                  </button>
                  <button
                    onClick={handleManualSubmit}
                    disabled={manualCode.length < 8}
                    className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-50"
                  >
                    Rechercher
                  </button>
                </div>
              </div>
            )}

            {/* Loading */}
            {loading && (
              <div className="p-8 flex flex-col items-center gap-3">
                <Loader2 className="w-8 h-8 text-pink-deep animate-spin" />
                <p className="text-sm text-muted-foreground">Recherche du produit...</p>
              </div>
            )}

            {/* Product result */}
            {product && scaled && (
              <div className="p-4 space-y-4">
                <div>
                  <div className="flex items-start gap-2">
                    <div className="flex-1">
                      <h4 className="font-semibold text-foreground">{product.name}</h4>
                      {product.brand && <p className="text-xs text-muted-foreground">{product.brand}</p>}
                    </div>
                    {isIndustrialFood(product.name) && (
                      <Badge className="bg-orange-500/20 text-orange-600 border-orange-500/30 text-[13px] shrink-0">
                        Produit industriel
                      </Badge>
                    )}
                  </div>
                  <p className="text-[13px] text-muted-foreground mt-1">Code: {product.barcode}</p>
                </div>

                {/* Warning: incomplete nutritional data */}
                {product.calories_100g === 0 && (
                  <div className="rounded-xl border border-orange-500/40 bg-orange-500/10 p-3 space-y-2">
                    <p className="text-xs text-orange-700 font-medium">
                      ⚠️ Données nutritionnelles incomplètes pour ce produit. Vérifie l'étiquette.
                    </p>
                    <p className="text-[13px] text-muted-foreground">
                      Saisis les calories pour 100{unit} manuellement, ou recherche ce produit
                      directement dans la base CIQUAL via la recherche d'aliments.
                    </p>
                    <div className="flex items-center gap-2">
                      <label className="text-[13px] text-muted-foreground">kcal / 100{unit} :</label>
                      <Input
                        type="number"
                        min={0}
                        max={900}
                        placeholder="Ex: 250"
                        onChange={(e) => {
                          const v = parseInt(e.target.value);
                          if (!isNaN(v) && v >= 0 && v <= 900) {
                            setProduct((p) => (p ? { ...p, calories_100g: v } : p));
                          }
                        }}
                        className="h-8 w-24 text-sm bg-background"
                      />
                    </div>
                  </div>
                )}


                {/* Portion */}
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">Quantité ({unit === "ml" ? "millilitres" : "grammes"})</label>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setGrams((g) => Math.max(10, g - step))}
                      className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center text-foreground"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <Input
                      type="number"
                      value={grams}
                      onChange={(e) => {
                        const v = parseInt(e.target.value);
                        if (!isNaN(v) && v >= 10 && v <= 1000) setGrams(v);
                      }}
                      className="w-20 text-center h-9 bg-muted"
                      min={10}
                      max={1000}
                    />
                    <span className="text-sm text-muted-foreground">{unit}</span>
                    <button
                      onClick={() => setGrams((g) => Math.min(1000, g + step))}
                      className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center text-foreground"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="flex gap-2 mt-2">
                    {(unit === "ml" ? [100, 150, 200, 250, 300] : [50, 100, 150, 200, 300]).map((g) => (
                      <button
                        key={g}
                        onClick={() => setGrams(g)}
                        className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-all ${grams === g ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
                      >
                        {g}{unit}
                      </button>
                    ))}
                  </div>
                  <p className="text-[13px] text-muted-foreground mt-2">{formatStandardPortionHint(product.name)}</p>
                </div>

                {/* Macros */}
                <div className="grid grid-cols-5 gap-2 text-center">
                  {[
                    { l: "kcal", v: scaled.calories },
                    { l: "Prot", v: `${scaled.proteins}g` },
                    { l: "Gluc", v: `${scaled.carbs}g` },
                    { l: "Lip", v: `${scaled.fats}g` },
                    { l: "Fibres", v: `${scaled.fibres}g` },
                  ].map((item) => (
                    <div key={item.l} className="bg-muted/50 rounded-lg p-2">
                      <div className="text-lg font-bold text-foreground">{item.v}</div>
                      <div className="text-[13px] text-muted-foreground">{item.l}</div>
                    </div>
                  ))}
                </div>

                {/* Micros source banner */}
                {product.microsSource === "ciqual" && product.ciqualMatchName && (
                  <p className="text-[13px] text-muted-foreground italic">
                    Micronutriments absents de l'étiquette complétés avec l'aliment CIQUAL « {product.ciqualMatchName} »
                  </p>
                )}
                {!product.microsAvailable && (
                  <p className="text-[13px] text-orange-600 italic">
                    Micros non disponibles pour ce produit
                  </p>
                )}

                {/* Micros */}
                <div className="grid grid-cols-3 gap-1.5 text-center">
                  {product.microsAvailable ? (
                  [
                    { label: "Calcium", value: scaled.calcium, unit: "mg" },
                    { label: "Vit. D", value: scaled.vitamin_d, unit: "µg" },
                    { label: "Magnésium", value: scaled.magnesium, unit: "mg" },
                    { label: "Fer", value: scaled.iron, unit: "mg" },
                    { label: "Oméga-3", value: scaled.omega3, unit: "g" },
                    { label: "Vit. B12", value: scaled.vitamin_b12, unit: "µg" },
                  ].map((item) => (
                    <div key={item.label} className="bg-muted/30 rounded-lg py-1.5 px-1">
                      <div className="text-xs font-semibold text-foreground">
                        {item.value}
                        {item.unit}
                      </div>
                      <div className="text-[13px] text-muted-foreground">{item.label}</div>
                    </div>
                  ))
                  ) : (
                    <div className="col-span-3 text-center text-xs text-muted-foreground py-3">
                      —
                    </div>
                  )}
                </div>

                {/* Meal type */}
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">Type de repas</label>
                  <div className="flex gap-1.5 flex-wrap">
                    {MEAL_TYPES.map((m) => (
                      <button
                        key={m.value}
                        onClick={() => setSelectedMeal(m.value)}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${selectedMeal === m.value ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
                      >
                        {m.label}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  onClick={handleAdd}
                  disabled={isPending || product.calories_100g === 0}
                  className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <Plus className="w-4 h-4" />
                  {product.calories_100g === 0 ? "Saisis les calories pour ajouter" : "Ajouter au journal"}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
