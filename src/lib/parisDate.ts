/**
 * Jour (AAAA-MM-JJ) d'un instant, en heure de Paris.
 * À utiliser à la place de toISOString().split("T")[0], qui donne le jour en
 * heure universelle et renvoie la veille entre minuit et 1 h (2 h en été).
 */
export function parisDayKey(date: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris", year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
}
