// Shared CIQUAL matcher for edge functions.
// Mirrors the journal search (RPC search_aliments_unaccent) + the token
// scoring of src/lib/ciqualMatcher.ts, since edge functions cannot import
// from src/.

const STOPWORDS = new Set([
  "de", "du", "des", "le", "la", "les", "un", "une", "et", "au", "aux",
  "a", "l", "d", "en", "sans", "avec", "ou", "pour", "sur",
  "bio", "nature", "naturel", "100", "pur", "pure", "estime", "estimee",
]);

export function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/\u0153/g, "oe")
    .replace(/\u00e6/g, "ae")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** French singularisation of a single word: fraises -> fraise, oeufs -> oeuf */
export function singularizeWord(w: string): string {
  if (w.length <= 3) return w;
  if (/eaux$/.test(w)) return w.slice(0, -1);      // poireaux -> poireau
  if (/aux$/.test(w)) return w.slice(0, -3) + "al"; // vegetaux -> vegetal
  if (/(s|x)$/.test(w)) return w.slice(0, -1);      // fraises -> fraise
  return w;
}

export function singularize(s: string): string {
  return normalize(s).split(" ").map(singularizeWord).join(" ").trim();
}

export function tokenize(s: string): string[] {
  return singularize(s)
    .split(" ")
    .filter((t) => t.length >= 3 && !STOPWORDS.has(t));
}

// Terms that indicate a processed / composed dish rather than a raw food
const PENALTY_TERMS = [
  "preemballe", "preemballee", "prepare", "preparee", "artisanal", "artisanale",
  "industriel", "industrielle", "surgele", "surgelee",
  "confiture", "sauce", "tartinade", "nuggets", "croquette", "muffin", "crepe",
  "tarte", "boisson", "nectar", "sirop", "coulis", "salade de", "gateau",
  "farci", "fourre", "aromatise", "type ", "sucre", "sur lit de", "puree", "pane",
];

const FRESH_RE = /\b(cru|crue|crus|crues|frais|fraiche|fraiches)\b/;
const COOKED_RE = /\b(cuit|cuite|cuits|cuites|bouilli|bouillie|appertise|appertisee|vapeur|etuve|etuvee|precuit|precuite)\b/;
const DRY_RE = /\b(sec|seche|seches|seche|deshydrate|deshydratee|farine|cru|crue|crus|crues|grain)\b/;

// Cooking qualifiers explicitly written by the user -> we trust her wording
const USER_QUALIFIER_RE =
  /\b(cru|crue|crus|crues|frais|fraiche|fraiches|cuit|cuite|cuits|cuites|bouilli|bouillie|sec|seche|seches|deshydrate|appertise|appertisee|conserve|vapeur|grille|grillee|roti|rotie|poele|poelee|frit|frite|farine)\b/;

// Foods that are eaten cooked: the plain name means the cooked form
const STARCHY_RE =
  /\b(riz|pate|pates|spaghetti|macaroni|tagliatelle|penne|semoule|couscous|boulgour|boulghour|quinoa|ble|epeautre|orge|millet|sarrasin|polenta|lentille|lentilles|pois|chiche|chiches|haricot|haricots|feve|feves|flageolet|soja|patate|pomme de terre|pommes de terre|pate a|nouille|nouilles)\b/;

// Groups where the raw/fresh form is the sensible default
const FRESH_GROUPS = ["fruits, légumes, légumineuses et oléagineux"];

// --- Termes composes / prepares -------------------------------------------
// Un appariement partiel sur un terme compose est un faux positif deguise:
// on exige que la ligne CIQUAL couvre TOUS les tokens de contenu du terme.
const COMPOSITION_MARKERS = [
  "salade de", "poelee", "poele de", "saute", "sautee", "grille", "grillee",
  "roti", "rotie", "farci", "farcie", "gratin", "puree de", "tranche de",
  "tranches de", "filet de", "filets de", "sur lit de", "facon", "mijote",
  "brouille", "brouillee", "wok",
];

// Mots de preparation: ils decrivent la forme, pas un ingredient a couvrir
const MARKER_WORDS = new Set([
  "salade", "poelee", "poele", "saute", "sautee", "grille", "grillee", "roti",
  "rotie", "farci", "farcie", "gratin", "puree", "tranche", "tranches",
  "filet", "filets", "lit", "facon", "mijote", "estime", "brouille", "brouillee", "wok",
]);

export function isComposedQuery(qNorm: string): boolean {
  if (COMPOSITION_MARKERS.some((m) => qNorm.includes(m))) return true;
  // garniture explicite: "omelette aux legumes", "poulet a la creme"
  if (/\b(aux|a la|a l)\s+[a-z0-9]{3,}/.test(qNorm)) return true;
  // coordination "X et Y" entre deux aliments distincts
  const parts = qNorm.split(/\bet\b/).map((p) => p.trim()).filter(Boolean);
  return parts.length > 1 && parts.every((p) => tokenize(p).length > 0);
}

// --- Vocabulaire courant -> vocabulaire CIQUAL ------------------------------
const SYNONYMS: [RegExp, string][] = [
  [/\ben (conserve|boite|bocal)\b/g, "appertise"],
  [/\bau naturel\b/g, "appertise egoutte"],
  [/\b(congele|congelee|surgelee)\b/g, "surgele"],
  [/\b(allege|allegee|leger|legere)\b/g, "teneur reduite"],
  [/\bfait maison\b/g, "fait maison"],
];

// Mots qui ne sont pas des distinctions CIQUAL
const NOISE_RE = /\b(bio|extra|premium|marque|maxi|mini)\b/g;

/** Normalise un terme saisi vers le registre de la table CIQUAL. */
export function applySynonyms(name: string): string {
  let s = normalize(name.replace(/\([^)]*\)/g, " ")); // marques entre parentheses
  for (const [re, rep] of SYNONYMS) s = s.replace(re, rep);
  s = s.replace(NOISE_RE, " ");
  return s.replace(/\s+/g, " ").trim();
}


export function contentTokens(qNorm: string): string[] {
  return tokenize(qNorm).filter((t) => !MARKER_WORDS.has(t));
}

export interface ScoredCandidate {
  row: any;
  score: number;
}


/** Score a CIQUAL row against a (raw) query name. 0..~1.5 */
export function scoreCandidate(query: string, nom: string, groupe = ""): number {
  const qTokens = tokenize(query);
  if (qTokens.length === 0) return 0;
  const qSet = new Set(qTokens);

  const fullNorm = singularize(nom);
  const head = singularize(nom.split(",")[0]);          // "Poivron rouge" part
  const headTokens = tokenize(nom.split(",")[0]);
  const headSet = new Set(headTokens);
  if (headSet.size === 0) return 0;

  // Dice coefficient on the head of the name (before the first comma)
  let inter = 0;
  for (const t of qSet) if (headSet.has(t)) inter++;
  let score = (2 * inter) / (qSet.size + headSet.size);

  // Anchoring: the name starts with the searched term
  const q = qTokens.join(" ");
  if (head === q) score += 0.45;
  else if (head.startsWith(q)) score += 0.3;
  else if (fullNorm.startsWith(q)) score += 0.2;

  // --- Raw vs cooked preference -------------------------------------------
  const qNorm = singularize(query);
  const userSpecified = USER_QUALIFIER_RE.test(qNorm);
  if (!userSpecified) {
    const isStarchy = STARCHY_RE.test(qNorm);
    if (isStarchy) {
      // Cooked / canned form is what the user actually eats
      if (COOKED_RE.test(fullNorm)) score += 0.25;
      else if (DRY_RE.test(fullNorm)) score -= 0.6;
    } else if (FRESH_GROUPS.includes((groupe || "").trim().toLowerCase())) {
      // Vegetables, salads, herbs, fruits: raw / fresh is the default form
      if (FRESH_RE.test(fullNorm)) score += 0.15;
    }
  } else {
    // The user wrote a qualifier: reward rows that agree, penalise the opposite
    const wantsCooked = /\b(cuit|cuite|cuits|cuites|bouilli|bouillie|appertise|appertisee|conserve|vapeur|grille|grillee|roti|rotie|poele|poelee|frit|frite)\b/.test(qNorm);
    const wantsRaw = /\b(cru|crue|crus|crues|frais|fraiche|fraiches)\b/.test(qNorm);
    if (wantsCooked) {
      if (COOKED_RE.test(fullNorm) || /\b(grille|grillee|roti|rotie|poele|poelee|frit|frite)\b/.test(fullNorm)) score += 0.25;
      else if (DRY_RE.test(fullNorm)) score -= 0.4;
    } else if (wantsRaw) {
      if (FRESH_RE.test(fullNorm)) score += 0.25;
      else if (COOKED_RE.test(fullNorm)) score -= 0.4;
    }
  }

  // Sub-parts / derived forms the user did not ask for
  for (const part of ["blanc", "jaune", "poudre", "germe", "son"]) {
    const re = new RegExp(`\\b${part}\\b`);
    if (re.test(fullNorm) && !re.test(qNorm)) { score -= 0.6; break; }
  }

  // Complement "X de Y" dans la tete, ou Y n'est pas demande
  // ("Oeufs de cabillaud" pour "oeufs" -> rejet ; "Huile d'olive vierge" pour
  // "huile d'olive" -> le complement 'olive' est demande, pas de penalite).
  // Les qualificatifs introduits par au/aux/a la ("Mozzarella au lait de vache")
  // sont des precisions, pas un autre aliment: pas de penalite.
  // On ne regarde que la partie de la tete AVANT un qualificatif au/aux/a la:
  // "Mozzarella au lait de vache" -> prefixe "mozzarella" -> aucun complement.
  const headPrefix = head.split(/\b(?:au|aux|a la|a l)\b/)[0];
  const complMatch = headPrefix.match(/\b(?:de|d|du|des)\s+([a-z0-9]+)/);
  if (complMatch && !qSet.has(singularizeWord(complMatch[1]))) score -= 0.6;


  // --- Termes composes: exiger une couverture complete ----------------------
  if (isComposedQuery(qNorm)) {
    const content = contentTokens(qNorm);
    const covered = content.every((t) => fullNorm.includes(t));
    if (!covered) score -= 1;
  }


  // Baby food is never the intended match for an adult journal entry
  if ((groupe || "").trim().toLowerCase() === "aliments infantiles") score -= 1;


  // Penalise processed foods and composed dishes
  for (const p of PENALTY_TERMS) {
    if (fullNorm.includes(p)) { score -= 0.5; break; }
  }
  // "appertise" is legitimate for starchy foods (or when explicitly asked),
  // penalised elsewhere
  if (/\bappertise/.test(fullNorm) && !STARCHY_RE.test(qNorm) && !/appertise/.test(qNorm)) score -= 0.5;

  // Composed dish markers ("... a la ...", "... aux ...") dans la tete,
  // sauf quand la tete commence par le terme demande (simple precision).
  if (/\b(a la|a l|aux|au)\b/.test(head) && !head.startsWith(q)) score -= 0.25;

  // Long, over-specific names are less likely to be the plain food
  if (headTokens.length > qTokens.length + 2) score -= 0.15;


  return score;
}

export const CIQUAL_MATCH_THRESHOLD = 0.6;


/**
 * Find the best CIQUAL row for a free-form food name.
 * Returns null when no candidate reaches the confidence threshold.
 */
export async function matchCiqual(
  supabase: any,
  name: string,
): Promise<{ row: any; score: number } | null> {
  const cleaned = applySynonyms(name) || normalize(name);
  const terms: string[] = [];
  const norm = normalize(cleaned);
  const sing = singularize(cleaned);
  if (sing) terms.push(sing);
  if (norm && norm !== sing) terms.push(norm);
  // Fallback: chaque token de contenu (le 1er d'abord: "sardine" de
  // "sardine appertise", puis "poivron" de "poivron rouge")
  for (const t of tokenize(cleaned).slice(0, 3)) {
    if (!terms.includes(t)) terms.push(t);
  }


  const seen = new Set<number>();
  const candidates: any[] = [];
  for (const term of terms) {
    if (!term || term.length < 2) continue;
    const { data, error } = await supabase.rpc("search_aliments_unaccent", {
      search_term: term,
      max_results: 200,
    });
    if (error) continue;
    for (const row of (data || [])) {
      const kcal = Number(row.calories_100g);
      // Exclude rows with NULL or 0 kcal: silent traps
      if (!isFinite(kcal) || kcal <= 0) continue;
      if (seen.has(row.id)) continue;
      seen.add(row.id);
      candidates.push(row);
    }
    if (candidates.length >= 200) break;
  }
  if (candidates.length === 0) return null;

  let best: { row: any; score: number } | null = null;
  for (const row of candidates) {
    const s = scoreCandidate(cleaned, row.nom || "", row.groupe || "");
    // A score egal, le nom le plus court est le plus generique -> on le prefere
    const shorter = best && s === best.score &&
      String(row.nom || "").length < String(best.row.nom || "").length;
    if (!best || s > best.score || shorter) best = { row, score: s };
  }
  if (!best || best.score < CIQUAL_MATCH_THRESHOLD) return null;
  return best;
}
