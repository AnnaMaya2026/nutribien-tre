// Contexte symptômes partagé par Sophie (discussion, message du soir).
// « Aujourd'hui » = date du jour à Paris, comme l'application.

export const SYMPTOM_LABELS: Record<string, string> = {
  fatigue: "Fatigue",
  bouffees_chaleur: "Bouffées de chaleur",
  insomnie: "Insomnie",
  sautes_humeur: "Sautes d'humeur",
  prise_de_poids: "Prise de poids",
  secheresse_cutanee: "Sécheresse cutanée",
  douleurs_articulaires: "Douleurs articulaires",
  brain_fog: "Troubles de la mémoire",
  anxiete: "Anxiété",
  baisse_libido: "Baisse de libido",
  maux_de_tete: "Maux de tête",
  palpitations: "Palpitations",
  ballonnements: "Ballonnements",
  irritabilite: "Irritabilité",
  deprime: "Déprime / mélancolie",
  transpiration_nocturne: "Transpiration nocturne",
  fragilite_ongles_cheveux: "Fragilité ongles et cheveux",
  secheresse_vaginale: "Sécheresse vaginale",
};

export const symptomLabel = (k: string) =>
  SYMPTOM_LABELS[k] || k.replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase());

/** Date YYYY-MM-DD à Paris, décalée de `offsetDays` jours. */
export function parisDate(offsetDays = 0): string {
  const d = new Date(Date.now() + offsetDays * 86400_000);
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris", year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
}

/** Symptômes d'une ligne symptom_logs : [{key, label, score|null}] */
export function symptomsOfLog(log: any): { key: string; label: string; score: number | null }[] {
  if (!log) return [];
  const scores: Record<string, number> = log.symptom_scores && typeof log.symptom_scores === "object" ? log.symptom_scores : {};
  for (const k of ["fatigue", "bouffees_chaleur", "insomnie", "sautes_humeur"]) {
    if (typeof log[k] === "number" && log[k] > 0 && scores[k] === undefined) scores[k] = log[k];
  }
  const keys = new Set<string>([...(Array.isArray(log.selected_symptoms) ? log.selected_symptoms : []), ...Object.keys(scores)]);
  return [...keys].map((k) => ({ key: k, label: symptomLabel(k), score: typeof scores[k] === "number" ? scores[k] : null }));
}

const fmt = (s: { label: string; score: number | null }[]) =>
  s.map((x) => (x.score !== null ? `${x.label} ${x.score}/10` : x.label)).join(", ");

export const SYMPTOM_RULE = `RÈGLE SYMPTÔMES (absolue) : n'affirme JAMAIS que l'utilisatrice n'a pas de symptômes si la donnée est absente ou si tu n'es pas sûre. Si aucun symptôme n'est saisi aujourd'hui, dis seulement « je ne vois pas de symptôme saisi aujourd'hui », sans en tirer de jugement (jamais « c'est bien », « bonne nouvelle »…). Désigne toujours les symptômes par leur nom français.`;

/** Lit les symptômes du jour et des 7 derniers jours (Paris) et renvoie un bloc de texte. */
export async function buildSymptomContext(supabase: any, userId: string) {
  const today = parisDate(0);
  const from = parisDate(-7);
  const { data, error } = await supabase
    .from("symptom_logs")
    .select("logged_at, selected_symptoms, symptom_scores, fatigue, bouffees_chaleur, insomnie, sautes_humeur")
    .eq("user_id", userId)
    .gte("logged_at", from)
    .lte("logged_at", today)
    .order("logged_at", { ascending: false });
  if (error) {
    return { today, todaySymptoms: [], text: `\n🩺 SYMPTÔMES : données indisponibles (erreur de lecture) — ne conclus rien sur les symptômes.\n` };
  }
  const rows = data || [];
  const todayRow = rows.find((r: any) => r.logged_at === today);
  const todaySymptoms = symptomsOfLog(todayRow);
  const past = rows.filter((r: any) => r.logged_at !== today);
  const todayLine = todaySymptoms.length ? fmt(todaySymptoms) : "aucun symptôme saisi (donnée absente, ce n'est PAS une absence de symptômes)";
  const pastLines = past.length
    ? past.map((r: any) => `  - ${r.logged_at} : ${fmt(symptomsOfLog(r)) || "saisie vide"}`).join("\n")
    : "  - aucune saisie";
  const text = `\n🩺 SYMPTÔMES SAISIS (date de Paris)\n- Aujourd'hui (${today}) : ${todayLine}\n- 7 derniers jours :\n${pastLines}\n`;
  return { today, todaySymptoms, text };
}
