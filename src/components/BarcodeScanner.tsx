import { useState, useEffect, useRef, useCallback } from "react";
import { X, ScanBarcode, Loader2, Plus, Minus, Keyboard } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

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
  calcium_100g: number;
  vitamin_d_100g: number;
  magnesium_100g: number;
  iron_100g: number;
  omega3_100g: number;
  vitamin_b12_100g: number;
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
    calcium: number;
    vitamin_d: number;
    magnesium: number;
    iron: number;
    omega3: number;
    phytoestrogens: number;
    vitamin_b12: number;
    meal_type: string;
  }) => void;
  isPending?: boolean;
}

function n(v: number | undefined | null): number {
  return v && isFinite(v) ? v : 0;
}

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
    console.log("Stopping camera...");
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
    console.log("API call to OpenFoodFacts...", barcode);
    setLoading(true);
    try {
      const res = await fetch(`https://world.openfoodfacts.org/api/v2/product/${barcode}.json`);
      const data = await res.json();
      if (data.status !== 1 || !data.product) {
        console.log("Product not found:", barcode);
        toast.error("Produit non trouvé dans la base de données. Essayez la recherche manuelle.");
        setShowScanner(false);
        return;
      }
      const p = data.product;
      const nm = p.nutriments || {};
      console.log("Product found:", p.product_name || p.product_name_fr);
      setProduct({
        name: p.product_name || p.product_name_fr || "Produit inconnu",
        brand: p.brands || "",
        barcode,
        calories_100g: n(nm["energy-kcal_100g"]),
        proteins_100g: n(nm.proteins_100g),
        carbs_100g: n(nm.carbohydrates_100g),
        fats_100g: n(nm.fat_100g),
        fiber_100g: n(nm.fiber_100g),
        calcium_100g: n(nm.calcium_100g),
        vitamin_d_100g: n(nm["vitamin-d_100g"]),
        magnesium_100g: n(nm.magnesium_100g),
        iron_100g: n(nm.iron_100g),
        omega3_100g: n(nm["omega-3-fat_100g"]),
        vitamin_b12_100g: n(nm["vitamin-b12_100g"]),
      });
    } catch {
      toast.error("Erreur de connexion, réessayez");
      setShowScanner(false);
    } finally {
      setLoading(false);
    }
  };

  const startScanning = useCallback(async () => {
    if (!videoRef.current) return;
    console.log("Starting camera...");
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
      console.log("Camera started");

      // Dynamically import @zxing/browser
      const { BrowserMultiFormatReader } = await import("@zxing/browser");
      const codeReader = new BrowserMultiFormatReader();

      scanningRef.current = true;
      console.log("Scanning...");

      // Continuous decode loop
      const tryDecode = async () => {
        if (!scanningRef.current || !videoRef.current) return;
        try {
          const result = await codeReader.decodeOnceFromVideoDevice(undefined, videoRef.current);
          if (result) {
            const text = result.getText();
            console.log("Barcode detected:", text);
            stopCamera();
            setScanning(false);
            lookupBarcode(text);
            return;
          }
        } catch (err: any) {
          // NotFoundException is normal during scanning
          if (err?.name !== "NotFoundException" && scanningRef.current) {
            console.log("Scan attempt error:", err?.message);
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
      toast.error("Veuillez saisir un code-barres valide (8-13 chiffres)");
      return;
    }
    setManualMode(false);
    lookupBarcode(code);
  };

  const scaled = product
    ? {
        calories: Math.round((product.calories_100g * grams) / 100),
        proteins: Math.round((product.proteins_100g * grams) / 100),
        carbs: Math.round((product.carbs_100g * grams) / 100),
        fats: Math.round((product.fats_100g * grams) / 100),
        fibres: Math.round((product.fiber_100g * grams) / 100),
        calcium: Math.round((product.calcium_100g * grams) / 100),
        vitamin_d: +((product.vitamin_d_100g * grams) / 100).toFixed(1),
        magnesium: Math.round((product.magnesium_100g * grams) / 100),
        iron: +((product.iron_100g * grams) / 100).toFixed(1),
        omega3: +((product.omega3_100g * grams) / 100).toFixed(1),
        vitamin_b12: +((product.vitamin_b12_100g * grams) / 100).toFixed(1),
      }
    : null;

  const handleAdd = () => {
    if (!product || !scaled) return;
    onAdd({
      food_name: `${product.name}${product.brand ? ` (${product.brand})` : ""} 📦`,
      portion_size: grams,
      calories: scaled.calories,
      proteins: scaled.proteins,
      carbs: scaled.carbs,
      fats: scaled.fats,
      fibres: scaled.fibres,
      calcium: scaled.calcium,
      vitamin_d: scaled.vitamin_d,
      magnesium: scaled.magnesium,
      iron: scaled.iron,
      omega3: scaled.omega3,
      phytoestrogens: 0,
      vitamin_b12: scaled.vitamin_b12,
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
                    📷 Placez le code-barres dans le cadre...
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
                <p className="text-xs text-muted-foreground">Entrez le code-barres (8 à 13 chiffres) :</p>
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
                    <Badge className="bg-orange-500/20 text-orange-600 border-orange-500/30 text-[10px] shrink-0">
                      Produit industriel
                    </Badge>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1">Code: {product.barcode}</p>
                </div>

                {/* Portion */}
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">Quantité (grammes)</label>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setGrams((g) => Math.max(10, g - 10))}
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
                    <span className="text-sm text-muted-foreground">g</span>
                    <button
                      onClick={() => setGrams((g) => Math.min(1000, g + 10))}
                      className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center text-foreground"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="flex gap-2 mt-2">
                    {[50, 100, 150, 200, 300].map((g) => (
                      <button
                        key={g}
                        onClick={() => setGrams(g)}
                        className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-all ${grams === g ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
                      >
                        {g}g
                      </button>
                    ))}
                  </div>
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
                      <div className="text-[10px] text-muted-foreground">{item.l}</div>
                    </div>
                  ))}
                </div>

                {/* Micros */}
                <div className="grid grid-cols-3 gap-1.5 text-center">
                  {[
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
                      <div className="text-[9px] text-muted-foreground">{item.label}</div>
                    </div>
                  ))}
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
                  disabled={isPending}
                  className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <Plus className="w-4 h-4" /> Ajouter au journal
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
