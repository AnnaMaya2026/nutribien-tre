import { createContext, useContext, useState, useEffect, useRef, ReactNode } from "react";

/** Durée minimale d'arrière-plan au-delà de laquelle on revient à aujourd'hui. */
export const RESET_TO_TODAY_AFTER_MS = 15 * 60 * 1000;

type Ctx = {
  selectedDate: Date;
  setSelectedDate: (d: Date) => void;
  selectedDateStr: string;
  todayStr: string;
  isToday: boolean;
  isFuture: boolean;
};

const SelectedDateContext = createContext<Ctx | null>(null);

export function toYMD(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/**
 * Décide s'il faut revenir à aujourd'hui.
 * - hiddenAt : moment où la page a été cachée (null si jamais cachée)
 * - selectedStr : jour sélectionné (AAAA-MM-JJ)
 * - lastTodayStr : jour réel connu lors de la dernière vérification
 */
export function shouldResetToToday(
  hiddenAt: number | null,
  now: number,
  delayMs: number,
  selectedStr: string,
  lastTodayStr: string,
): boolean {
  const currentTodayStr = toYMD(new Date(now));
  if (hiddenAt !== null && now - hiddenAt >= delayMs) return selectedStr !== currentTodayStr;
  // Passage de minuit alors qu'on était sur « aujourd'hui »
  return selectedStr === lastTodayStr && lastTodayStr !== currentTodayStr;
}

export function SelectedDateProvider({ children }: { children: ReactNode }) {
  const [selectedDate, setSelectedDateState] = useState<Date>(new Date());
  const setSelectedDate = (d: Date) => setSelectedDateState(d);
  const selectedDateStr = toYMD(selectedDate);
  const [todayStr, setTodayStr] = useState(() => toYMD(new Date()));
  const hiddenAtRef = useRef<number | null>(null);
  const stateRef = useRef({ selectedDateStr, todayStr });
  stateRef.current = { selectedDateStr, todayStr };

  useEffect(() => {
    const check = () => {
      const now = Date.now();
      const { selectedDateStr: sel, todayStr: last } = stateRef.current;
      if (shouldResetToToday(hiddenAtRef.current, now, RESET_TO_TODAY_AFTER_MS, sel, last)) {
        setSelectedDateState(new Date(now));
      }
      hiddenAtRef.current = null;
      setTodayStr(toYMD(new Date(now)));
    };
    const onVisibility = () => {
      if (document.visibilityState === "hidden") hiddenAtRef.current = Date.now();
      else check();
    };
    const onPageShow = () => check();
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pageshow", onPageShow);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pageshow", onPageShow);
    };
  }, []);
  return (
    <SelectedDateContext.Provider
      value={{
        selectedDate,
        setSelectedDate,
        selectedDateStr,
        todayStr,
        isToday: selectedDateStr === todayStr,
        isFuture: selectedDateStr > todayStr,
      }}
    >
      {children}
    </SelectedDateContext.Provider>
  );
}

export function useSelectedDate() {
  const ctx = useContext(SelectedDateContext);
  if (!ctx) throw new Error("useSelectedDate must be used within SelectedDateProvider");
  return ctx;
}
