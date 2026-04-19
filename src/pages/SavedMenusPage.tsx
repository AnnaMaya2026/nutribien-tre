import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Trash2, CalendarPlus, ClipboardList } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface SavedMenu {
  id: string;
  title: string;
  content: string;
  menu_date: string;
  created_at: string;
}

export default function SavedMenusPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [menus, setMenus] = useState<SavedMenu[]>([]);
  const [loading, setLoading] = useState(true);

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

  const handleApply = (menu: SavedMenu) => {
    // Save the menu as a journal entry for the day
    if (!user) return;
    supabase
      .from("journal_entries" as any)
      .insert({
        user_id: user.id,
        category: "alimentation",
        content: `📋 ${menu.title}\n\n${menu.content}`,
      })
      .then(({ error }) => {
        if (error) toast.error("Erreur lors de l'application au journal");
        else toast.success("Menu ajouté au journal alimentaire ✓");
      });
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
                  onClick={() => handleApply(menu)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary/10 hover:bg-primary/20 text-pink-deep text-xs font-medium"
                >
                  <CalendarPlus className="w-4 h-4" /> 📅 Appliquer au journal
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
    </div>
  );
}
