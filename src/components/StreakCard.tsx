import { useStreakData } from "@/hooks/useStreakData";
import { Flame } from "lucide-react";

export default function StreakCard() {
  const { currentStreak = 0, bestStreak = 0, week = [], isLoading } = useStreakData() as any;

  if (isLoading) return null;

  const broken = currentStreak === 0 && bestStreak > 0;

  return (
    <div className="bg-card rounded-2xl p-5 card-soft mb-4 animate-fade-in border border-pink-deep/10">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-400 to-pink-500 flex items-center justify-center shrink-0">
          <Flame className="w-6 h-6 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          {broken ? (
            <>
              <h3 className="text-base font-bold text-foreground">💪 Recommence aujourd'hui !</h3>
              <p className="text-xs text-muted-foreground">Ton record : {bestStreak} jours consécutifs</p>
            </>
          ) : (
            <>
              <h3 className="text-base font-bold text-foreground">
                🔥 {currentStreak} {currentStreak <= 1 ? "jour" : "jours"} consécutif{currentStreak > 1 ? "s" : ""}
              </h3>
              <p className="text-xs text-muted-foreground">
                {currentStreak === 0
                  ? "Démarre ta série aujourd'hui !"
                  : currentStreak < 3
                  ? "Bien joué, continue sur ta lancée !"
                  : "Tu es sur une belle lancée !"}
                {bestStreak > currentStreak ? ` · Record : ${bestStreak}` : ""}
              </p>
            </>
          )}
        </div>
      </div>

      {/* Weekly calendar */}
      <div className="grid grid-cols-7 gap-1.5 mt-3">
        {week.map((d: any, idx: number) => {
          const icon = d.status === "full" ? "✅" : d.status === "partial" ? "🟡" : "⭕";
          const bg = d.status === "full" ? "bg-green-100 dark:bg-green-900/30" : d.status === "partial" ? "bg-orange-100 dark:bg-orange-900/30" : "bg-muted";
          return (
            <div key={d.date + idx} className={`flex flex-col items-center gap-1 rounded-lg py-2 ${bg}`}>
              <span className="text-[10px] text-muted-foreground font-medium">{d.label}</span>
              <span className="text-base leading-none">{icon}</span>
            </div>
          );
        })}
      </div>
      <div className="mt-2 flex items-center justify-center gap-3 text-[10px] text-muted-foreground">
        <span>✅ Complet</span>
        <span>🟡 Partiel</span>
        <span>⭕ Vide</span>
      </div>
    </div>
  );
}
