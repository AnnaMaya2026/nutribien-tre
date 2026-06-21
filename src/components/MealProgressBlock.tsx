import { MealTarget } from "@/utils/mealTargetsCalculator";

interface Consumed {
  calories: number;
  proteins: number;
  carbs: number;
  fats: number;
}

interface BarSpec {
  label: string;
  unit: string;
  current: number;
  target: number;
  color: string; // hex
}

function Bar({ label, unit, current, target, color }: BarSpec) {
  const safeTarget = target > 0 ? target : 1;
  const pct = Math.min(100, Math.round((current / safeTarget) * 100));
  const overshoot = current > target;
  const cur = unit === "kcal" ? Math.round(current) : Math.round(current);
  return (
    <div>
      <div className="flex items-center justify-between text-[11px] mb-1">
        <span className="text-foreground/80">{label}</span>
        <span className="text-muted-foreground tabular-nums">
          {Math.round((current / safeTarget) * 100)}% · {cur}/{target} {unit}
        </span>
      </div>
      <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{
            width: `${pct}%`,
            backgroundColor: overshoot ? "#5B8DEE" : color,
          }}
        />
      </div>
    </div>
  );
}

export default function MealProgressBlock({
  target,
  consumed,
}: {
  target: MealTarget;
  consumed: Consumed;
}) {
  return (
    <div className="px-4 pb-3 pt-1 border-t border-border/50 space-y-2">
      <div className="text-[10px] text-muted-foreground space-y-0.5">
        <div>
          <span className="font-semibold text-foreground/70">Objectif :</span>{" "}
          {target.calories} kcal · {target.proteins}g prot · {target.carbs}g gluc · {target.fats}g lip
        </div>
        <div>
          <span className="font-semibold text-foreground/70">Consommé :</span>{" "}
          {Math.round(consumed.calories)} kcal · {Math.round(consumed.proteins)}g prot ·{" "}
          {Math.round(consumed.carbs)}g gluc · {Math.round(consumed.fats)}g lip
        </div>
      </div>
      <Bar label="Calories"  unit="kcal" current={consumed.calories} target={target.calories} color="#E87A8F" />
      <Bar label="Protéines" unit="g"    current={consumed.proteins} target={target.proteins} color="#E87A8F" />
      <Bar label="Glucides"  unit="g"    current={consumed.carbs}    target={target.carbs}    color="#F5A623" />
      <Bar label="Lipides"   unit="g"    current={consumed.fats}     target={target.fats}     color="#5B8DEE" />
    </div>
  );
}
