import { useEffect, useState } from "react";
import { Heart, ChevronDown, Save } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useProfile } from "@/hooks/useProfile";
import { HEALTH_CONDITIONS, HEALTH_DISCLAIMER } from "@/lib/healthConditions";
import { toast } from "sonner";

export default function HealthProfileCard() {
  const { profile, updateProfile } = useProfile();
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [other, setOther] = useState("");

  // Sync from profile
  useEffect(() => {
    if (profile) {
      setSelected(((profile as any).health_conditions as string[]) || []);
      setOther(((profile as any).health_other as string) || "");
    }
  }, [profile]);

  const toggle = (code: string) => {
    setSelected((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    );
  };

  const save = async () => {
    await updateProfile.mutateAsync({
      health_conditions: selected,
      health_other: other.trim() || null,
    } as any);
    toast.success("Profil santé enregistré ✓");
  };

  const count = selected.length + (other.trim() ? 1 : 0);

  return (
    <div className="bg-card rounded-2xl card-soft mb-4 animate-fade-in overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-3 px-5 py-4 text-left"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center flex-shrink-0">
            <Heart className="w-4 h-4 text-pink-deep" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-foreground">
              Mes problèmes de santé à surveiller
            </h3>
            <p className="text-[11px] text-muted-foreground">
              {count > 0
                ? `${count} condition${count > 1 ? "s" : ""} suivie${count > 1 ? "s" : ""}`
                : "Personnalisez vos recommandations"}
            </p>
          </div>
        </div>
        <ChevronDown
          className={`w-4 h-4 text-pink-deep transition-transform flex-shrink-0 ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {open && (
        <div className="px-5 pb-5 animate-fade-in">
          <p className="text-[11px] text-muted-foreground mb-3">
            Ces informations permettent à NutriMéno de personnaliser ses
            recommandations.
          </p>

          <div className="space-y-2 mb-3">
            {HEALTH_CONDITIONS.map((c) => {
              const checked = selected.includes(c.value);
              return (
                <label
                  key={c.value}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border cursor-pointer transition-colors ${
                    checked
                      ? "bg-primary/10 border-pink-deep/40"
                      : "bg-muted/30 border-border hover:bg-muted/60"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggle(c.value)}
                    className="w-4 h-4 accent-pink-deep"
                  />
                  <span className="text-xs font-medium text-foreground flex-1">
                    {c.label}
                  </span>
                </label>
              );
            })}
          </div>

          <div className="mb-3">
            <label className="text-[11px] text-muted-foreground block mb-1">
              Autre (précisez)
            </label>
            <Input
              value={other}
              onChange={(e) => setOther(e.target.value)}
              placeholder="Ex: anémie, allergie spécifique…"
              className="h-10 bg-background"
            />
          </div>

          <button
            onClick={save}
            disabled={updateProfile.isPending}
            className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm flex items-center justify-center gap-1.5 disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5" />
            {updateProfile.isPending ? "Enregistrement..." : "Enregistrer"}
          </button>

          <p className="text-[10px] text-muted-foreground italic border-t border-border pt-2 mt-3">
            {HEALTH_DISCLAIMER}
          </p>
        </div>
      )}
    </div>
  );
}
