import { useState, useEffect, useRef } from "react";
import { useFoodLogs } from "@/hooks/useFoodLogs";
import { useFavoriteMeals } from "@/hooks/useFavoriteMeals";
import { searchCiqual, scaleCiqual, CiqualFood } from "@/lib/ciqual";
import { Search, Plus, Trash2, X, Minus, ChevronDown, ChevronUp, ArrowRightLeft, Star, Heart } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import VoiceInput, { type VoiceMatch, type VoiceCandidate } from "@/components/VoiceInput";
import VoiceResults from "@/components/VoiceResults";
import VoiceCandidatePicker from "@/components/VoiceCandidatePicker";
import { toast } from "sonner";

const MEAL_TYPES = [
  { value: "petit-dejeuner", label: "🌅 Petit-déjeuner" },
  { value: "dejeuner", label: "☀️ Déjeuner" },
  { value: "diner", label: "🌙 Dîner" },
  { value: "collation", label: "🍎 Collation" },
];

export default function JournalPage() {
  const { logs, addLog, updateLog, deleteLog } = useFoodLogs();
  const { favorites, saveFavorite, deleteFavorite } = useFavoriteMeals();
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<CiqualFood[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [selectedFood, setSelectedFood] = useState<CiqualFood | null>(null);
  const [grams, setGrams] = useState(100);
  const [mealType, setMealType] = useState("dejeuner");
  const [showSearch, setShowSearch] = useState(false);
  const [expandedMeals, setExpandedMeals] = useState<Record<string, boolean>>({
    "petit-dejeuner": true, dejeuner: true, diner: true, collation: true,
  });
  const [voiceMatches, setVoiceMatches] = useState<VoiceMatch[] | null>(null);
  const [voiceCandidates, setVoiceCandidates] = useState<VoiceCandidate[] | null>(null);
  const [moveTarget, setMoveTarget] = useState<{ id: string; currentMeal: string; foodName: string } | null>(null);
  const [saveFavModal, setSaveFavModal] = useState<{ mealType: string; items: any[] } | null>(null);
  const [favName, setFavName] = useState("");
  const [addFavTarget, setAddFavTarget] = useState<{ favoriteId: string } | null>(null);
  const [showFavorites, setShowFavorites] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  // Debounced search - min 2 chars
  useEffect(() => {
    if (search.length < 2 || selectedFood) {
      setResults([]);
      setSearchError(null);
      return;
    }
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      setSearchError(null);
      try {
        const res = await searchCiqual(search);
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

  const scaled = selectedFood ? scaleCiqual(selectedFood, grams) : null;

  const handleAdd = () => {
    if (!selectedFood || !scaled || !user) return;
    addLog.mutate({
      food_name: selectedFood.nom,
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
      phytoestrogens: scaled.phytoestrogens,
      vitamin_b12: scaled.vitamin_b12,
      meal_type: mealType,
    });
    setSelectedFood(null);
    setSearch("");
    setGrams(100);
    setShowSearch(false);
  };

  const handleVoiceConfirm = (items: VoiceMatch[]) => {
    if (!user) return;
    items.forEach((item) => {
      addLog.mutate({
        food_name: item.food.nom,
        portion_size: item.grams,
        calories: item.scaled.calories,
        proteins: item.scaled.proteins,
        carbs: item.scaled.carbs,
        fats: item.scaled.fats,
        fibres: item.scaled.fibres,
        calcium: item.scaled.calcium,
        vitamin_d: item.scaled.vitamin_d,
        magnesium: item.scaled.magnesium,
        iron: item.scaled.iron,
        omega3: item.scaled.omega3,
        phytoestrogens: item.scaled.phytoestrogens,
        vitamin_b12: item.scaled.vitamin_b12,
        meal_type: mealType,
      });
    });
    setVoiceMatches(null);
  };

  const toggleMeal = (value: string) => {
    setExpandedMeals((prev) => ({ ...prev, [value]: !prev[value] }));
  };

  const handleMove = (destMeal: string) => {
    if (!moveTarget) return;
    const label = MEAL_TYPES.find((m) => m.value === destMeal)?.label || destMeal;
    updateLog.mutate(
      { id: moveTarget.id, meal_type: destMeal },
      {
        onSuccess: () => {
          toast.success(`Aliment déplacé vers ${label} ✓`);
          setExpandedMeals((prev) => ({ ...prev, [destMeal]: true }));
        },
      }
    );
    setMoveTarget(null);
  };

  const handleSaveFavorite = () => {
    if (!saveFavModal || !favName.trim()) return;
    const items = saveFavModal.items.map((l: any) => ({
      food_name: l.food_name,
      portion_size: l.portion_size || 1,
      calories: l.calories || 0,
      proteins: l.proteins || 0,
      carbs: l.carbs || 0,
      fats: l.fats || 0,
      fibres: l.fibres || 0,
      calcium: l.calcium || 0,
      vitamin_d: l.vitamin_d || 0,
      magnesium: l.magnesium || 0,
      iron: l.iron || 0,
      omega3: l.omega3 || 0,
      phytoestrogens: l.phytoestrogens || 0,
      vitamin_b12: l.vitamin_b12 || 0,
    }));
    saveFavorite.mutate(
      { name: favName.trim(), meal_type: saveFavModal.mealType, items },
      { onSuccess: () => { toast.success("Repas favori sauvegardé ⭐"); setSaveFavModal(null); setFavName(""); } }
    );
  };

  const handleAddFavoriteToJournal = (destMeal: string) => {
    if (!addFavTarget || !user) return;
    const fav = favorites.find((f) => f.id === addFavTarget.favoriteId);
    if (!fav) return;
    fav.items.forEach((item) => {
      addLog.mutate({
        food_name: item.food_name,
        portion_size: item.portion_size,
        calories: item.calories,
        proteins: item.proteins,
        carbs: item.carbs,
        fats: item.fats,
        fibres: item.fibres,
        calcium: item.calcium,
        vitamin_d: item.vitamin_d,
        magnesium: item.magnesium,
        iron: item.iron,
        omega3: item.omega3,
        phytoestrogens: item.phytoestrogens,
        vitamin_b12: item.vitamin_b12,
        meal_type: destMeal,
      });
    });
    const label = MEAL_TYPES.find((m) => m.value === destMeal)?.label || destMeal;
    toast.success(`${fav.items.length} aliment(s) ajouté(s) à ${label} ✓`);
    setExpandedMeals((prev) => ({ ...prev, [destMeal]: true }));
    setAddFavTarget(null);
  };

  const openSaveFavModal = (mealValue: string) => {
    const items = logs.filter((l) => l.meal_type === mealValue);
    if (items.length === 0) { toast.error("Aucun aliment dans ce repas"); return; }
    const label = MEAL_TYPES.find((m) => m.value === mealValue)?.label?.replace(/^.+\s/, "") || mealValue;
    const today = new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "long" });
    setFavName(`Mon ${label.toLowerCase()} du ${today}`);
    setSaveFavModal({ mealType: mealValue, items });
  };

  const logsByMeal = MEAL_TYPES.map((m) => ({
    ...m,
    items: logs.filter((l) => l.meal_type === m.value),
  }));

  const hasAnyLogs = logs.length > 0;

  return (
    <div className="pb-24 px-4 pt-6 bg-background min-h-screen">
      <h1 className="text-2xl font-bold text-foreground mb-1">Journal alimentaire</h1>
      <p className="text-muted-foreground text-sm mb-1">Ajoutez vos repas du jour</p>
      {!showSearch && !selectedFood && !voiceMatches && !voiceCandidates && (
        <p className="text-xs text-primary/60 italic mb-4">
          🎤 Dites par exemple : « J'ai mangé du poulet rôti et des haricots verts »
        </p>
      )}
      {(showSearch || selectedFood || voiceMatches || voiceCandidates) && <div className="mb-3" />}

      {/* Add food button */}
      {!showSearch && (
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setShowSearch(true)}
            className="flex-1 py-3 bg-primary text-primary-foreground rounded-xl font-semibold flex items-center justify-center gap-2 shadow-md"
          >
            <Plus className="w-4 h-4" /> Ajouter un aliment
          </button>
          <VoiceInput
            onResults={(m) => { setVoiceMatches(m); setShowSearch(false); }}
            onCandidates={(c) => { setVoiceCandidates(c); setShowSearch(false); }}
          />
        </div>
      )}

      {/* Search */}
      {showSearch && (
        <div className="relative mb-4">
          <div className="flex items-center gap-2 mb-2">
            <Search className="w-4 h-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Rechercher par nom d'aliment</span>
            <button onClick={() => { setShowSearch(false); setSearch(""); setSelectedFood(null); setResults([]); }} className="ml-auto">
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
          <div className="flex gap-2">
            <Input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setSelectedFood(null); }}
              placeholder="Ex: oeuf, pomme, fromage, poulet..."
              className="h-12 bg-card rounded-lg flex-1"
              autoFocus
            />
            <VoiceInput
              onResults={(m) => { setVoiceMatches(m); setShowSearch(false); }}
              onCandidates={(c) => { setVoiceCandidates(c); setShowSearch(false); }}
            />
          </div>
          {searching && (
            <div className="absolute z-10 top-[5.5rem] left-0 right-0 bg-card border border-border rounded-lg shadow-lg p-4 flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              Recherche en cours...
            </div>
          )}
          {!searching && searchError && results.length === 0 && search.length >= 2 && !selectedFood && (
            <div className="absolute z-10 top-[5.5rem] left-0 right-0 bg-card border border-border rounded-lg shadow-lg p-4 text-center text-sm text-muted-foreground">
              {searchError}
            </div>
          )}
          {results.length > 0 && !selectedFood && !searching && (
            <div className="absolute z-10 top-[5.5rem] left-0 right-0 bg-card border border-border rounded-lg shadow-lg max-h-60 overflow-y-auto">
              {results.map((f) => (
                <button
                  key={f.id}
                  onClick={() => { setSelectedFood(f); setSearch(f.nom); setGrams(100); }}
                  className="w-full text-left px-4 py-3 hover:bg-muted/50 border-b border-border last:border-0"
                >
                  <div className="font-medium text-sm text-foreground line-clamp-1">{f.nom}</div>
                  {f.groupe && <div className="text-[10px] text-primary/70 line-clamp-1">{f.groupe}</div>}
                  <div className="text-xs text-muted-foreground">
                    {f.calories_100g} kcal · P {f.proteines_100g}g · G {f.glucides_100g}g · L {f.lipides_100g}g · F {f.fibres_100g}g
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
              <h3 className="font-semibold text-foreground line-clamp-2">{selectedFood.nom}</h3>
              <p className="text-xs text-muted-foreground">Valeurs pour {grams}g</p>
            </div>
            <button onClick={() => { setSelectedFood(null); setSearch(""); }}>
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>

          {/* Portion */}
          <div className="mb-3">
            <label className="text-xs text-muted-foreground block mb-1">Quantité (grammes)</label>
            <div className="flex items-center gap-3">
              <button onClick={() => setGrams((g) => Math.max(10, g - 10))} className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center text-foreground">
                <Minus className="w-4 h-4" />
              </button>
              <Input type="number" value={grams} onChange={(e) => { const v = parseInt(e.target.value); if (!isNaN(v) && v >= 10 && v <= 1000) setGrams(v); }} className="w-20 text-center h-9 bg-muted" min={10} max={1000} />
              <span className="text-sm text-muted-foreground">g</span>
              <button onClick={() => setGrams((g) => Math.min(1000, g + 10))} className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center text-foreground">
                <Plus className="w-4 h-4" />
              </button>
            </div>
            <div className="flex gap-2 mt-2">
              {[50, 100, 150, 200, 300].map((g) => (
                <button key={g} onClick={() => setGrams(g)} className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-all ${grams === g ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
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
                <button key={m.value} onClick={() => setMealType(m.value)} className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${mealType === m.value ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {/* Nutritional breakdown */}
          <div className="grid grid-cols-5 gap-2 text-center mb-3">
            {[
              { l: "kcal", v: scaled.calories },
              { l: "Prot", v: `${scaled.proteins}g` },
              { l: "Gluc", v: `${scaled.carbs}g` },
              { l: "Lip", v: `${scaled.fats}g` },
              { l: "Fibres", v: `${scaled.fibres}g` },
            ].map((n) => (
              <div key={n.l} className="bg-muted/50 rounded-lg p-2">
                <div className="text-lg font-bold text-foreground">{n.v}</div>
                <div className="text-[10px] text-muted-foreground">{n.l}</div>
              </div>
            ))}
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

          <button onClick={handleAdd} disabled={addLog.isPending} className="w-full py-3 bg-primary text-primary-foreground rounded-lg font-semibold flex items-center justify-center gap-2">
            <Plus className="w-4 h-4" /> Ajouter
          </button>
        </div>
      )}

      {/* Voice results */}
      {voiceMatches && (
        <VoiceResults
          matches={voiceMatches}
          mealType={mealType}
          onConfirm={handleVoiceConfirm}
          onCancel={() => setVoiceMatches(null)}
        />
      )}

      {/* Voice candidate picker */}
      {voiceCandidates && (
      <VoiceCandidatePicker
          candidates={voiceCandidates}
          onDone={(matches) => {
            setVoiceCandidates(null);
            if (matches.length > 0) {
              setVoiceMatches((prev) => prev ? [...prev, ...matches] : matches);
            }
          }}
          onCancel={() => setVoiceCandidates(null)}
          onRestart={() => {
            setVoiceCandidates(null);
            setShowSearch(false);
          }}
        />
      )}


      {hasAnyLogs ? (
        <div className="space-y-3">
          {logsByMeal.map((meal) => (
            <div key={meal.value} className="bg-card rounded-2xl card-soft overflow-hidden">
              <button
                onClick={() => toggleMeal(meal.value)}
                className="w-full flex items-center justify-between px-4 py-3"
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-foreground">{meal.label}</span>
                  <span className="text-xs text-muted-foreground">
                    ({meal.items.length} aliment{meal.items.length !== 1 ? "s" : ""})
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-primary-foreground bg-primary/20 px-2 py-0.5 rounded-full">
                    {meal.items.reduce((s, l) => s + (l.calories || 0), 0)} kcal
                  </span>
                  {expandedMeals[meal.value] ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                </div>
              </button>
              {expandedMeals[meal.value] && meal.items.length > 0 && (
                <div className="px-4 pb-3 space-y-2">
                  {meal.items.map((log) => (
                    <div key={log.id} className="bg-muted/30 rounded-xl p-3 flex items-center gap-3 animate-fade-in">
                      <div className="flex-1">
                        <div className="font-medium text-sm text-foreground line-clamp-1">{log.food_name}</div>
                        <div className="text-xs text-muted-foreground">
                          {log.calories} kcal · {log.proteins}g prot · {log.portion_size}g
                        </div>
                      </div>
                      <button
                        onClick={() => setMoveTarget({ id: log.id, currentMeal: meal.value, foodName: log.food_name })}
                        className="text-muted-foreground hover:text-primary transition-colors"
                        title="Déplacer"
                      >
                        <ArrowRightLeft className="w-4 h-4" />
                      </button>
                      <button onClick={() => deleteLog.mutate(log.id)} className="text-muted-foreground hover:text-destructive transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              {expandedMeals[meal.value] && meal.items.length === 0 && (
                <div className="px-4 pb-3">
                  <p className="text-xs text-muted-foreground italic">Aucun aliment ajouté</p>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : !showSearch ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="text-6xl mb-4">🥗</div>
          <p className="text-sm text-muted-foreground mb-2 max-w-[240px]">
            Commencez à enregistrer vos repas pour suivre votre nutrition
          </p>
        </div>
      ) : null}

      {/* Move modal */}
      {moveTarget && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40" onClick={() => setMoveTarget(null)}>
          <div className="bg-card rounded-t-2xl w-full max-w-lg p-5 pb-8 animate-fade-in" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-sm font-semibold text-foreground mb-1">Déplacer vers quel repas ?</h3>
            <p className="text-xs text-muted-foreground mb-4 line-clamp-1">{moveTarget.foodName}</p>
            <div className="grid grid-cols-2 gap-2">
              {MEAL_TYPES.map((m) => {
                const isCurrent = m.value === moveTarget.currentMeal;
                return (
                  <button
                    key={m.value}
                    onClick={() => !isCurrent && handleMove(m.value)}
                    disabled={isCurrent}
                    className={`py-3 rounded-xl text-sm font-medium transition-all ${
                      isCurrent
                        ? "bg-muted text-muted-foreground opacity-40 cursor-not-allowed"
                        : "bg-primary/10 text-foreground hover:bg-primary hover:text-primary-foreground"
                    }`}
                  >
                    {m.label}
                    {isCurrent && " (actuel)"}
                  </button>
                );
              })}
            </div>
            <button onClick={() => setMoveTarget(null)} className="w-full mt-3 py-2 text-xs text-muted-foreground">
              Annuler
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
