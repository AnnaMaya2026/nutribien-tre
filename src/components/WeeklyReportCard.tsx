import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import SophieAvatar from "@/components/SophieAvatar";
import { Loader2, ArrowUp, ArrowDown, ArrowRight } from "lucide-react";
import { toast } from "sonner";

interface ReportData {
  positive_point: string;
  to_improve: string;
  weekly_tip: string;
  symptom_trend: "amélioration" | "stable" | "dégradation";
  symptom_comment: string;
  score_this_week: number;
  score_last_week: number;
}

const trendEmoji = (t?: string) =>
  t === "amélioration" ? "📈" : t === "dégradation" ? "📉" : "➡️";

export default function WeeklyReportCard() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<ReportData | null>(null);
  const [range, setRange] = useState<{ start?: string; end?: string }>({});
  const [hasReport, setHasReport] = useState(false);

  // Preload existing report (if any) to know whether one is ready to show
  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: rows } = await supabase
        .from("weekly_reports")
        .select("report_data, week_start, week_end")
        .eq("user_id", user.id)
        .order("week_start", { ascending: false })
        .limit(1);
      const row = rows?.[0] as any;
      if (row?.report_data) {
        setHasReport(true);
        setRange({ start: row.week_start, end: row.week_end });
      }
    })();
  }, [user]);

  const formatDate = (iso?: string) => {
    if (!iso) return "";
    const d = new Date(iso);
    return d.toLocaleDateString("fr-FR", { day: "numeric", month: "long" });
  };

  const fetchReport = async () => {
    setLoading(true);
    setOpen(true);
    try {
      const { data: resp, error } = await supabase.functions.invoke("weekly-report");
      if (error) throw error;
      if ((resp as any)?.error) throw new Error((resp as any).error);
      setData((resp as any).report_data);
      setRange({ start: (resp as any).week_start, end: (resp as any).week_end });
      setHasReport(true);
    } catch (e: any) {
      console.error(e);
      toast.error("Impossible de générer le rapport. Réessaye plus tard.");
      setOpen(false);
    } finally {
      setLoading(false);
    }
  };

  const ScoreArrow = ({ now, prev }: { now: number; prev: number }) => {
    if (now > prev) return <ArrowUp className="w-4 h-4 text-green-500" />;
    if (now < prev) return <ArrowDown className="w-4 h-4 text-red-500" />;
    return <ArrowRight className="w-4 h-4 text-muted-foreground" />;
  };

  return (
    <>
      <section className="bg-white rounded-2xl p-4 shadow-sm border border-border">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <SophieAvatar size={36} />
            <div>
              <h3 className="font-semibold text-foreground">
                📊 Mon rapport de la semaine
              </h3>
              <p className="text-xs text-muted-foreground">
                {hasReport
                  ? "Bilan personnalisé par Sophie"
                  : "Disponible dès lundi"}
              </p>
            </div>
          </div>
          <Button
            size="sm"
            onClick={fetchReport}
            className="bg-primary text-primary-foreground"
          >
            Voir
          </Button>
        </div>
      </section>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <SophieAvatar size={28} />
              📊 Votre semaine
            </DialogTitle>
            {range.start && (
              <p className="text-xs text-muted-foreground">
                du {formatDate(range.start)} au {formatDate(range.end)}
              </p>
            )}
          </DialogHeader>

          {loading ? (
            <div className="py-8 flex justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : data ? (
            <div className="space-y-4 text-sm leading-relaxed text-foreground">
              <div className="bg-green-50 dark:bg-green-950/20 rounded-xl p-3">
                <p className="font-semibold mb-1">🌟 Point positif</p>
                <p>{data.positive_point}</p>
              </div>

              <div className="bg-orange-50 dark:bg-orange-950/20 rounded-xl p-3">
                <p className="font-semibold mb-1">⚠️ À améliorer</p>
                <p>{data.to_improve}</p>
              </div>

              <div className="bg-primary/10 rounded-xl p-3">
                <p className="font-semibold mb-1">💡 Conseil de la semaine</p>
                <p>{data.weekly_tip}</p>
              </div>

              <div className="bg-muted/40 rounded-xl p-3">
                <p className="font-semibold mb-1">
                  {trendEmoji(data.symptom_trend)} Tendance symptômes :{" "}
                  <span className="capitalize">{data.symptom_trend}</span>
                </p>
                <p>{data.symptom_comment}</p>
              </div>

              <div className="flex items-center justify-between bg-card border border-border rounded-xl p-3">
                <div>
                  <p className="text-xs text-muted-foreground">Score semaine</p>
                  <p className="text-2xl font-bold text-primary">
                    {data.score_this_week}
                    <span className="text-base text-muted-foreground">/10</span>
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <ScoreArrow
                    now={data.score_this_week}
                    prev={data.score_last_week}
                  />
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">
                      Semaine dernière
                    </p>
                    <p className="text-lg font-semibold text-muted-foreground">
                      {data.score_last_week}/10
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground py-4 text-center">
              Aucun rapport disponible pour le moment.
            </p>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
