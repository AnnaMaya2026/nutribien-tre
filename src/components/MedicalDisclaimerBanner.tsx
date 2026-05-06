import { useEffect, useState } from "react";
import { Info, X } from "lucide-react";
import { useProfile } from "@/hooks/useProfile";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

const LOCAL_KEY = "nutrimeno_medical_disclaimer_dismissed";

export default function MedicalDisclaimerBanner() {
  const { profile } = useProfile();
  const { user } = useAuth();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const localDismissed = localStorage.getItem(LOCAL_KEY) === "1";
    const dbDismissed = (profile as any)?.medical_disclaimer_dismissed === true;
    setVisible(!localDismissed && !dbDismissed);
  }, [profile]);

  if (!visible) return null;

  const dismiss = async () => {
    setVisible(false);
    localStorage.setItem(LOCAL_KEY, "1");
    if (user) {
      await supabase
        .from("profiles")
        .update({ medical_disclaimer_dismissed: true } as any)
        .eq("user_id", user.id);
    }
  };

  return (
    <div className="mb-4 rounded-xl bg-primary/10 border border-primary/30 p-3 flex items-start gap-3 animate-fade-in">
      <Info className="w-5 h-5 text-primary-foreground flex-shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="text-xs text-foreground leading-snug">
          ℹ️ NutriMéno est un outil d'aide nutritionnelle. Il ne remplace pas un avis
          médical professionnel.
        </p>
        <button
          onClick={dismiss}
          className="mt-2 text-xs font-semibold text-pink-deep underline underline-offset-2"
        >
          J'ai compris
        </button>
      </div>
      <button onClick={dismiss} aria-label="Fermer" className="text-muted-foreground">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
