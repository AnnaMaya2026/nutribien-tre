import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

export default function ForgotPasswordDialog({
  open,
  onOpenChange,
  defaultEmail = "",
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  defaultEmail?: string;
}) {
  const [email, setEmail] = useState(defaultEmail);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (error) {
      setError("Email non trouvé. Vérifiez l'adresse saisie.");
    } else {
      setSuccess(
        `Un email de réinitialisation a été envoyé à ${email}. Vérifiez vos spams si nécessaire.`
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Réinitialiser votre mot de passe</DialogTitle>
          <DialogDescription>
            Entrez votre adresse email et nous vous enverrons un lien de réinitialisation.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <Input
            type="email"
            placeholder="Adresse e-mail"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="h-11"
          />
          {error && <p className="text-sm text-destructive">{error}</p>}
          {success && <p className="text-sm text-success">{success}</p>}
          <Button type="submit" disabled={loading || !email} className="w-full h-11 font-semibold">
            {loading ? "..." : "Envoyer le lien"}
          </Button>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="w-full text-sm text-muted-foreground underline underline-offset-2"
          >
            Annuler
          </button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
