import { useState, useEffect, useRef } from "react";
import { useFoodLogs } from "@/hooks/useFoodLogs";
import { searchFoods, scaleNutrients, ParsedFood } from "@/lib/openFoodFacts";
import { Search, Plus, Trash2, X, Minus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";

const MEAL_TYPES = [
  { value: "petit-dejeuner", label: "Petit-déjeuner" },
  { value: "dejeuner", label: "Déjeuner" },
  { value: "diner", label: "Dîner" },
  { value: "collation", label: "Collation" },
];

export default function JournalPage() {
  const { logs, addLog, deleteLog } = useFoodLogs();
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<ParsedFood[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [selectedFood, setSelectedFood] = useState<ParsedFood | null>(null);
  const [grams, setGrams] = useState(100);
  const [mealType, setMealType] = useState("dejeuner");
  const [showSearch, setShowSearch] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  // Debounced search
  useEffect(() => {
    if (search.length < 3 || selectedFood) {
      setResults([]);
      setSearchError(null);
      return;
    }
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      setSearchError(null);
      try {
        const res = await searchFoods(search);
        setResults(res);
        if (res.length === 0) setSearchError("Aucun résultat trouvé");
      } catch {
        setResults([]);
        setSearchError("Erreur de connexion, réessayez");
      } finally {
        setSearching(false);
      }
    }, 500);
    return () => clearTimeout(debounceRef.current);
  }, [search, selectedFood]);

  const scaled = selectedFood ? scaleNutrients(selectedFood, grams) : null;

  const handleAdd = () => {
    if (!selectedFood || !scaled || !user) return;
    addLog.mutate({
      food_name: selectedFood.name,
      portion_size: grams,
      calories: scaled.calories,
      proteins: scaled.proteins,
      carbs: scaled.carbs,
      fats: scaled.fats,
      calcium: scaled.calcium,
      vitamin_d: scaled.vitamin_d,
      magnesium: scaled.magnesium,
      iron: scaled.iron,
      omega3: scaled.omega3,
      phytoestrogens: scaled.phytoestrogens,
      vitamin_b12: scaled.vitamin_b12,
      meal_type: mealType,
    });
    setSelectedFood(null);
    setSearch("");
    setGrams(100);
    setShowSearch(false);
  };

  return (
    <div className="pb-24 px-4 pt-6 bg-background min-h-screen">
      <h1 className="text-2xl font-bold text-foreground mb-1">Journal alimentaire</h1>
      <p className="text-muted-foreground text-sm mb-4">Ajoutez vos repas du jour</p>

      {/* Search */}
      {(showSearch || logs.length > 0) && (
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setSelectedFood(null); }}
            placeholder="Rechercher un aliment (Open Food Facts)..."
            className="pl-10 h-12 bg-card rounded-lg"
          />
          {searching && (
            <div className="absolute z-10 top-14 left-0 right-0 bg-card border border-border rounded-lg shadow-lg p-4 flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              Recherche en cours...
            </div>
          )}
          {!searching && searchError && results.length === 0 && search.length >= 2 && !selectedFood && (
            <div className="absolute z-10 top-14 left-0 right-0 bg-card border border-border rounded-lg shadow-lg p-4 text-center text-sm text-muted-foreground">
              {searchError}
            </div>
          )}
          {results.length > 0 && !selectedFood && !searching && (
            <div className="absolute z-10 top-14 left-0 right-0 bg-card border border-border rounded-lg shadow-lg max-h-60 overflow-y-auto">
              {results.map((f, i) => (
                <button
                  key={`${f.name}-${i}`}
                  onClick={() => { setSelectedFood(f); setSearch(f.name); setGrams(100); }}
                  className="w-full text-left px-4 py-3 hover:bg-muted/50 border-b border-border last:border-0"
                >
                  <div className="font-medium text-sm text-foreground line-clamp-1">{f.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {f.calories_100g || "N/A"} kcal/100g · P {f.proteins_100g || "N/A"}g · G {f.carbs_100g || "N/A"}g · L {f.fats_100g || "N/A"}g
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Selected food detail */}
      {selectedFood && scaled && (
        <div className="bg-card rounded-2xl p-5 card-soft mb-4 animate-fade-in">
          <div className="flex justify-between items-start mb-3">
            <div className="flex-1 mr-2">
              <h3 className="font-semibold text-foreground line-clamp-2">{selectedFood.name}</h3>
              <p className="text-xs text-muted-foreground">Valeurs pour {grams}g</p>
            </div>
            <button onClick={() => { setSelectedFood(null); setSearch(""); }}>
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>

          {/* Portion (grams) */}
          <div className="mb-3">
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
                  if (!isNaN(v) && v >= 10 && v <= 2000) setGrams(v);
                }}
                className="w-20 text-center h-9 bg-muted"
                min={10}
                max={2000}
              />
              <span className="text-sm text-muted-foreground">g</span>
              <button
                onClick={() => setGrams((g) => Math.min(2000, g + 10))}
                className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center text-foreground"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
            {/* Quick presets */}
            <div className="flex gap-2 mt-2">
              {[50, 100, 150, 200, 300].map((g) => (
                <button
                  key={g}
                  onClick={() => setGrams(g)}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    grams === g ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                  }`}
                >
                  {g}g
                </button>
              ))}
            </div>
          </div>

          {/* Meal type */}
          <div className="mb-4">
            <label className="text-xs text-muted-foreground block mb-1">Type de repas</label>
            <div className="flex gap-1.5 flex-wrap">
              {MEAL_TYPES.map((m) => (
                <button
                  key={m.value}
                  onClick={() => setMealType(m.value)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                    mealType === m.value ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {/* Nutritional breakdown */}
          <div className="grid grid-cols-4 gap-2 text-center mb-3">
            <div className="bg-muted/50 rounded-lg p-2">
              <div className="text-lg font-bold text-foreground">{scaled.calories}</div>
              <div className="text-[10px] text-muted-foreground">kcal</div>
            </div>
            <div className="bg-muted/50 rounded-lg p-2">
              <div className="text-lg font-bold text-foreground">{scaled.proteins}g</div>
              <div className="text-[10px] text-muted-foreground">Protéines</div>
            </div>
            <div className="bg-muted/50 rounded-lg p-2">
              <div className="text-lg font-bold text-foreground">{scaled.carbs}g</div>
              <div className="text-[10px] text-muted-foreground">Glucides</div>
            </div>
            <div className="bg-muted/50 rounded-lg p-2">
              <div className="text-lg font-bold text-foreground">{scaled.fats}g</div>
              <div className="text-[10px] text-muted-foreground">Lipides</div>
            </div>
          </div>

          {/* Micronutrients */}
          <div className="grid grid-cols-3 gap-1.5 text-center mb-4">
            {[
              { label: "Calcium", value: scaled.calcium, unit: "mg" },
              { label: "Vit. D", value: scaled.vitamin_d, unit: "µg" },
              { label: "Magnésium", value: scaled.magnesium, unit: "mg" },
              { label: "Fer", value: scaled.iron, unit: "mg" },
              { label: "Oméga-3", value: scaled.omega3, unit: "g" },
              { label: "Vit. B12", value: scaled.vitamin_b12, unit: "µg" },
            ].map((n) => (
              <div key={n.label} className="bg-muted/30 rounded-lg py-1.5 px-1">
                <div className="text-xs font-semibold text-foreground">{n.value}{n.unit}</div>
                <div className="text-[9px] text-muted-foreground">{n.label}</div>
              </div>
            ))}
          </div>

          <button
            onClick={handleAdd}
            disabled={addLog.isPending}
            className="w-full py-3 bg-primary text-primary-foreground rounded-lg font-semibold flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" /> Ajouter
          </button>
        </div>
      )}

      {/* Today's logs or empty state */}
      <h3 className="text-sm font-semibold text-foreground mb-2">Aujourd'hui</h3>
      {logs.length === 0 && !showSearch ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="text-6xl mb-4">🥗</div>
          <p className="text-sm text-muted-foreground mb-6 max-w-[240px]">
            Commencez à enregistrer vos repas pour suivre votre nutrition
          </p>
          <button
            onClick={() => setShowSearch(true)}
            className="px-6 py-3 bg-primary text-primary-foreground rounded-full font-semibold flex items-center gap-2 shadow-md"
          >
            <Plus className="w-4 h-4" /> Ajouter un aliment
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {logs.map((log) => (
            <div key={log.id} className="bg-card rounded-xl p-4 flex items-center gap-3 card-soft">
              <div className="flex-1">
                <div className="font-medium text-sm text-foreground line-clamp-1">{log.food_name}</div>
                <div className="text-xs text-muted-foreground">
                  {log.calories} kcal · {log.proteins}g prot · {log.portion_size}g
                </div>
              </div>
              <button onClick={() => deleteLog.mutate(log.id)} className="text-muted-foreground hover:text-destructive transition-colors">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
