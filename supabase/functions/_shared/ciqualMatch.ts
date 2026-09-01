// Shared CIQUAL matcher for edge functions.
// Mirrors the journal search (RPC search_aliments_unaccent) + the token
// scoring of src/lib/ciqualMatcher.ts, since edge functions cannot import
// from src/.

const STOPWORDS = new Set([
  "de", "du", "des", "le", "la", "les", "un", "une", "et", "au", "aux",
  "a", "l", "d", "en", "sans", "avec", "ou", "pour", "sur",
  "bio", "nature", "naturel", "100", "pur", "pure",
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
  "farci", "fourre", "aromatise", "type ", "sucre", "sur lit de", "puree",
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

  // Sub-parts / derived forms the user did not ask for.
  // Only penalise when the *head* of the CIQUAL name is not the requested
  // food itself ("Oeuf, blanc" -> tete "oeuf" = demande, on ne penalise pas
  // le rang; "Oeufs de cabillaud" -> tete differente, on penalise).
  const headIsRequested = headTokens.every((t) => qSet.has(t)) || head === q || head.startsWith(q);
  if (!headIsRequested) {
    for (const part of ["blanc", "jaune", "poudre", "germe", "son"]) {
      const re = new RegExp(`\\b${part}\\b`);
      if (re.test(fullNorm) && !re.test(qNorm)) { score -= 0.6; break; }
    }
  }

  // Complement "X de Y" dans la tete, dont Y n'est pas demande
  // ("oeufs de cabillaud" pour "oeufs", "salade de chou" pour "chou")
  const compl = /\b(de|d|du|des|a|au|aux)\b/.test(nom.split(",")[0].toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""))
    ? headTokens.filter((t) => !qSet.has(t))
    : [];
  if (compl.length > 0 && headTokens.length > qTokens.length) score -= 0.6;

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
  // "appertise" is legitimate for starchy foods, penalised elsewhere
  if (/\bappertise/.test(fullNorm) && !STARCHY_RE.test(qNorm)) score -= 0.5;

  // Composed dish markers ("... a la ...", "... aux ...")
  if (/\b(a la|a l|aux|au)\b/.test(fullNorm)) score -= 0.25;

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
  const terms: string[] = [];
  const norm = normalize(name);
  const sing = singularize(name);
  if (sing) terms.push(sing);
  if (norm && norm !== sing) terms.push(norm);
  // Fallback: the longest meaningful token (e.g. "poivron" from "poivron rouge")
  const toks = tokenize(name).sort((a, b) => b.length - a.length);
  if (toks[0] && !terms.includes(toks[0])) terms.push(toks[0]);

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
    const s = scoreCandidate(name, row.nom || "", row.groupe || "");
    if (!best || s > best.score) best = { row, score: s };
  }
  if (!best || best.score < CIQUAL_MATCH_THRESHOLD) return null;
  return best;
}
