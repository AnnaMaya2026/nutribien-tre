import { useState } from "react";
import { X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

const NUTRIENTS = [
  "Calories", "Protéines", "Glucides", "Lipides", "Fibres",
  "Calcium", "Vitamine D", "Magnésium", "Fer", "Oméga-3", "Vitamine B12",
];

interface Props {
  foodName: string;
  onClose: () => void;
}

export default function NutrientReportModal({ foodName, onClose }: Props) {
  const { user } = useAuth();
  const [nutrient, setNutrient] = useState(NUTRIENTS[0]);
  const [suggestedValue, setSuggestedValue] = useState("");
  const [comment, setComment] = useState("");
  const [sending, setSending] = useState(false);

  const handleSubmit = async () => {
    if (!user || !suggestedValue.trim()) return;
    setSending(true);
    const { error } = await supabase.from("nutrient_reports").insert({
      user_id: user.id,
      aliment_nom: foodName,
      nutrient_name: nutrient,
      current_value: null,
      suggested_value: parseFloat(suggestedValue) || 0,
      comment: comment.trim() || null,
    });
    setSending(false);
    if (error) {
      toast.error("Erreur lors de l'envoi");
    } else {
      toast.success("Signalement envoyé, merci !");
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-card rounded-2xl w-full max-w-md mx-4 p-5 animate-fade-in" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-sm font-semibold text-foreground">⚠️ Signaler une valeur incorrecte</h3>
          <button onClick={onClose}><X className="w-4 h-4 text-muted-foreground" /></button>
        </div>

        <div className="mb-3">
          <label className="text-xs text-muted-foreground block mb-1">Aliment</label>
          <div className="text-sm text-foreground font-medium bg-muted/50 rounded-lg px-3 py-2">{foodName}</div>
        </div>

        <div className="mb-3">
          <label className="text-xs text-muted-foreground block mb-1">Nutriment concerné</label>
          <select
            value={nutrient}
            onChange={(e) => setNutrient(e.target.value)}
            className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
          >
            {NUTRIENTS.map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </div>

        <div className="mb-3">
          <label className="text-xs text-muted-foreground block mb-1">Valeur correcte suggérée</label>
          <Input
            type="number"
            value={suggestedValue}
            onChange={(e) => setSuggestedValue(e.target.value)}
            placeholder="Ex: 18.1"
            className="h-10 bg-muted/50"
          />
        </div>

        <div className="mb-4">
          <label className="text-xs text-muted-foreground block mb-1">Commentaire (optionnel)</label>
          <Textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Source ou explication..."
            className="bg-muted/50 min-h-[60px]"
          />
        </div>

        <button
          onClick={handleSubmit}
          disabled={sending || !suggestedValue.trim()}
          className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-semibold disabled:opacity-50"
        >
          {sending ? "Envoi..." : "Envoyer"}
        </button>
      </div>
    </div>
  );
}
