import { shiftKey } from "@/hooks/useStreakData";

export interface SpreadLog {
  logged_at: string; // YYYY-MM-DD
  taken: boolean;
  quantite: number | null;
}

/**
 * Complément à périodicité N (N >= 2) : une prise cochée le jour J compte
 * dose ÷ N chaque jour de J à J+N-1 inclus.
 * Retourne le multiplicateur de dose pour `day` : somme des quantités des logs
 * taken = true dont logged_at ∈ [day-(N-1), day], divisée par N. Aucun arrondi.
 * Quantité absente = 1 (même règle que takenQuantity).
 */
export function spreadMultiplier(logs: SpreadLog[], day: string, n: number): number {
  const from = shiftKey(day, -(n - 1));
  let sum = 0;
  for (const l of logs) {
    if (!l.taken) continue;
    if (l.logged_at < from || l.logged_at > day) continue;
    sum += l.quantite != null ? Number(l.quantite) : 1;
  }
  return sum / n;
}
