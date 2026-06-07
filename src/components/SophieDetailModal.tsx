import { X, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type Mode = "recommendation" | "food";

interface Props {
  open: boolean;
  mode: Mode;
  payload: string;
  onClose: () => void;
}

interface RecoData {
  top_foods: { name: string; amount: string; quantity: string }[];
  daily_dose: string;
  best_timing: string;
  absorption_tip: string;
  alternative: string;
  avoid: string;
}

interface FoodData {
  emoji: string;
  definition: string;
  benefit_menopause: string;
  where_to_find: string;
  how_to_use: string;
  alternative: string;
}

export default function SophieDetailModal({ open, mode, payload, onClose }: Props) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<RecoData | FoodData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !payload) return;
    setLoading(true);
    setError(null);
    setData(null);
    const fn = mode === "recommendation" ? "expand-recommendation" : "define-food";
    const body = mode === "recommendation" ? { recommendation: payload } : { food: payload };
    supabase.functions.invoke(fn, { body }).then(({ data: d, error: e }) => {
      if (e || !d || (d as any).error) {
        setError("Impossible de charger les détails. Réessayez.");
      } else {
        setData(d as any);
      }
      setLoading(false);
    });
  }, [open, mode, payload]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] bg-black/40 flex items-end sm:items-center justify-center p-4 animate-fade-in" onClick={onClose}>
      <div
        className="bg-card w-full max-w-md max-h-[85vh] overflow-y-auto rounded-2xl shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-primary text-primary-foreground px-4 py-3 flex items-center justify-between rounded-t-2xl">
          <h3 className="font-bold text-sm truncate pr-2">
            {mode === "recommendation" ? "🔍 Recommandation détaillée" : `❓ C'est quoi ${payload} ?`}
          </h3>
          <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-white/20 flex items-center justify-center" aria-label="Fermer">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {loading && (
            <div className="flex flex-col items-center gap-2 py-8 text-muted-foreground">
              <Loader2 className="w-6 h-6 animate-spin text-pink-deep" />
              <p className="text-xs">Sophie prépare votre fiche...</p>
            </div>
          )}
          {error && <p className="text-sm text-destructive text-center py-4">{error}</p>}

          {!loading && data && mode === "recommendation" && (
            <RecoContent d={data as RecoData} />
          )}
          {!loading && data && mode === "food" && (
            <FoodContent d={data as FoodData} name={payload} />
          )}

          <button
            onClick={onClose}
            className="w-full h-11 rounded-xl bg-muted text-foreground font-medium text-sm hover:bg-muted/70"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}

function Section({ icon, title, children }: { icon: string; title: string; children: React.ReactNode }) {
  return (
    <div className="bg-background/50 rounded-xl p-3">
      <h4 className="text-xs font-bold text-pink-deep mb-1.5 flex items-center gap-1.5">
        <span>{icon}</span> {title}
      </h4>
      <div className="text-sm text-foreground leading-relaxed">{children}</div>
    </div>
  );
}

function RecoContent({ d }: { d: RecoData }) {
  return (
    <>
      <Section icon="🥗" title="Top aliments">
        <ul className="space-y-1.5">
          {(d.top_foods ?? []).map((f, i) => (
            <li key={i} className="text-xs">
              <span className="font-semibold">{f.name}</span>
              {f.amount && <span className="text-muted-foreground"> — {f.amount}</span>}
              {f.quantity && <span className="text-pink-deep"> · portion : {f.quantity}</span>}
            </li>
          ))}
        </ul>
      </Section>
      <Section icon="📏" title="Dose quotidienne">{d.daily_dose}</Section>
      <Section icon="⏰" title="Quand consommer">{d.best_timing}</Section>
      <Section icon="💡" title="Astuce absorption">{d.absorption_tip}</Section>
      <Section icon="🔄" title="Alternative">{d.alternative}</Section>
      <Section icon="⚠️" title="À éviter">{d.avoid}</Section>
    </>
  );
}

function FoodContent({ d, name }: { d: FoodData; name: string }) {
  return (
    <>
      <div className="text-center py-2">
        <div className="text-4xl mb-1">{d.emoji}</div>
        <h4 className="font-bold text-foreground capitalize">{name}</h4>
      </div>
      <Section icon="📖" title="Définition">{d.definition}</Section>
      <Section icon="🌸" title="Bénéfices ménopause">{d.benefit_menopause}</Section>
      <Section icon="🛒" title="Où en trouver">{d.where_to_find}</Section>
      <Section icon="👩‍🍳" title="Comment l'utiliser">{d.how_to_use}</Section>
      <Section icon="🔄" title="Alternative">{d.alternative}</Section>
    </>
  );
}
