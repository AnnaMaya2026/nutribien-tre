import { useState } from "react";
import { useJournalEntries, JOURNAL_CATEGORIES } from "@/hooks/useJournalEntries";
import { Plus, Trash2, X, CalendarDays } from "lucide-react";
import { Input } from "@/components/ui/input";

export default function PersonalJournalPage() {
  const { entries, addEntry, deleteEntry } = useJournalEntries();
  const [showForm, setShowForm] = useState(false);
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("autre");
  const [entryDate, setEntryDate] = useState(new Date().toISOString().split("T")[0]);

  const handleAdd = () => {
    if (!content.trim()) return;
    addEntry.mutate(
      { category, content: content.trim(), entry_date: entryDate },
      {
        onSuccess: () => {
          setContent("");
          setCategory("autre");
          setEntryDate(new Date().toISOString().split("T")[0]);
          setShowForm(false);
        },
      }
    );
  };

  // Group entries by month
  const grouped = entries.reduce<Record<string, typeof entries>>((acc, entry) => {
    const d = new Date(entry.entry_date);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    if (!acc[key]) acc[key] = [];
    acc[key].push(entry);
    return acc;
  }, {});

  const monthNames = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];

  const formatMonthLabel = (key: string) => {
    const [year, month] = key.split("-");
    return `${monthNames[parseInt(month) - 1]} ${year}`;
  };

  const formatDay = (dateStr: string) => {
    const d = new Date(dateStr);
    return `${d.getDate()} ${monthNames[d.getMonth()]}`;
  };

  const getCategoryEmoji = (cat: string) => {
    return JOURNAL_CATEGORIES.find((c) => c.value === cat)?.label || "📝 Autre";
  };

  return (
    <div className="pb-24 px-4 pt-6 bg-background min-h-screen">
      <h1 className="text-2xl font-bold text-foreground mb-1">Journal personnel</h1>
      <p className="text-muted-foreground text-sm mb-4">Notez vos événements de vie et compléments</p>

      {/* Add button */}
      {!showForm && (
        <button
          onClick={() => setShowForm(true)}
          className="w-full mb-4 py-3 bg-primary text-primary-foreground rounded-xl font-semibold flex items-center justify-center gap-2 shadow-md"
        >
          <Plus className="w-4 h-4" /> Ajouter une note
        </button>
      )}

      {/* Form */}
      {showForm && (
        <div className="bg-card rounded-2xl p-5 card-soft mb-4 animate-fade-in">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-sm font-semibold text-foreground">Nouvelle note</h3>
            <button onClick={() => setShowForm(false)}>
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>

          {/* Date */}
          <div className="mb-3">
            <label className="text-xs text-muted-foreground block mb-1">Date</label>
            <div className="flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-muted-foreground" />
              <Input
                type="date"
                value={entryDate}
                onChange={(e) => setEntryDate(e.target.value)}
                className="h-9 bg-muted flex-1"
              />
            </div>
          </div>

          {/* Category */}
          <div className="mb-3">
            <label className="text-xs text-muted-foreground block mb-1">Catégorie</label>
            <div className="flex gap-1.5 flex-wrap">
              {JOURNAL_CATEGORIES.map((c) => (
                <button
                  key={c.value}
                  onClick={() => setCategory(c.value)}
                  className={`px-3 py-1.5 rounded-full text-[11px] font-medium transition-all ${
                    category === c.value
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          {/* Content */}
          <div className="mb-4">
            <label className="text-xs text-muted-foreground block mb-1">Note</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Ex: Commencé magnésium 300mg, Yoga 3x/semaine..."
              className="w-full h-20 bg-muted rounded-lg p-3 text-sm text-foreground placeholder:text-muted-foreground resize-none border border-border focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          <button
            onClick={handleAdd}
            disabled={!content.trim() || addEntry.isPending}
            className="w-full py-3 bg-primary text-primary-foreground rounded-lg font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <Plus className="w-4 h-4" /> Enregistrer
          </button>
        </div>
      )}

      {/* Timeline */}
      {Object.keys(grouped).length > 0 ? (
        <div className="space-y-6">
          {Object.entries(grouped).map(([monthKey, monthEntries]) => (
            <div key={monthKey}>
              <h3 className="text-xs font-semibold text-pink-deep uppercase tracking-wider mb-3">
                {formatMonthLabel(monthKey)}
              </h3>
              <div className="relative">
                {/* Timeline line */}
                <div className="absolute left-[15px] top-2 bottom-2 w-px bg-border" />

                <div className="space-y-3">
                  {monthEntries.map((entry) => (
                    <div key={entry.id} className="flex gap-3 relative">
                      {/* Timeline dot */}
                      <div className="w-[31px] flex justify-center flex-shrink-0 pt-3">
                        <div className="w-2.5 h-2.5 rounded-full bg-primary border-2 border-background z-10" />
                      </div>

                      {/* Card */}
                      <div className="flex-1 bg-card rounded-xl p-3 card-soft">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-[10px] text-muted-foreground font-medium">
                                {formatDay(entry.entry_date)}
                              </span>
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/15 text-foreground font-medium">
                                {getCategoryEmoji(entry.category)}
                              </span>
                            </div>
                            <p className="text-sm text-foreground">{entry.content}</p>
                          </div>
                          <button
                            onClick={() => deleteEntry.mutate(entry.id)}
                            className="text-muted-foreground hover:text-destructive transition-colors flex-shrink-0"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : !showForm ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="text-6xl mb-4">📓</div>
          <p className="text-sm text-muted-foreground mb-2 max-w-[240px]">
            Commencez à noter vos événements de vie pour mieux suivre votre parcours
          </p>
        </div>
      ) : null}
    </div>
  );
}
