/** Écart relatif maximal toléré entre les kcal retenues et la mention « Environ X kcal » de la fiche. */
export const APPROX_KCAL_MAX_GAP = 0.2;

/** true si les kcal retenues s'écartent de plus du seuil de la valeur imprimée (inconnue → jamais bloquant). */
export function isKcalGapBlocking(computed: number | null, approx: number | null): boolean {
  if (approx === null || !isFinite(approx) || approx <= 0) return false;
  if (computed === null || !isFinite(computed)) return true;
  return Math.abs(computed - approx) / approx > APPROX_KCAL_MAX_GAP;
}
