// Contrôle commun : une fonction serveur ne répond qu'à une utilisatrice connectée.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

/**
 * Renvoie l'utilisatrice connectée, ou une réponse 401 à retourner telle quelle.
 * Le jeton est celui que l'application envoie automatiquement à chaque appel.
 */
export async function requireUser(
  req: Request,
  corsHeaders: Record<string, string>,
): Promise<{ user: { id: string; email?: string } } | Response> {
  const unauthorized = () =>
    new Response(JSON.stringify({ error: "Non autorisé" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return unauthorized();
  try {
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: { user } } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    return user ? { user } : unauthorized();
  } catch {
    return unauthorized();
  }
}
