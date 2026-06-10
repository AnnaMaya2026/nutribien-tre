import { Sparkles, TrendingUp, Lightbulb } from "lucide-react";

export default function TomorrowPreview() {
  return (
    <div className="bg-gradient-to-br from-primary/5 to-card rounded-2xl p-5 card-soft mb-4 border border-dashed border-pink-deep/30 animate-fade-in">
      <h3 className="text-base font-semibold text-foreground mb-3 flex items-center gap-2">
        👀 Demain Sophie analysera...
      </h3>
      <div className="space-y-2.5">
        <div className="flex items-start gap-2.5">
          <Sparkles className="w-4 h-4 text-pink-deep shrink-0 mt-0.5" />
          <p className="text-sm text-muted-foreground">Tes corrélations des 7 derniers jours</p>
        </div>
        <div className="flex items-start gap-2.5">
          <TrendingUp className="w-4 h-4 text-pink-deep shrink-0 mt-0.5" />
          <p className="text-sm text-muted-foreground">Ton évolution de la semaine</p>
        </div>
        <div className="flex items-start gap-2.5">
          <Lightbulb className="w-4 h-4 text-pink-deep shrink-0 mt-0.5" />
          <p className="text-sm text-muted-foreground">Un conseil personnalisé rien que pour toi</p>
        </div>
      </div>
      <p className="text-[11px] text-muted-foreground italic mt-3 text-center">
        Reviens demain pour découvrir tes nouvelles insights ✨
      </p>
    </div>
  );
}
