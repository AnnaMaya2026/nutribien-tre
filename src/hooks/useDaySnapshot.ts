import { useMemo } from "react";
import { useFoodLogs } from "@/hooks/useFoodLogs";
import { useProfile } from "@/hooks/useProfile";
import { useSupplements } from "@/hooks/useSupplements";
import { buildDaySnapshot, type DaySnapshot } from "@/lib/daySnapshot";

/** Date à Paris (AAAA-MM-JJ), décalée de `offsetDays` jours. */
export function parisDay(offsetDays = 0): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris" }).format(new Date(Date.now() + offsetDays * 86400_000));
}

/**
 * Chiffres d'un jour identiques à ceux de l'accueil, prêts à être envoyés à Sophie.
 * Vaut null tant que le profil, le journal et les compléments ne sont pas chargés,
 * pour ne jamais envoyer de faux zéros.
 */
export function useDaySnapshot(date: string = parisDay()): DaySnapshot | null {
  const { profile, isLoading: profileLoading } = useProfile();
  const { logs, isLoading: logsLoading } = useFoodLogs(date);
  const { contributions, isLoading: supplementsLoading } = useSupplements(date);
  const loading = profileLoading || logsLoading || supplementsLoading;
  return useMemo(
    () => (loading ? null : buildDaySnapshot({ profile, logs: logs as any[], contributions: contributions as any })),
    [loading, profile, logs, contributions],
  );
}
