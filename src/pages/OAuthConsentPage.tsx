import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

// Minimal typed wrapper for the beta supabase.auth.oauth namespace.
type OAuthClient = { name?: string; client_name?: string; redirect_uris?: string[] };
type AuthorizationDetails = {
  client?: OAuthClient;
  scope?: string;
  scopes?: string[];
  redirect_url?: string;
  redirect_to?: string;
};
type OAuthApi = {
  getAuthorizationDetails: (id: string) => Promise<{ data: AuthorizationDetails | null; error: { message: string } | null }>;
  approveAuthorization: (id: string) => Promise<{ data: AuthorizationDetails | null; error: { message: string } | null }>;
  denyAuthorization: (id: string) => Promise<{ data: AuthorizationDetails | null; error: { message: string } | null }>;
};
const oauthApi = (supabase.auth as unknown as { oauth: OAuthApi }).oauth;

export default function OAuthConsentPage() {
  const [params] = useSearchParams();
  const authorizationId = params.get("authorization_id") ?? "";
  const [details, setDetails] = useState<AuthorizationDetails | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!authorizationId) {
        setError("Paramètre authorization_id manquant.");
        return;
      }
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) {
        const next = window.location.pathname + window.location.search;
        window.location.href = "/auth?next=" + encodeURIComponent(next);
        return;
      }
      setEmail(sess.session.user.email ?? null);
      const { data, error } = await oauthApi.getAuthorizationDetails(authorizationId);
      if (!active) return;
      if (error) {
        setError(error.message);
        return;
      }
      const immediate = data?.redirect_url ?? data?.redirect_to;
      if (immediate && !data?.client) {
        window.location.href = immediate;
        return;
      }
      setDetails(data);
    })();
    return () => {
      active = false;
    };
  }, [authorizationId]);

  async function decide(approve: boolean) {
    setBusy(true);
    const { data, error } = approve
      ? await oauthApi.approveAuthorization(authorizationId)
      : await oauthApi.denyAuthorization(authorizationId);
    if (error) {
      setBusy(false);
      setError(error.message);
      return;
    }
    const target = data?.redirect_url ?? data?.redirect_to;
    if (!target) {
      setBusy(false);
      setError("Aucune URL de redirection renvoyée par le serveur d'autorisation.");
      return;
    }
    window.location.href = target;
  }

  if (error) {
    return (
      <main className="min-h-screen flex items-center justify-center p-4 bg-background">
        <Card className="max-w-md w-full p-6 space-y-3">
          <h1 className="text-lg font-semibold">Autorisation impossible</h1>
          <p className="text-sm text-muted-foreground">{error}</p>
        </Card>
      </main>
    );
  }

  if (!details) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </main>
    );
  }

  const clientName = details.client?.name ?? details.client?.client_name ?? "une application";
  const scopes = details.scopes ?? (details.scope ? details.scope.split(/\s+/).filter(Boolean) : []);

  return (
    <main className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="max-w-md w-full p-6 space-y-5">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold">Connecter {clientName} à NutriMéno</h1>
          <p className="text-sm text-muted-foreground">
            {clientName} pourra utiliser NutriMéno en votre nom pendant votre session.
          </p>
        </div>
        {email && (
          <p className="text-xs text-muted-foreground">Compte connecté : <span className="font-medium">{email}</span></p>
        )}
        <div className="space-y-2 text-sm">
          <p className="font-medium">Accès demandé :</p>
          <ul className="list-disc list-inside text-muted-foreground space-y-1">
            <li>Lire votre profil, vos repas, symptômes et notes</li>
            <li>Ajouter des aliments à votre journal</li>
          </ul>
          {scopes.length > 0 && (
            <p className="text-xs text-muted-foreground">Scopes : {scopes.join(", ")}</p>
          )}
          <p className="text-xs text-muted-foreground">
            Cela ne contourne pas les protections d'accès de NutriMéno.
          </p>
        </div>
        <div className="flex gap-2 justify-end pt-2">
          <Button variant="ghost" disabled={busy} onClick={() => decide(false)}>
            Refuser
          </Button>
          <Button disabled={busy} onClick={() => decide(true)}>
            Autoriser
          </Button>
        </div>
      </Card>
    </main>
  );
}
