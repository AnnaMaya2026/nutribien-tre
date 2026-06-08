import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Trash2, CalendarPlus, ClipboardList, Loader2, CheckCircle2, CalendarIcon } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";

interface SavedMenu {
  id: string;
  title: string;
  content: string;
  menu_date: string;
  created_at: string;
}

type ImportStep = "choose-day" | "importing" | "done" | null;

export default function SavedMenusPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [menus, setMenus] = useState<SavedMenu[]>([]);
  const [loading, setLoading] = useState(true);

  // Import flow state
  const [activeMenu, setActiveMenu] = useState<SavedMenu | null>(null);
  const [step, setStep] = useState<ImportStep>(null);
  const [pickedDate, setPickedDate] = useState<Date | null>(null);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [summary, setSummary] = useState<{ count: number; calories: number; date: string } | null>(null);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("saved_menus" as any)
      .select("*")
      .eq("user_id", user.id)
      .order("menu_date", { ascending: false });
    if (!error && data) setMenus(data as unknown as SavedMenu[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [user]);

  const handleDelete = async (id: string) => {
    if (!confirm("Supprimer ce menu ?")) return;
    const { error } = await supabase.from("saved_menus" as any).delete().eq("id", id);
    if (error) {
      toast.error("Erreur lors de la suppression");
      return;
    }
    setMenus((prev) => prev.filter((m) => m.id !== id));
    toast.success("Menu supprimé");
  };

  const openImport = (menu: SavedMenu) => {
    setActiveMenu(menu);
    setStep("choose-day");
    setPickedDate(null);
    setSummary(null);
    setProgress({ done: 0, total: 0 });
  };

  const closeImport = () => {
    setStep(null);
    setActiveMenu(null);
    setPickedDate(null);
    setSummary(null);
  };

  const runImport = async (targetDate: Date) => {
    if (!activeMenu || !user) return;
    setStep("importing");
    setProgress({ done: 0, total: 0 });

    try {
      const { data, error } = await supabase.functions.invoke("parse-menu-foods", {
        body: { menu_content: activeMenu.content },
      });
      if (error) throw error;
      const entries: any[] = (data?.entries as any[]) || [];
      if (entries.length === 0) {
        toast.error("Aucun aliment identifié dans ce menu");
        setStep("choose-day");
        return;
      }

      setProgress({ done: 0, total: entries.length });
      const loggedAt = targetDate.toISOString().split("T")[0];
      let totalCalories = 0;
      let inserted = 0;

      for (const entry of entries) {
        const { estimated, ...rest } = entry;
        const row = {
          ...rest,
          user_id: user.id,
          logged_at: loggedAt,
        };
        const { error: insErr } = await supabase.from("food_logs").insert(row);
        if (!insErr) {
          inserted += 1;
          totalCalories += Number(entry.calories) || 0;
        } else {
          console.error("insert failed", insErr, row);
        }
        setProgress({ done: inserted, total: entries.length });
      }

      setSummary({
        count: inserted,
        calories: Math.round(totalCalories),
        date: targetDate.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" }),
      });
      setStep("done");
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Erreur lors de l'import du menu");
      setStep("choose-day");
    }
  };

  const todayBtn = () => {
    const d = new Date();
    setPickedDate(d);
    runImport(d);
  };
  const tomorrowBtn = () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    setPickedDate(d);
    runImport(d);
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="px-4 pt-6 pb-3 border-b border-border flex items-center gap-2">
        <button
          onClick={() => navigate(-1)}
          className="w-9 h-9 rounded-lg flex items-center justify-center hover:bg-muted"
          aria-label="Retour"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-lg font-bold text-foreground flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-pink-deep" /> Mes menus
          </h1>
          <p className="text-xs text-muted-foreground">
            Menus sauvegardés depuis Sophie
          </p>
        </div>
      </div>

      <div className="px-4 py-4 space-y-3">
        {loading ? (
          <p className="text-center text-sm text-muted-foreground py-8">Chargement…</p>
        ) : menus.length === 0 ? (
          <div className="text-center py-12 text-sm text-muted-foreground">
            Aucun menu sauvegardé pour l'instant.
            <br />
            Demandez à Sophie un menu, puis cliquez sur "Sauvegarder ce menu".
          </div>
        ) : (
          menus.map((menu) => (
            <div
              key={menu.id}
              className="bg-card rounded-2xl p-4 card-soft animate-fade-in"
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">
                    {menu.title}
                  </h3>
                  <p className="text-[10px] text-muted-foreground">
                    {new Date(menu.menu_date).toLocaleDateString("fr-FR", {
                      weekday: "long",
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </p>
                </div>
              </div>
              <div className="prose prose-sm prose-pink max-w-none text-sm text-foreground [&>p]:m-0 mb-3">
                <ReactMarkdown>{menu.content}</ReactMarkdown>
              </div>
              <div className="flex flex-wrap gap-2 pt-2 border-t border-border">
                <button
                  onClick={() => openImport(menu)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary/10 hover:bg-primary/20 text-pink-deep text-xs font-medium"
                >
                  <CalendarPlus className="w-4 h-4" /> 📅 Ajouter au journal
                </button>
                <button
                  onClick={() => handleDelete(menu.id)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-destructive/10 hover:bg-destructive/20 text-destructive text-xs font-medium"
                >
                  <Trash2 className="w-4 h-4" /> 🗑️ Supprimer
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Import dialog */}
      <Dialog open={step !== null} onOpenChange={(o) => { if (!o) closeImport(); }}>
        <DialogContent className="max-w-sm">
          {step === "choose-day" && (
            <>
              <DialogHeader>
                <DialogTitle>Pour quel jour ?</DialogTitle>
                <DialogDescription>
                  Sophie va analyser le menu et l'ajouter à ton journal alimentaire.
                </DialogDescription>
              </DialogHeader>
              <div className="flex flex-col gap-2 mt-2">
                <button
                  onClick={todayBtn}
                  className="w-full px-4 py-3 rounded-xl bg-pink-deep text-white text-sm font-medium hover:opacity-90"
                >
                  Aujourd'hui
                </button>
                <button
                  onClick={tomorrowBtn}
                  className="w-full px-4 py-3 rounded-xl bg-muted text-foreground text-sm font-medium hover:bg-muted/80"
                >
                  Demain
                </button>
                <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                  <PopoverTrigger asChild>
                    <button className="w-full px-4 py-3 rounded-xl bg-muted text-foreground text-sm font-medium hover:bg-muted/80 flex items-center justify-center gap-2">
                      <CalendarIcon className="w-4 h-4" /> Choisir une date
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="center">
                    <Calendar
                      mode="single"
                      selected={pickedDate ?? undefined}
                      onSelect={(d) => {
                        if (d) {
                          setCalendarOpen(false);
                          setPickedDate(d);
                          runImport(d);
                        }
                      }}
                      initialFocus
                      className={cn("p-3 pointer-events-auto")}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </>
          )}

          {step === "importing" && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin text-pink-deep" />
                  Ajout en cours…
                </DialogTitle>
                <DialogDescription>
                  {progress.total === 0
                    ? "Sophie analyse le menu…"
                    : `${progress.done}/${progress.total} aliments ajoutés`}
                </DialogDescription>
              </DialogHeader>
              {progress.total > 0 && (
                <div className="w-full h-2 bg-muted rounded-full overflow-hidden mt-2">
                  <div
                    className="h-full bg-pink-deep transition-all"
                    style={{ width: `${(progress.done / progress.total) * 100}%` }}
                  />
                </div>
              )}
            </>
          )}

          {step === "done" && summary && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                  Menu ajouté !
                </DialogTitle>
                <DialogDescription>
                  ✅ Menu ajouté au journal du {summary.date}
                  <br />
                  {summary.count} aliment{summary.count > 1 ? "s" : ""} • {summary.calories} kcal
                </DialogDescription>
              </DialogHeader>
              <div className="flex flex-col gap-2 mt-2">
                <button
                  onClick={() => { closeImport(); navigate("/repas"); }}
                  className="w-full px-4 py-3 rounded-xl bg-pink-deep text-white text-sm font-medium hover:opacity-90"
                >
                  Voir mon journal →
                </button>
                <button
                  onClick={closeImport}
                  className="w-full px-4 py-3 rounded-xl bg-muted text-foreground text-sm font-medium hover:bg-muted/80"
                >
                  Fermer
                </button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
