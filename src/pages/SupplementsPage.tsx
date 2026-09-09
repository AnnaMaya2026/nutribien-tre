import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Camera, Trash2, Minus, Plus, Check } from "lucide-react";
import { useSelectedDate } from "@/hooks/useSelectedDate";
import DateSelector from "@/components/DateSelector";
import SupplementPhotoDialog from "@/components/SupplementPhotoDialog";
import { useSupplements, nutrientLabel, type Supplement } from "@/hooks/useSupplements";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";

function toKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function SupplementsPage() {
  const navigate = useNavigate();
  const { selectedDate } = useSelectedDate();
  const dateStr = toKey(selectedDate);
  const [dialogOpen, setDialogOpen] = useState(false);

  const {
    supplements,
    nutrientsBySupplement,
    isTaken,
    takenQuantity,
    toggleTaken,
    setActive,
    setQuotidien,
    deleteSupplement,
    isLoading,
  } = useSupplements(dateStr);

  const actifs = supplements.filter((s) => s.actif);
  const inactifs = supplements.filter((s) => !s.actif);

  const changeQty = (s: Supplement, delta: number) => {
    const next = Math.max(0.5, takenQuantity(s) + delta);
    toggleTaken.mutate({ supplementId: s.id, taken: true, day: dateStr, quantite: next });
  };

  const renderCard = (s: Supplement) => {
    const taken = s.actif && isTaken(s);
    const qty = takenQuantity(s);
    const nutrients = nutrientsBySupplement[s.id] || [];
    return (
      <div key={s.id} className="rounded-xl border border-border bg-card p-3 space-y-2">
        <div className="flex items-start gap-3">
          {s.actif && (
            <button
              onClick={() => toggleTaken.mutate({ supplementId: s.id, taken: !taken, day: dateStr, quantite: taken ? 1 : qty })}
              aria-label={taken ? "Décocher" : "Cocher"}
              className={`mt-0.5 w-7 h-7 shrink-0 rounded-full border flex items-center justify-center transition-colors ${
                taken ? "bg-primary border-primary text-primary-foreground" : "border-border text-transparent"
              }`}
            >
              <Check className="w-4 h-4" />
            </button>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground truncate">{s.nom}</p>
            <p className="text-xs text-muted-foreground truncate">
              {[s.marque, s.dose_par_prise ? `${s.dose_par_prise} ${s.unite_dose ?? ""}/jour` : null,
                s.poids_dose_g ? `${s.poids_dose_g} g/dose` : null]
                .filter(Boolean)
                .join(" · ")}
            </p>
            {s.composition_incomplete && (
              <p className="text-[11px] text-amber-600 dark:text-amber-400">Composition incomplète</p>
            )}
          </div>
          <button
            onClick={() => {
              if (confirm(`Supprimer ${s.nom} ?`)) deleteSupplement.mutate(s.id);
            }}
            className="p-1 text-muted-foreground hover:text-destructive"
            aria-label="Supprimer"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>

        {s.actif && taken && (
          <div className="flex items-center gap-2 pl-10">
            <span className="text-xs text-muted-foreground">Quantité prise</span>
            <button onClick={() => changeQty(s, -0.5)} className="w-7 h-7 rounded-full bg-muted flex items-center justify-center" aria-label="Moins">
              <Minus className="w-3.5 h-3.5" />
            </button>
            <span className="text-sm font-medium w-10 text-center">{qty}</span>
            <button onClick={() => changeQty(s, 0.5)} className="w-7 h-7 rounded-full bg-muted flex items-center justify-center" aria-label="Plus">
              <Plus className="w-3.5 h-3.5" />
            </button>
            <span className="text-xs text-muted-foreground">{s.unite_dose ? `× ${s.dose_par_prise} ${s.unite_dose}` : ""}</span>
          </div>
        )}

        {nutrients.length > 0 && (
          <p className="text-[11px] text-muted-foreground pl-10">
            {nutrients.slice(0, 6).map((n) => `${nutrientLabel(n.nutrient_key)} ${n.amount}${n.unit}`).join(" · ")}
            {nutrients.length > 6 ? ` · +${nutrients.length - 6}` : ""}
          </p>
        )}

        <div className="flex items-center gap-4 pl-10 pt-1">
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            <Switch checked={s.actif} onCheckedChange={(v) => setActive.mutate({ id: s.id, actif: v })} />
            Actif
          </label>
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            <Switch checked={s.quotidien} onCheckedChange={(v) => setQuotidien.mutate({ id: s.id, quotidien: v })} />
            Quotidien
          </label>
        </div>
      </div>
    );
  };

  return (
    <div className="pb-28 px-4 pt-6 bg-background min-h-screen">
      <div className="flex items-center gap-2 mb-4">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-full hover:bg-muted" aria-label="Retour">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-xl font-bold text-foreground">💊 Mes compléments</h1>
      </div>

      <DateSelector />

      <p className="text-sm text-muted-foreground my-3">
        Cochez ce que vous avez pris ce jour-là — vous pouvez revenir sur n'importe quelle journée passée.
        Les compléments marqués « quotidien » sont cochés d'avance.
      </p>

      <Button onClick={() => setDialogOpen(true)} className="w-full mb-2">
        <Camera className="w-4 h-4 mr-2" />
        Ajouter par photo de l'étiquette
      </Button>
      <p className="text-[11px] text-muted-foreground text-center mb-5">
        Vous pourrez tout vérifier et corriger avant enregistrement, ou saisir à la main.
      </p>

      {isLoading && <p className="text-sm text-muted-foreground">Chargement…</p>}

      {!isLoading && supplements.length === 0 && (
        <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          Aucun complément pour l'instant. Commencez par photographier une étiquette.
        </div>
      )}

      {actifs.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-foreground">Actifs</h2>
          {actifs.map(renderCard)}
        </div>
      )}

      {inactifs.length > 0 && (
        <div className="space-y-3 mt-6">
          <h2 className="text-sm font-semibold text-muted-foreground">Désactivés</h2>
          {inactifs.map(renderCard)}
        </div>
      )}

      <SupplementPhotoDialog open={dialogOpen} onClose={() => setDialogOpen(false)} dateStr={dateStr} />
    </div>
  );
}
