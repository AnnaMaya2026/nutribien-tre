import { matchCiqualFood, type CiqualFood } from "@/lib/ciqual";

import { isFishRoeMismatch } from "@/lib/ciqualRoe";
export { isFishRoeMismatch };

/**
 * Meilleur aliment CIQUAL pour un nom de produit libre (code-barres).
 * Délègue au moteur unique de reconnaissance (_shared/ciqualMatch.ts).
 */
export async function findCiqualMatch(
  productName: string,
): Promise<{ food: CiqualFood; score: number } | null> {
  try {
    return await matchCiqualFood(productName);
  } catch {
    return null;
  }
}
