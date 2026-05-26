import { useState } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import SophieAvatar from "@/components/SophieAvatar";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function WeeklyReportCard() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<string | null>(null);
  const [range, setRange] = useState<{ start?: string; end?: string }>({});

  const formatDate = (iso?: string) => {
    if (!iso) return "";
    const d = new Date(iso);
    return d.toLocaleDateString("fr-FR", { day: "numeric", month: "long" });
  };

  const fetchReport = async () => {
    setLoading(true);
    setOpen(true);
    try {
      const { data, error } = await supabase.functions.invoke("weekly-report");
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      setReport((data as any).report);
      setRange({ start: (data as any).week_start, end: (data as any).week_end });
    } catch (e: any) {
      console.error(e);
      toast.error("Impossible de générer le rapport. Réessaye plus tard.");
      setOpen(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <section className="bg-white rounded-2xl p-4 shadow-sm border border-border">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <SophieAvatar size={36} />
            <div>
              <h3 className="font-semibold text-foreground">📊 Rapport de la semaine</h3>
              <p className="text-xs text-muted-foreground">Bilan personnalisé par Sophie</p>
            </div>
          </div>
          <Button size="sm" onClick={fetchReport} className="bg-primary text-primary-foreground">
            Voir
          </Button>
        </div>
      </section>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <SophieAvatar size={28} />
              📊 Rapport hebdomadaire
            </DialogTitle>
            {range.start && (
              <p className="text-xs text-muted-foreground">
                Semaine du {formatDate(range.start)} au {formatDate(range.end)}
              </p>
            )}
          </DialogHeader>
          {loading ? (
            <div className="py-8 flex justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : (
            <div className="whitespace-pre-line text-sm leading-relaxed text-foreground">
              {report}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
