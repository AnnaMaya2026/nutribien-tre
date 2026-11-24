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

/**
 * Nombre maximal d'appels par jour et par utilisatrice, pour les fonctions qui
 * consomment le crédit OpenAI. Au-delà, la fonction répond 429.
 */
export const DAILY_CALL_LIMITS: Record<string, number> = {
  "analyze-meal-photo": 30,
  "analyze-recipe-card": 20,
  "analyze-product-label": 30,
  "analyze-supplement-label": 20,
  "analyze-fridge-photo": 10,
  "voice-parse": 80,
  "parse-menu-foods": 30,
  "tts-sophie": 60,
  "generate-recipes": 20,
  "recipe-ideas": 20,
  "send-feedback-email": 10,
};

const parisToday = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris" }).format(new Date());

/**
 * Compte un appel (table api_usage) et renvoie une réponse 429 si la limite du
 * jour est dépassée, sinon null. Si le comptage échoue, l'appel est laissé
 * passer : une panne du compteur ne doit pas bloquer l'application.
 */
export async function enforceDailyLimit(
  userId: string,
  functionName: string,
  corsHeaders: Record<string, string>,
): Promise<Response | null> {
  const limit = DAILY_CALL_LIMITS[functionName];
  if (!limit) return null;
  try {
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data, error } = await supabase.rpc("increment_api_usage", {
      p_user_id: userId,
      p_function_name: functionName,
      p_usage_date: parisToday(),
    });
    if (error || typeof data !== "number") return null;
    if (data > limit) {
      return new Response(
        JSON.stringify({ error: "daily_limit", message: `Tu as atteint la limite de ${limit} utilisations pour aujourd'hui. Réessaie demain.` }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
  } catch {
    return null;
  }
  return null;
}
