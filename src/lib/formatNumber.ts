// Affichage unique des nombres : virgule française, pas de décimales inutiles.

const nf0 = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 });
const nf1 = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 1 });

const toNumber = (v: unknown): number | null => {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

/** Calories : nombre entier. Valeur inconnue : « — ». */
export function fmtKcal(v: unknown): string {
  const n = toNumber(v);
  return n === null ? "—" : nf0.format(n);
}

/** Quantité (g, mg, µg) : une décimale au plus, entier à partir de 100. Valeur inconnue : « — ». */
export function fmtQty(v: unknown): string {
  const n = toNumber(v);
  if (n === null) return "—";
  return Math.abs(n) >= 100 ? nf0.format(n) : nf1.format(n);
}
