/**
 * Post-traitement des transcriptions Web Speech API (fr-FR).
 * Corrige le vocabulaire nutritionnel fréquemment mal reconnu,
 * les répétitions (« bégaiement ») et les nombres écrits en lettres.
 */

const NUMBER_WORDS: Record<string, string> = {
  zero: "0", zéro: "0", un: "1", une: "1", deux: "2", trois: "3", quatre: "4",
  cinq: "5", six: "6", sept: "7", huit: "8", neuf: "9", dix: "10",
  onze: "11", douze: "12", treize: "13", quatorze: "14", quinze: "15",
  seize: "16", vingt: "20", trente: "30", quarante: "40", cinquante: "50",
  soixante: "60", cent: "100", cents: "100", mille: "1000",
};

/** Corrections de vocabulaire : motif (regex, insensible à la casse) → remplacement */
const VOCAB: [RegExp, string][] = [
  [/\boméga\s*(trois|3)\b/gi, "oméga-3"],
  [/\bomega\s*(trois|3)\b/gi, "oméga-3"],
  [/\bvitamine\s*d[eé]?\b/gi, "vitamine D"],
  [/\bvitamine\s*b\s*douze\b/gi, "vitamine B12"],
  [/\bvitamine\s*b\s*12\b/gi, "vitamine B12"],
  [/\bvitamine\s*b\s*(six|6)\b/gi, "vitamine B6"],
  [/\bvitamine\s*b\s*(neuf|9)\b/gi, "vitamine B9"],
  [/\bphyto\s*[oe]strog[eè]nes?\b/gi, "phytoestrogènes"],
  [/\bcalcium?\b/gi, "calcium"],
  [/\bmagn[ée]sium?\b/gi, "magnésium"],
  [/\byaourts?\b/gi, "yaourt"],
  [/\bya[ou]rt\b/gi, "yaourt"],
  [/\bfromage\s*blanc?\b/gi, "fromage blanc"],
  [/\bskyr?\b/gi, "skyr"],
  [/\bquinoa?\b/gi, "quinoa"],
  [/\bl[ée]gumineuses?\b/gi, "légumineuses"],
  [/\bpois\s*chiches?\b/gi, "pois chiches"],
  [/\bavocats?\b/gi, "avocat"],
  [/\bsaumons?\b/gi, "saumon"],
  [/\bmaquereaux?\b/gi, "maquereau"],
  [/\bsardines?\b/gi, "sardine"],
  [/\bgrammes?\b/gi, "g"],
  [/\bmilli\s*litres?\b/gi, "ml"],
  [/\bcentilitres?\b/gi, "cl"],
  [/\bkilo(?:grammes?)?\b/gi, "kg"],
  [/\bbouff[ée]es?\s*de\s*chaleur\b/gi, "bouffées de chaleur"],
  [/\bm[ée]nopause?\b/gi, "ménopause"],
];

/** Supprime les répétitions immédiates de mots ou de courts groupes de mots. */
function dedupeStutter(text: string): string {
  let out = text.replace(/\b([\wàâçéèêëîïôûùüÿñæœ'-]{2,})(\s+\1\b)+/gi, "$1");
  // Répétition d'un groupe de 2-3 mots (« je voudrais je voudrais »)
  out = out.replace(
    /\b((?:[\wàâçéèêëîïôûùüÿñæœ'-]+\s+){1,2}[\wàâçéèêëîïôûùüÿñæœ'-]+)\s+\1\b/gi,
    "$1"
  );
  return out;
}

function wordsToNumbers(text: string): string {
  return text.replace(
    /\b([\wàâçéèêëîïôûùüÿñæœ]+)\b(?=\s*(?:g|ml|cl|kg)\b)/gi,
    (m) => NUMBER_WORDS[m.toLowerCase()] ?? m
  );
}

export function normalizeTranscript(raw: string): string {
  if (!raw) return "";
  let text = raw.replace(/\s+/g, " ").trim();
  text = dedupeStutter(text);
  for (const [pattern, replacement] of VOCAB) {
    text = text.replace(pattern, replacement);
  }
  text = wordsToNumbers(text);
  text = text.replace(/\s+([,.;!?])/g, "$1").replace(/\s+/g, " ").trim();
  return text;
}

/** Choisit la meilleure alternative parmi celles proposées par le moteur. */
export function pickBestAlternative(result: any): string {
  if (!result) return "";
  let best = result[0]?.transcript ?? "";
  let bestScore = result[0]?.confidence ?? 0;
  for (let i = 1; i < (result.length || 0); i++) {
    const alt = result[i];
    if (!alt) continue;
    const score = alt.confidence ?? 0;
    if (score > bestScore) {
      best = alt.transcript;
      bestScore = score;
    }
  }
  return best;
}
