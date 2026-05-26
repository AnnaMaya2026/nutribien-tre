import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FULL_SYMPTOMS_LIST } from "@/lib/symptoms";
import { TrendingDown, TrendingUp, Minus, Loader2 } from "lucide-react";

const SYMPTOM_LABEL: Record<string, string> = Object.fromEntries(
  FULL_SYMPTOMS_LIST.map((s) => [s.value, s.label])
);

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
      if (!user) return null;
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

  const analysis = (() => {
    if (!data) return null;
    const base = entryDate;
    const before = data.filter((l) => l.logged_at < base);
    const after = data.filter((l) => l.logged_at > base);
    if (after.length < 3) return { notEnough: true } as const;

    const avg = (logs: any[], sym: string) => {
      const vals = logs.map((l) => (l.symptom_scores || {})[sym]).filter((v: any) => typeof v === "number" && v > 0);
      return vals.length > 0 ? vals.reduce((a: number, b: number) => a + b, 0) / vals.length : null;
    };
    const allSyms = Array.from(new Set(data.flatMap((l: any) => Object.keys(l.symptom_scores || {}))));
    const rows = allSyms.map((sym) => ({
      sym,
      label: SYMPTOM_LABEL[sym] || sym,
      before: avg(before, sym),
      after: avg(after, sym),
    })).filter((r) => r.before !== null && r.after !== null);
    return { rows } as const;
  })();

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
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base">
              Impact de "{entryLabel.length > 40 ? entryLabel.slice(0, 40) + "…" : entryLabel}" sur vos symptômes
            </DialogTitle>
          </DialogHeader>

          {isLoading || !analysis ? (
            <div className="py-6 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>
          ) : (analysis as any).notEnough ? (
            <p className="text-sm text-muted-foreground py-2">
              Pas encore assez de données après cet événement. Revenez dans quelques jours !
            </p>
          ) : (analysis as any).rows.length === 0 ? (
            <p className="text-sm text-muted-foreground py-2">
              Pas assez de symptômes notés autour de cette date pour comparer.
            </p>
          ) : (
            <div className="space-y-2">
              {(analysis as any).rows.map((r: any) => {
                const delta = r.after - r.before;
                const Icon = Math.abs(delta) < 0.3 ? Minus : delta < 0 ? TrendingDown : TrendingUp;
                const color = Math.abs(delta) < 0.3 ? "text-muted-foreground" : delta < 0 ? "text-green-600" : "text-orange-600";
                return (
                  <div key={r.sym} className="flex items-center justify-between bg-muted/30 rounded-lg px-3 py-2 text-sm">
                    <span className="text-foreground">{r.label}</span>
                    <span className={`inline-flex items-center gap-1 font-medium ${color}`}>
                      Avant: {r.before.toFixed(1)}/10 → Après: {r.after.toFixed(1)}/10
                      <Icon className="w-4 h-4" />
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          <p className="mt-3 text-[11px] text-muted-foreground italic">
            ⚠️ Ces tendances sont indicatives.
          </p>
        </DialogContent>
      </Dialog>
    </>
  );
}
