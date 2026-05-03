import { ChevronLeft, ChevronRight, CalendarIcon } from "lucide-react";
import { useState } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useSelectedDate } from "@/hooks/useSelectedDate";

export default function DateSelector({ showBanner = true }: { showBanner?: boolean }) {
  const { selectedDate, setSelectedDate, isToday, isFuture } = useSelectedDate();
  const [open, setOpen] = useState(false);

  return (
    <>
      <div className="flex items-center gap-2 mb-3 bg-card rounded-xl p-2 card-soft">
        <button
          onClick={() => { const d = new Date(selectedDate); d.setDate(d.getDate() - 1); setSelectedDate(d); }}
          className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center text-foreground hover:bg-muted/80"
          aria-label="Jour précédent"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <button className="flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium text-foreground hover:bg-muted/40 rounded-lg">
              <CalendarIcon className="w-4 h-4 text-pink-deep" />
              <span className="capitalize">
                {isToday ? "Aujourd'hui — " : ""}
                {selectedDate.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
              </span>
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="center">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(d) => { if (d) { setSelectedDate(d); setOpen(false); } }}
              disabled={(date) => date > new Date()}
              initialFocus
              className={cn("p-3 pointer-events-auto")}
            />
          </PopoverContent>
        </Popover>
        <button
          onClick={() => { if (isToday) return; const d = new Date(selectedDate); d.setDate(d.getDate() + 1); if (d <= new Date()) setSelectedDate(d); }}
          disabled={isToday}
          className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center text-foreground hover:bg-muted/80 disabled:opacity-30 disabled:cursor-not-allowed"
          aria-label="Jour suivant"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {showBanner && !isToday && !isFuture && (
        <button
          onClick={() => setSelectedDate(new Date())}
          className="w-full mb-3 px-4 py-2.5 rounded-xl bg-pink-deep/10 border border-pink-deep/20 text-left text-sm text-foreground hover:bg-pink-deep/15 transition-colors"
        >
          📅 Vous consultez le {selectedDate.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
          <span className="block text-pink-deep font-semibold mt-0.5">Retour à aujourd'hui →</span>
        </button>
      )}
    </>
  );
}
