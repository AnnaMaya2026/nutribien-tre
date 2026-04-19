import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Plus, X } from "lucide-react";
import { FULL_SYMPTOMS_LIST } from "@/lib/symptoms";
import { useProfile } from "@/hooks/useProfile";
import { toast } from "sonner";

export function CustomizeSymptomsModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { profile, updateProfile } = useProfile();
  const [disabled, setDisabled] = useState<string[]>([]);
  const [custom, setCustom] = useState<string[]>([]);
  const [newSymptom, setNewSymptom] = useState("");

  useEffect(() => {
    if (profile && open) {
      setDisabled((profile as any).disabled_symptoms || []);
      setCustom((profile as any).custom_symptoms || []);
    }
  }, [profile, open]);

  const toggle = (key: string) => {
    setDisabled((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const addCustom = () => {
    const name = newSymptom.trim();
    if (!name) return;
    if (custom.includes(name)) {
      toast.error("Ce symptôme existe déjà");
      return;
    }
    setCustom((c) => [...c, name]);
    setNewSymptom("");
  };

  const removeCustom = (name: string) => {
    setCustom((c) => c.filter((n) => n !== name));
  };

  const save = async () => {
    await updateProfile.mutateAsync({
      disabled_symptoms: disabled,
      custom_symptoms: custom,
    } as any);
    toast.success("Symptômes mis à jour ✓");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base">Personnaliser mes symptômes</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">
            Activez ou désactivez les symptômes que vous souhaitez suivre.
          </p>

          <div className="space-y-2">
            {FULL_SYMPTOMS_LIST.map((s) => {
              const isOn = !disabled.includes(s.value);
              return (
                <div
                  key={s.value}
                  className="flex items-center justify-between p-2.5 rounded-lg bg-muted/50"
                >
                  <span className="text-sm text-foreground">{s.label}</span>
                  <Switch checked={isOn} onCheckedChange={() => toggle(s.value)} />
                </div>
              );
            })}
          </div>

          {custom.length > 0 && (
            <>
              <p className="text-[11px] font-semibold text-pink-deep uppercase tracking-wider mt-3">
                Symptômes personnalisés
              </p>
              <div className="space-y-2">
                {custom.map((name) => (
                  <div
                    key={name}
                    className="flex items-center justify-between p-2.5 rounded-lg bg-primary/10"
                  >
                    <span className="text-sm text-foreground">{name}</span>
                    <button
                      onClick={() => removeCustom(name)}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}

          <div className="pt-2">
            <p className="text-xs text-muted-foreground mb-1.5">
              Ajouter un symptôme personnalisé
            </p>
            <div className="flex gap-2">
              <Input
                value={newSymptom}
                onChange={(e) => setNewSymptom(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addCustom()}
                placeholder="Ex: Vertiges"
                className="h-9 text-sm"
              />
              <button
                onClick={addCustom}
                className="px-3 rounded-lg bg-primary text-primary-foreground"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>

          <button
            onClick={save}
            disabled={updateProfile.isPending}
            className="w-full mt-3 py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm disabled:opacity-50"
          >
            {updateProfile.isPending ? "Enregistrement..." : "Enregistrer"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
