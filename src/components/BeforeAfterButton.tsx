import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FULL_SYMPTOMS_LIST } from "@/lib/symptoms";
import { TrendingDown, TrendingUp, Minus, Loader2 } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, Legend } from "recharts";

const SYMPTOM_LABEL: Record<string, string> = Object.fromEntries(
  FULL_SYMPTOMS_LIST.map((s) => [s.value, s.label])
);

const CHART_COLORS = [
  "hsl(330, 60%, 65%)", "hsl(200, 60%, 55%)", "hsl(145, 50%, 45%)",
  "hsl(35, 80%, 55%)", "hsl(270, 50%, 60%)", "hsl(10, 70%, 55%)",
];

interface Props {
  entryId: string;
  entryDate: string;
  entryLabel: string;
}

const toKey = (d: Date) => d.toISOString().split("T")[0];

export default function BeforeAfterButton({ entryId, entryDate, entryLabel }: Props) {
  const [open, setOpen] = useState(false);
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["before-after", user?.id, entryId],
    queryFn: async () => {
      if (!user) return [];
      const base = new Date(entryDate);
      const beforeStart = new Date(base); beforeStart.setDate(base.getDate() - 7);
      const afterEnd = new Date(base); afterEnd.setDate(base.getDate() + 7);
      const { data: logs } = await supabase
        .from("symptom_logs")
        .select("logged_at, symptom_scores")
        .eq("user_id", user.id)
        .gte("logged_at", toKey(beforeStart))
        .lte("logged_at", toKey(afterEnd));
      return logs || [];
    },
    enabled: open && !!user,
  });

  const { rows, chartData, symptomKeys, notEnough } = useMemo(() => {
    const logs = data ?? [];
    const base = entryDate;
    const before = logs.filter((l) => l.logged_at < base);
    const after = logs.filter((l) => l.logged_at > base);

    if (before.length < 3 || after.length < 3) {
      return { rows: [], chartData: [], symptomKeys: [], notEnough: true };
    }

    const avg = (arr: any[], sym: string) => {
      const vals = arr.map((l) => (l.symptom_scores || {})[sym]).filter((v: any) => typeof v === "number" && v > 0);
      return vals.length > 0 ? vals.reduce((a: number, b: number) => a + b, 0) / vals.length : null;
    };
    const allSyms = Array.from(new Set(logs.flatMap((l: any) => Object.keys(l.symptom_scores || {}))));
    const rowsOut = allSyms
      .map((sym) => ({
        sym,
        label: SYMPTOM_LABEL[sym] || sym.replace(/^custom_/, ""),
        before: avg(before, sym),
        after: avg(after, sym),
      }))
      .filter((r) => r.before !== null && r.after !== null);

    const keys = rowsOut.map((r) => r.sym);
    const baseDate = new Date(entryDate);
    const days: any[] = [];
    for (let i = -7; i <= 7; i++) {
      const d = new Date(baseDate);
      d.setDate(baseDate.getDate() + i);
      const key = toKey(d);
      const log = logs.find((l) => l.logged_at === key);
      const scores: any = (log?.symptom_scores && typeof log.symptom_scores === "object") ? log.symptom_scores : {};
      const point: any = { label: `${d.getDate()}/${d.getMonth() + 1}`, key };
      keys.forEach((k) => {
        const v = scores[k];
        point[k] = typeof v === "number" && v > 0 ? v : null;
      });
      days.push(point);
    }
    return { rows: rowsOut, chartData: days, symptomKeys: keys, notEnough: false };
  }, [data, entryDate]);

  const entryDayLabel = useMemo(() => {
    const d = new Date(entryDate);
    return `${d.getDate()}/${d.getMonth() + 1}`;
  }, [entryDate]);

  const shortLabel = entryLabel.length > 40 ? entryLabel.slice(0, 40) + "…" : entryLabel;

  return (
    <>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        className="text-xs h-7 px-2 text-primary hover:bg-primary/10"
        onClick={(e) => { e.stopPropagation(); setOpen(true); }}
      >
        📈 Voir l'impact
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base">
              Impact de "{shortLabel}" sur vos symptômes
            </DialogTitle>
          </DialogHeader>

          {isLoading ? (
            <div className="py-6 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>
          ) : notEnough || rows.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              Pas encore assez de données.<br />
              Revenez dans quelques jours pour voir l'impact ! 💪
            </p>
          ) : (
            <>
              <div className="bg-muted/20 rounded-xl p-2 -mx-1">
                <ResponsiveContainer width="100%" height={240}>
                  <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <XAxis dataKey="label" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} interval={1} />
                    <YAxis domain={[0, 10]} tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                    <Tooltip
                      contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12, fontSize: 12 }}
                    />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <ReferenceLine
                      x={entryDayLabel}
                      stroke="hsl(var(--primary))"
                      strokeDasharray="4 3"
                      label={{ value: `📌 ${shortLabel.length > 18 ? shortLabel.slice(0, 18) + "…" : shortLabel}`, position: "top", fontSize: 10, fill: "hsl(var(--primary))" }}
                    />
                    {symptomKeys.map((k, i) => (
                      <Line
                        key={k}
                        type="monotone"
                        dataKey={k}
                        name={SYMPTOM_LABEL[k] || k.replace(/^custom_/, "")}
                        stroke={CHART_COLORS[i % CHART_COLORS.length]}
                        strokeWidth={2}
                        dot={{ r: 2.5 }}
                        connectNulls
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div className="space-y-2 mt-3">
                {rows.map((r) => {
                  const delta = (r.after as number) - (r.before as number);
                  const stable = Math.abs(delta) < 0.5;
                  const Icon = stable ? Minus : delta < 0 ? TrendingDown : TrendingUp;
                  const color = stable ? "text-muted-foreground" : delta < 0 ? "text-green-600" : "text-red-600";
                  const changeText = stable
                    ? "→ stable"
                    : delta < 0
                    ? `↓ ${Math.abs(delta).toFixed(1)} pt${Math.abs(delta) >= 2 ? "s" : ""} (mieux)`
                    : `↑ +${delta.toFixed(1)} pt${delta >= 2 ? "s" : ""} (pire)`;
                  return (
                    <div key={r.sym} className="bg-muted/30 rounded-lg px-3 py-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-medium text-foreground">{r.label}</span>
                        <span className={`inline-flex items-center gap-1 text-xs font-semibold ${color}`}>
                          <Icon className="w-3.5 h-3.5" /> {changeText}
                        </span>
                      </div>
                      <div className="text-[11px] text-muted-foreground mt-0.5">
                        Avant : {(r.before as number).toFixed(1)}/10 · Après : {(r.after as number).toFixed(1)}/10
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          <p className="mt-3 text-[11px] text-muted-foreground italic">
            ⚠️ Ces tendances sont indicatives et ne constituent pas un avis médical.
          </p>
        </DialogContent>
      </Dialog>
    </>
  );
}
