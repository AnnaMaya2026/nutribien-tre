import { useState } from "react";
import { useFoodLogs } from "@/hooks/useFoodLogs";
import { FOOD_DATABASE, FoodItem } from "@/lib/mockData";
import { Search, Plus, Trash2, X } from "lucide-react";
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
  const [selectedFood, setSelectedFood] = useState<FoodItem | null>(null);
  const [portion, setPortion] = useState(1);
  const [mealType, setMealType] = useState("dejeuner");

  const filtered = search.length > 1
    ? FOOD_DATABASE.filter((f) => f.name.toLowerCase().includes(search.toLowerCase()))
    : [];

  const handleAdd = () => {
    if (!selectedFood || !user) return;
    addLog.mutate({
      food_name: selectedFood.name,
      portion_size: portion,
      calories: Math.round(selectedFood.calories * portion),
      proteins: Math.round(selectedFood.proteins * portion),
      carbs: Math.round(selectedFood.carbs * portion),
      fats: Math.round(selectedFood.fats * portion),
      calcium: Math.round(selectedFood.calcium * portion),
      vitamin_d: +(selectedFood.vitamin_d * portion).toFixed(1),
      magnesium: Math.round(selectedFood.magnesium * portion),
      iron: +(selectedFood.iron * portion).toFixed(1),
      omega3: +(selectedFood.omega3 * portion).toFixed(1),
      phytoestrogens: +(selectedFood.phytoestrogens * portion).toFixed(1),
      vitamin_b12: +(selectedFood.vitamin_b12 * portion).toFixed(1),
      meal_type: mealType,
    });
    setSelectedFood(null);
    setSearch("");
    setPortion(1);
  };

  return (
    <div className="pb-24 px-4 pt-6 bg-background min-h-screen">
      <h1 className="text-2xl font-bold text-foreground mb-1">Journal alimentaire</h1>
      <p className="text-muted-foreground text-sm mb-4">Ajoutez vos repas du jour</p>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => { setSearch(e.target.value); setSelectedFood(null); }}
          placeholder="Rechercher un aliment..."
          className="pl-10 h-12 bg-card rounded-lg"
        />
        {filtered.length > 0 && !selectedFood && (
          <div className="absolute z-10 top-14 left-0 right-0 bg-card border border-border rounded-lg shadow-lg max-h-60 overflow-y-auto">
            {filtered.map((f) => (
              <button
                key={f.name}
                onClick={() => { setSelectedFood(f); setSearch(f.name); }}
                className="w-full text-left px-4 py-3 hover:bg-muted/50 border-b border-border last:border-0"
              >
                <div className="font-medium text-sm text-foreground">{f.name}</div>
                <div className="text-xs text-muted-foreground">{f.calories} kcal · {f.portion}</div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Selected food detail */}
      {selectedFood && (
        <div className="bg-card rounded-2xl p-5 card-soft mb-4 animate-fade-in">
          <div className="flex justify-between items-start mb-3">
            <div>
              <h3 className="font-semibold text-foreground">{selectedFood.name}</h3>
              <p className="text-xs text-muted-foreground">{selectedFood.portion}</p>
            </div>
            <button onClick={() => { setSelectedFood(null); setSearch(""); }}>
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>

          {/* Portion */}
          <div className="mb-3">
            <label className="text-xs text-muted-foreground block mb-1">Portions</label>
            <div className="flex gap-2">
              {[0.5, 1, 1.5, 2].map((p) => (
                <button
                  key={p}
                  onClick={() => setPortion(p)}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                    portion === p ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                  }`}
                >
                  {p}×
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
          <div className="grid grid-cols-3 gap-2 text-center mb-4">
            <div className="bg-muted/50 rounded-lg p-2">
              <div className="text-lg font-bold text-foreground">{Math.round(selectedFood.calories * portion)}</div>
              <div className="text-[10px] text-muted-foreground">kcal</div>
            </div>
            <div className="bg-muted/50 rounded-lg p-2">
              <div className="text-lg font-bold text-foreground">{Math.round(selectedFood.proteins * portion)}g</div>
              <div className="text-[10px] text-muted-foreground">Protéines</div>
            </div>
            <div className="bg-muted/50 rounded-lg p-2">
              <div className="text-lg font-bold text-foreground">{Math.round(selectedFood.carbs * portion)}g</div>
              <div className="text-[10px] text-muted-foreground">Glucides</div>
            </div>
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

      {/* Today's logs */}
      <h3 className="text-sm font-semibold text-foreground mb-2">Aujourd'hui</h3>
      {logs.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">Aucun aliment enregistré</p>
      ) : (
        <div className="space-y-2">
          {logs.map((log) => (
            <div key={log.id} className="bg-card rounded-xl p-4 flex items-center gap-3 card-soft">
              <div className="flex-1">
                <div className="font-medium text-sm text-foreground">{log.food_name}</div>
                <div className="text-xs text-muted-foreground">
                  {log.calories} kcal · {log.proteins}g prot · {log.portion_size}×
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
