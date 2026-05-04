import { searchCiqual, type CiqualFood } from "@/lib/ciqual";

const STOPWORDS = new Set([
  "de", "du", "des", "le", "la", "les", "un", "une", "et", "au", "aux",
  "a", "l", "d", "en", "sans", "avec", "ou", "pour", "sur",
  "bio", "nature", "naturel", "100", "pur", "pure",
]);

function tokenize(s: string): string[] {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9 ]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length >= 3 && !STOPWORDS.has(t));
}

function similarity(a: string, b: string): number {
  const ta = new Set(tokenize(a));
  const tb = new Set(tokenize(b));
  if (ta.size === 0 || tb.size === 0) return 0;
  let inter = 0;
  for (const t of ta) if (tb.has(t)) inter++;
  // Dice coefficient
  return (2 * inter) / (ta.size + tb.size);
}

/**
 * Look for the best CIQUAL match for a free-form product name.
 * Returns the food and a 0..1 similarity score.
 * If score < 0.5 returns null.
 */
export async function findCiqualMatch(
  productName: string
): Promise<{ food: CiqualFood; score: number } | null> {
  const tokens = tokenize(productName);
  if (tokens.length === 0) return null;

  // Search using the longest meaningful token (likely the main ingredient)
  const sorted = [...tokens].sort((a, b) => b.length - a.length);
  const candidates: CiqualFood[] = [];
  for (const tok of sorted.slice(0, 2)) {
    try {
      const res = await searchCiqual(tok);
      candidates.push(...res);
      if (candidates.length >= 30) break;
    } catch (e) {
      // ignore individual search failures
    }
  }
  if (candidates.length === 0) return null;

  let best: { food: CiqualFood; score: number } | null = null;
  for (const c of candidates) {
    const s = similarity(productName, c.nom);
    if (!best || s > best.score) best = { food: c, score: s };
  }
  if (!best || best.score < 0.5) return null;
  return best;
}
