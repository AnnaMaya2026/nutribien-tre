// Valeur de secours (mg pour 100 g) quand un produit scanné ne donne pas sa
// teneur en phytoestrogènes.
//
// Le seuil de l'ANSES (0,02 mg/kg/jour, mars 2025) porte sur les ISOFLAVONES,
// présentes surtout dans le soja. On n'estime donc que les produits à base de
// soja, où les isoflavones dominent. Les graines de lin, lentilles et pois chiches
// sont retirés : leurs phytoestrogènes sont surtout des lignanes, que ce seuil
// ne couvre pas, et les anciennes valeurs étaient en µg lues comme des mg.
//
// Source : Thompson et al., Nutr Cancer 2006;54(2):184-201 (µg/100 g convertis en mg).
// Produit à base de soja non listé : null (inconnu), jamais 0.

export const PHYTO_KEYWORDS: { keywords: string[]; mg_per_100g: number }[] = [
  { keywords: ["lait de soja", "boisson soja", "boisson au soja", "boisson vegetale soja"], mg_per_100g: 2.96 },
  { keywords: ["yaourt soja", "yaourt au soja", "dessert soja", "dessert au soja", "yogourt soja"], mg_per_100g: 10.28 },
  { keywords: ["tofu"], mg_per_100g: 27.15 },
  { keywords: ["graines de soja", "graine de soja", "feves de soja", "soja en grains"], mg_per_100g: 103.92 },
];

function norm(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

/** Isoflavones estimées (mg/100 g) pour un produit à base de soja, sinon null. */
export function estimatePhytoestrogensPer100g(productName: string): number | null {
  const n = norm(productName);
  for (const entry of PHYTO_KEYWORDS) {
    if (entry.keywords.some((k) => n.includes(norm(k)))) {
      return entry.mg_per_100g;
    }
  }
  return null;
}
