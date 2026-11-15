import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useFoodLogs } from "@/hooks/useFoodLogs";
import { useProfile } from "@/hooks/useProfile";
import { useSupplements } from "@/hooks/useSupplements";
import { averageSnapshots, buildDaySnapshot, type DaySnapshot } from "@/lib/daySnapshot";

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

/** Nombre de jours pris en compte pour le défi du jour. */
export const CHALLENGE_WINDOW_DAYS = 3;

/**
 * Moyenne des chiffres sur les derniers jours où des aliments ont été saisis
 * (compléments inclus), pour que le défi ne dépende pas d'une seule journée.
 * `days` = nombre de jours réellement pris en compte.
 */
export function useRecentAverageSnapshot(endDate: string, windowDays: number = CHALLENGE_WINDOW_DAYS): (DaySnapshot & { days: number }) | null {
  const { user } = useAuth();
  const { profile, isLoading: profileLoading } = useProfile();
  const { contributionsForDay, isLoading: supplementsLoading } = useSupplements(endDate);
  const startDate = useMemo(() => {
    const d = new Date(`${endDate}T12:00:00Z`);
    d.setUTCDate(d.getUTCDate() - (windowDays - 1));
    return d.toISOString().slice(0, 10);
  }, [endDate, windowDays]);

  const { data: logs, isLoading: logsLoading } = useQuery({
    queryKey: ["food_logs_recent_average", user?.id, startDate, endDate],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("food_logs")
        .select("*")
        .eq("user_id", user.id)
        .gte("logged_at", startDate)
        .lte("logged_at", endDate);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  return useMemo(() => {
    if (profileLoading || supplementsLoading || logsLoading || !logs) return null;
    const byDay = new Map<string, any[]>();
    for (const l of logs as any[]) byDay.set(l.logged_at, [...(byDay.get(l.logged_at) || []), l]);
    const snapshots = [...byDay.entries()].map(([day, dayLogs]) =>
      buildDaySnapshot({ profile, logs: dayLogs, contributions: contributionsForDay(day) as any }),
    );
    return averageSnapshots(snapshots, buildDaySnapshot({ profile, logs: [], contributions: {} }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileLoading, supplementsLoading, logsLoading, logs, profile]);
}
