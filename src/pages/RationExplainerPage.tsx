import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useProfile } from "@/hooks/useProfile";
import { Button } from "@/components/ui/button";
import {
  ACTIVITY_LEVELS,
  PROTEIN_G_PER_KG,
  FAT_ENERGY_SHARE,
  FIBRES_GOAL,
  calculateBMR,
  calorieGoalDetails,
  missingBodyData,
  DEFAULT_BODY,
  calculateCarbsGoal,
  calculateFatsGoal,
  calculateProteinGoal,
  getActivityLevel,
  getObjective,
} from "@/lib/calorieGoal";
import { NUTRIENT_REFERENCES, omega3GoalG } from "@/lib/nutrientReferences";

export default function RationExplainerPage() {
  const navigate = useNavigate();
  const { profile, isLoading } = useProfile();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const missing = missingBodyData({ weight: profile?.weight, height: profile?.height, age: profile?.age });
  const weight = Number(profile?.weight) || DEFAULT_BODY.weight;
  const height = Number(profile?.height) || DEFAULT_BODY.height;
  const age = Number(profile?.age) || DEFAULT_BODY.age;
  const activityLevel = getActivityLevel(profile?.activity_level as string | null);
  const objective = getObjective(profile?.objective as string | null);

  const bmr = calculateBMR({ weight, height, age });
  const tdeeBase = Math.round(bmr * activityLevel.factor);
  const details = calorieGoalDetails({
    weight,
    height,
    age,
    activityLevel: profile?.activity_level as string | null,
    objective: profile?.objective as string | null,
  });
  const tdee = details.goal;

  const proteinG = calculateProteinGoal(tdee, weight, objective.value);
  const omega3Goal = omega3GoalG(tdee);
  const fatsG = calculateFatsGoal(tdee);
  const carbsG = calculateCarbsGoal(tdee, proteinG, fatsG);
  const fatsPct = FAT_ENERGY_SHARE * 100;
  const proteinPerKg = PROTEIN_G_PER_KG.toLocaleString("fr-FR");

  const fr = (n: number) => n.toLocaleString("fr-FR");
  const bmrCalc = `(10 × ${fr(weight)}) + (6,25 × ${fr(height)}) − (5 × ${fr(age)}) − 161`;
  const bmrDetail = `${fr(Math.round(10 * weight))} + ${fr(Math.round(6.25 * height))} − ${fr(Math.round(5 * age))} − 161`;

  return (
    <div className="min-h-screen bg-background pb-28">
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} aria-label="Retour">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-lg font-semibold">Comprendre ta ration</h1>
        </div>
      </header>

      <main id="main-content" className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Intro */}
        <section className="animate-fade-in">
          <h2 className="text-2xl font-bold text-foreground mb-2">
            Comprendre ta ration journalière
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Chaque femme a des besoins différents. Voici comment on a calculé le tien
            selon la formule de <strong>Mifflin-St Jeor</strong>.
          </p>
          {missing.length > 0 && (
            <p className="mt-3 text-sm rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 p-3">
              Ce calcul n'est pas encore personnel : il manque {missing.join(", ")} dans ton profil. Des valeurs moyennes sont utilisées en attendant.
            </p>
          )}
        </section>

        {/* Étape 1 */}
        <section className="bg-card rounded-2xl p-5 card-soft animate-fade-in">
          <h3 className="text-base font-semibold mb-3">
            1️⃣ Calcul du TMB <span className="text-muted-foreground font-normal">(Taux Métabolique Basal)</span>
          </h3>

          <div className="rounded-xl bg-muted/40 p-4 mb-3 font-mono text-sm leading-relaxed">
            <div className="text-xs text-muted-foreground mb-2 font-sans">
              Formule de Mifflin-St Jeor (femmes)
            </div>
            <div>TMB = (10 × poids) + (6,25 × taille)</div>
            <div className="pl-12">− (5 × âge) − 161</div>
          </div>

          <p className="text-sm mb-2">
            Pour toi : <strong>{weight} kg, {height} cm, {age} ans</strong>
          </p>
          <div className="rounded-xl bg-primary/5 border border-primary/20 p-4 font-mono text-sm space-y-1">
            <div>TMB = {bmrCalc}</div>
            <div className="text-muted-foreground">    = {bmrDetail}</div>
            <div className="text-pink-deep font-bold text-base">    = {bmr} kcal</div>
          </div>
          <p className="text-sm text-muted-foreground mt-3">
            C'est ce que ton corps dépense au repos, sans faire d'effort.
          </p>
        </section>

        {/* Étape 2 */}
        <section className="bg-card rounded-2xl p-5 card-soft animate-fade-in">
          <h3 className="text-base font-semibold mb-3">2️⃣ Niveau d'activité</h3>
          <p className="text-sm mb-2">
            Ton niveau : <strong>{activityLevel.label}</strong>{" "}
            <span className="text-muted-foreground">({activityLevel.description})</span>
          </p>
          <p className="text-sm mb-3">
            Multiplicateur : <strong>× {activityLevel.factor}</strong>
          </p>
          <div className="rounded-xl bg-primary/5 border border-primary/20 p-4 font-mono text-sm">
            {bmr} kcal × {activityLevel.factor} ={" "}
            <span className="text-pink-deep font-bold text-base">{tdeeBase} kcal/jour</span>
          </div>
          <p className="text-sm text-muted-foreground mt-3">
            On multiplie ton TMB par ton niveau d'activité pour obtenir tes besoins
            caloriques quotidiens.
          </p>
          {tdee !== tdeeBase && (
            <p className="text-sm mt-3">
              Ton objectif « {objective.label.toLowerCase()} » : <strong>{tdee} kcal/jour</strong>
              {details.floored
                ? <> — maintenu à ton métabolisme de base : l'objectif ne descend jamais en dessous.</>
                : <> ({tdee > tdeeBase ? "+" : "−"}{Math.abs(tdee - tdeeBase)} kcal).</>}
            </p>
          )}
        </section>

        {/* Étape 3 */}
        <section className="bg-card rounded-2xl p-5 card-soft animate-fade-in">
          <h3 className="text-base font-semibold mb-3">3️⃣ Répartition des macros (ménopause 45+)</h3>

          <div className="rounded-xl bg-muted/40 p-4 mb-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span>🔴 <strong>Protéines</strong></span>
              <span className="font-mono">{proteinPerKg} g/kg = <strong>{proteinG} g/jour</strong></span>
            </div>
            <div className="flex justify-between text-sm">
              <span>🟠 <strong>Glucides</strong></span>
              <span className="font-mono">Énergie restante = <strong>{carbsG} g/jour</strong> <span className="text-muted-foreground">(dont {FIBRES_GOAL}g de fibres minimum)</span></span>
            </div>
            <div className="flex justify-between text-sm">
              <span>🟡 <strong>Lipides</strong></span>
              <span className="font-mono">{fatsPct}% = <strong>{fatsG} g/jour</strong></span>
            </div>
          </div>

          <div className="space-y-3 text-sm">
            <div>
              <div className="font-semibold mb-1">Protéines ({proteinPerKg} g/kg)</div>
              <p className="text-muted-foreground">
                Ton poids de {weight.toLocaleString("fr-FR")} kg est multiplié par {proteinPerKg},
                puis arrondi à l'entier : {proteinG} g par jour, quel que soit ton objectif.
              </p>
            </div>
            <div>
              <div className="font-semibold mb-1">Glucides (énergie restante)</div>
              <p className="text-muted-foreground">
                Le calcul est ({tdee} − {proteinG} × 4 − {fatsG} × 9) / 4,
                arrondi à l'entier, sans descendre sous zéro.
                {" "}
                Privilégie les complexes (riz brun, pâtes complètes, légumineuses). Inclure au moins <strong>{FIBRES_GOAL} g de fibres/jour</strong> dans ces glucides.
                <br />
                <span className="text-xs">Sources fibres : légumes, fruits, légumineuses, céréales complètes.</span>
              </p>
            </div>
            <div>
              <div className="font-semibold mb-1">Lipides ({fatsPct}%)</div>
              <p className="text-muted-foreground">
                {fatsPct} % de tes calories sont divisées par 9, puis arrondies à l'entier,
                quel que soit ton objectif. Intègre des oméga-3 (poissons gras, noix, huile de lin).
              </p>
            </div>
          </div>
        </section>

        {/* Étape 4 */}
        <section className="bg-card rounded-2xl p-5 card-soft animate-fade-in">
          <h3 className="text-base font-semibold mb-3">4️⃣ Objectif adapté</h3>
          <p className="text-sm mb-3">
            Selon ton objectif : <strong>{objective.label}</strong>
          </p>
          <div className="rounded-xl bg-primary/5 border border-primary/20 p-4">
            <div className="text-sm text-muted-foreground mb-1">Tu dois consommer</div>
            <div className="text-3xl font-bold text-pink-deep">{tdee} kcal/jour</div>
            <div className="text-sm text-muted-foreground mt-2">
              {objective.value === "perte_poids" &&
                `(−300 kcal vs maintien, pour un déficit modéré)`}
              {objective.value === "gain_muscle" &&
                `(+300 kcal vs maintien, pour un surplus modéré)`}
              {objective.value === "maintenir" && `pour maintenir ton poids actuel.`}
              {objective.value === "osseux" &&
                `avec le même calcul des macronutriments que pour les autres objectifs.`}
            </div>
          </div>
        </section>

        {/* Micronutriments */}
        <section className="bg-card rounded-2xl p-5 card-soft animate-fade-in">
          <h3 className="text-base font-semibold mb-3">🌿 Micronutriments ménopause</h3>
          <p className="text-sm text-muted-foreground mb-3">
            À la ménopause, sois particulièrement attentive à :
          </p>
          <ul className="space-y-2 text-sm">
            {([
              ["calcium", "os"],
              ["vitamin_d", "absorption du calcium"],
              ["magnesium", "énergie, stress"],
              ["iron", "besoins réduits après la ménopause"],
            ] as const).map(([key, role]) => {
              const r = NUTRIENT_REFERENCES[key];
              return (
                <li key={key} className="flex justify-between border-b border-border/40 pb-2">
                  <span><strong>{r.label}</strong> <span className="text-muted-foreground">— {role}</span></span>
                  <span className="font-mono text-pink-deep">{r.target.toLocaleString("fr-FR")} {r.unit}/j</span>
                </li>
              );
            })}
            <li className="flex justify-between">
              <span><strong>Oméga-3</strong> <span className="text-muted-foreground">— inflammations, articulations</span></span>
              <span className="font-mono text-pink-deep">
                {omega3Goal != null ? `${omega3Goal.toLocaleString("fr-FR")} g/j` : "1 % de l'énergie + 0,5 g"}
              </span>
            </li>
          </ul>
          <p className="mt-2 text-[13px] text-muted-foreground">
            Repères ANSES (2021) pour une femme ménopausée. Oméga-3 : 1 % de ton objectif calorique en ALA, plus 250 mg de DHA et 250 mg d'EPA.
          </p>
        </section>

        <p className="text-[13px] text-muted-foreground text-center px-4">
          ⚠️ Ces recommandations sont indicatives. Consulte ton médecin pour un suivi personnalisé.
        </p>

        {/* Activity factors reference */}
        <details className="bg-muted/30 rounded-xl p-4 text-sm">
          <summary className="cursor-pointer font-medium">
            Voir les multiplicateurs d'activité
          </summary>
          <ul className="mt-3 space-y-1">
            {ACTIVITY_LEVELS.map((a) => (
              <li key={a.value} className="flex justify-between">
                <span>{a.label} <span className="text-muted-foreground">({a.description})</span></span>
                <span className="font-mono">× {a.factor}</span>
              </li>
            ))}
          </ul>
        </details>
      </main>
    </div>
  );
}
