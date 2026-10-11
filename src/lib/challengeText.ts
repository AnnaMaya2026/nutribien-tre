/** Nettoie un texte de défi : retire « Demain : », « Aujourd'hui : » et toute ponctuation en tête. */
export function cleanChallengeText(t: string | null | undefined): string {
  let s = String(t || "").trim();
  for (let i = 0; i < 3; i++) {
    s = s.replace(/^\s*(demain|aujourd['’]hui)\s*[:,\-–—]?\s*/i, "").replace(/^[\s,;:.!?\-–—…·•]+/, "");
  }
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Date AAAA-MM-JJ en heure de Paris, décalée de `offsetDays` jours. */
export function parisDateKey(now: Date = new Date(), offsetDays = 0): string {
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Paris", year: "numeric", month: "2-digit", day: "2-digit",
  }).format(now);
  if (!offsetDays) return today;
  const [y, m, d] = today.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + offsetDays));
  return dt.toISOString().slice(0, 10);
}

/** Heure (0–23) à Paris. */
export function parisHour(now: Date = new Date()): number {
  return Number(new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Paris", hour: "2-digit", hourCycle: "h23" }).format(now));
}
