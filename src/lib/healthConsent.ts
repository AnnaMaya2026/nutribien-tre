import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

/** Version du texte de consentement ; à changer si le texte change, pour le redemander. */
export const HEALTH_CONSENT_VERSION = "2026-11";

export const HEALTH_CONSENT_TEXT =
  "J'accepte que NutriMéno traite mes données de santé (symptômes, poids, sommeil, compléments, conditions de santé que j'indique) pour personnaliser mon suivi et mes conseils. Ces données, ainsi que mes photos et mes messages, sont analysées par un prestataire d'intelligence artificielle situé aux États-Unis (OpenAI). Je peux retirer mon consentement à tout moment en supprimant mon compte.";

/** Données enregistrées avec le compte au moment du consentement. */
export function healthConsentMetadata() {
  return { health_consent_at: new Date().toISOString(), health_consent_version: HEALTH_CONSENT_VERSION };
}

/** Le consentement explicite aux données de santé a-t-il été donné pour la version en cours ? */
export function hasHealthConsent(user: User | null | undefined): boolean {
  const meta = user?.user_metadata;
  return !!meta?.health_consent_at && meta?.health_consent_version === HEALTH_CONSENT_VERSION;
}

/** Enregistre le consentement (date et version) sur le compte connecté. */
export async function recordHealthConsent() {
  const { error } = await supabase.auth.updateUser({ data: healthConsentMetadata() });
  if (error) throw error;
}
