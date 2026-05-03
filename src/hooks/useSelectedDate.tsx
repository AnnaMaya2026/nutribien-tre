import { createContext, useContext, useState, ReactNode } from "react";

type Ctx = {
  selectedDate: Date;
  setSelectedDate: (d: Date) => void;
  selectedDateStr: string;
  todayStr: string;
  isToday: boolean;
  isFuture: boolean;
};

const SelectedDateContext = createContext<Ctx | null>(null);

function toYMD(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function SelectedDateProvider({ children }: { children: ReactNode }) {
  const [selectedDate, setSelectedDateState] = useState<Date>(new Date());
  const setSelectedDate = (d: Date) => setSelectedDateState(d);
  const selectedDateStr = toYMD(selectedDate);
  const todayStr = toYMD(new Date());
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
