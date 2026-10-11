const ROE_FISH_RE = /\b(cabillaud|saumon|lompe|truite|poisson|esturgeon|hareng|caviar|tarama)\b/;
const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/œ/g, "oe");
/** « œuf(s) » seul = œuf de poule ; œufs de poisson seulement si le poisson est nommé. */
export function isFishRoeMismatch(query: string, nom: string): boolean {
  const q = norm(query), n = norm(nom || "");
  if (!/\boeufs?\b/.test(n) || !ROE_FISH_RE.test(n)) return false;
  return !/\b(cabillaud|saumon|lompe|truite)\b/.test(q);
}

