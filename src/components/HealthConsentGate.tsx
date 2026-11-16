import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { HEALTH_CONSENT_TEXT, recordHealthConsent } from "@/lib/healthConsent";

/**
 * Écran affiché aux comptes qui n'ont pas encore donné leur consentement
 * explicite aux données de santé (article 9 du RGPD).
 */
export default function HealthConsentGate() {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const [checked, setChecked] = useState(false);
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const accept = async () => {
    setBusy(true);
    try {
      await recordHealthConsent();
    } catch {
      toast.error("L'enregistrement n'a pas fonctionné. Réessaie.");
    } finally {
      setBusy(false);
    }
  };

  const deleteAccount = async () => {
    setBusy(true);
    try {
      const { error } = await supabase.functions.invoke("delete-account");
      if (error) throw error;
      await signOut();
    } catch {
      toast.error("La suppression n'a pas fonctionné. Réessaie.");
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-5 py-10">
      <div className="max-w-md w-full space-y-5">
        <h1 className="text-xl font-bold text-foreground">Ton accord pour tes données de santé</h1>
        <p className="text-[15px] text-muted-foreground">
          NutriMéno suit tes symptômes, ton poids et tes compléments. Ce sont des données de santé : nous avons besoin de ton accord explicite pour continuer.
        </p>
        <label className="flex items-start gap-3 rounded-xl border border-border bg-card p-4 cursor-pointer">
          <input
            type="checkbox"
            checked={checked}
            onChange={(e) => setChecked(e.target.checked)}
            className="mt-1 h-5 w-5 shrink-0 accent-[hsl(var(--primary))]"
          />
          <span className="text-[15px] text-foreground leading-relaxed">{HEALTH_CONSENT_TEXT}</span>
        </label>
        <button onClick={() => navigate("/confidentialite")} className="text-[15px] underline underline-offset-2 text-muted-foreground">
          Lire la politique de confidentialité
        </button>
        <Button onClick={accept} disabled={!checked || busy} className="w-full h-12 text-base font-semibold">
          Continuer
        </Button>
        <div className="flex items-center justify-between text-[15px]">
          <button onClick={() => signOut()} disabled={busy} className="underline underline-offset-2 text-muted-foreground">
            Me déconnecter
          </button>
          {confirmDelete ? (
            <button onClick={deleteAccount} disabled={busy} className="underline underline-offset-2 text-destructive font-semibold">
              Confirmer la suppression définitive
            </button>
          ) : (
            <button onClick={() => setConfirmDelete(true)} disabled={busy} className="underline underline-offset-2 text-destructive">
              Supprimer mon compte
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
