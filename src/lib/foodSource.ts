/** Origine d'une ligne du journal (colonne food_logs.source). */
export const FOOD_SOURCES = {
  recherche: "Recherche",
  voix: "Voix",
  "code-barres": "Code-barres",
  photo: "Photo d'assiette",
  fiche: "Fiche recette",
  etiquette: "Étiquette",
  menu: "Menu enregistré",
  favori: "Favori",
  hier: "Repris d'hier",
} as const;

export type FoodSource = keyof typeof FOOD_SOURCES;

/** « Voix · compté comme : Poulet, blanc, rôti », ou null si l'origine est inconnue (anciennes lignes). */
export function describeFoodOrigin(log: { source?: string | null; ciqual_name?: string | null; food_name?: string | null }): string | null {
  const parts: string[] = [];
  const label = log.source ? FOOD_SOURCES[log.source as FoodSource] ?? log.source : null;
  if (label) parts.push(label);
  if (log.ciqual_name && log.ciqual_name !== log.food_name) parts.push(`compté comme : ${log.ciqual_name}`);
  return parts.length ? parts.join(" · ") : null;
}
