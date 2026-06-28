import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useProfile } from "@/hooks/useProfile";
import { Button } from "@/components/ui/button";
import {
  ACTIVITY_LEVELS,
  calculateBMR,
  calculateCalorieGoal,
  calculateCarbsGoal,
  calculateFatsGoal,
  calculateProteinGoal,
  getActivityLevel,
  getObjective,
} from "@/lib/calorieGoal";

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

  const weight = Number(profile?.weight) || 60;
  const height = Number(profile?.height) || 160;
  const age = Number(profile?.age) || 53;
  const activityLevel = getActivityLevel(profile?.activity_level as string | null);
  const objective = getObjective(profile?.objective as string | null);

  const bmr = calculateBMR({ weight, height, age });
  const tdeeBase = Math.round(bmr * activityLevel.factor);
  const tdee = calculateCalorieGoal({
    weight,
    height,
    age,
    activityLevel: profile?.activity_level as string | null,
    objective: profile?.objective as string | null,
  });

  const proteinG = calculateProteinGoal(tdee, objective.value);
  const carbsG = calculateCarbsGoal(tdee, objective.value);
  const fatsG = calculateFatsGoal(tdee, objective.value);

  const proteinPct =
    objective.value === "perte_poids"
      ? 32
      : objective.value === "gain_muscle"
      ? 30
      : objective.value === "osseux"
      ? 35
      : 27;
  const carbsPct = objective.value === "perte_poids" ? 42 : 48;
  const fatsPct = 22;

  const bmrCalc = `655 + (9.6 × ${weight}) + (1.8 × ${height}) − (4.7 × ${age})`;
  const bmrDetail = `655 + ${(9.6 * weight).toFixed(0)} + ${(1.8 * height).toFixed(0)} − ${(4.7 * age).toFixed(0)}`;

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
            selon la formule <strong>Harris-Benedict</strong>, adaptée à ta ménopause.
          </p>
        </section>

        {/* Étape 1 */}
        <section className="bg-card rounded-2xl p-5 card-soft animate-fade-in">
          <h3 className="text-base font-semibold mb-3">
            1️⃣ Calcul du TMB <span className="text-muted-foreground font-normal">(Taux Métabolique Basal)</span>
          </h3>

          <div className="rounded-xl bg-muted/40 p-4 mb-3 font-mono text-sm leading-relaxed">
            <div className="text-xs text-muted-foreground mb-2 font-sans">
              Formule Harris-Benedict (femmes)
            </div>
            <div>TMB = 655 + (9.6 × poids)</div>
            <div className="pl-12">+ (1.8 × taille) − (4.7 × âge)</div>
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
            On multiplie ton TMB par ton niveau d'activité pour obtenir tes vrais besoins
            caloriques quotidiens.
          </p>
        </section>

        {/* Étape 3 */}
        <section className="bg-card rounded-2xl p-5 card-soft animate-fade-in">
          <h3 className="text-base font-semibold mb-3">3️⃣ Répartition des macros (ménopause 45+)</h3>

          <div className="rounded-xl bg-muted/40 p-4 mb-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span>🔴 <strong>Protéines</strong></span>
              <span className="font-mono">{proteinPct}% = <strong>{proteinG} g/jour</strong></span>
            </div>
            <div className="flex justify-between text-sm">
              <span>🟠 <strong>Glucides</strong></span>
              <span className="font-mono">{carbsPct}% = <strong>{carbsG} g/jour</strong> <span className="text-muted-foreground">(dont 25g de fibres minimum)</span></span>
            </div>
            <div className="flex justify-between text-sm">
              <span>🟡 <strong>Lipides</strong></span>
              <span className="font-mono">{fatsPct}% = <strong>{fatsG} g/jour</strong></span>
            </div>
          </div>

          <div className="space-y-3 text-sm">
            <div>
              <div className="font-semibold mb-1">Protéines ({proteinPct}%)</div>
              <p className="text-muted-foreground">
                Plus haut que la moyenne pour préserver ta masse musculaire à la ménopause.
                Soit environ {(proteinG / weight).toFixed(1)} g par kg de ton poids.
              </p>
            </div>
            <div>
              <div className="font-semibold mb-1">Glucides ({carbsPct}%)</div>
              <p className="text-muted-foreground">
                {objective.value === "perte_poids"
                  ? "Légèrement réduit pour stabiliser ta glycémie. "
                  : ""}
                Privilégie les complexes (riz brun, pâtes complètes, légumineuses). Inclure au moins <strong>25 g de fibres/jour</strong> dans ces glucides.
                <br />
                <span className="text-xs">Sources fibres : légumes, fruits, légumineuses, céréales complètes.</span>
              </p>
            </div>
            <div>
              <div className="font-semibold mb-1">Lipides ({fatsPct}%)</div>
              <p className="text-muted-foreground">
                Même proportion qu'une alimentation standard mais très importante pour les
                hormones. Intègre des oméga-3 (poissons gras, noix, huile de lin).
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
                `avec un apport renforcé en protéines pour la santé osseuse.`}
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
            <li className="flex justify-between border-b border-border/40 pb-2">
              <span><strong>Calcium</strong> <span className="text-muted-foreground">— os</span></span>
              <span className="font-mono text-pink-deep">1000–1200 mg/j</span>
            </li>
            <li className="flex justify-between border-b border-border/40 pb-2">
              <span><strong>Vitamine D</strong> <span className="text-muted-foreground">— absorption calcium</span></span>
              <span className="font-mono text-pink-deep">800–1000 UI/j</span>
            </li>
            <li className="flex justify-between border-b border-border/40 pb-2">
              <span><strong>Magnésium</strong> <span className="text-muted-foreground">— énergie, stress</span></span>
              <span className="font-mono text-pink-deep">320 mg/j</span>
            </li>
            <li className="flex justify-between border-b border-border/40 pb-2">
              <span><strong>Fer</strong> <span className="text-muted-foreground">— besoins réduits après ménopause</span></span>
              <span className="font-mono text-pink-deep">8 mg/j</span>
            </li>
            <li className="flex justify-between">
              <span><strong>Oméga-3</strong> <span className="text-muted-foreground">— inflammations, articulations</span></span>
              <span className="font-mono text-pink-deep">1–2 g/j</span>
            </li>
          </ul>
        </section>

        <p className="text-[11px] text-muted-foreground text-center px-4">
          ⚠️ Ces recommandations sont indicatives. Consultez votre médecin pour un suivi personnalisé.
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
