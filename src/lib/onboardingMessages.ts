// Mapping symptom -> reassurance message + priority nutrients
export type SymptomKey =
  | "fatigue"
  | "bouffees"
  | "sommeil"
  | "poids"
  | "humeur"
  | "memoire"
  | "douleurs"
  | "autre";

export const SYMPTOM_OPTIONS: { value: SymptomKey; label: string }[] = [
  { value: "fatigue", label: "Fatigue" },
  { value: "bouffees", label: "Bouffées de chaleur" },
  { value: "sommeil", label: "Troubles du sommeil" },
  { value: "poids", label: "Prise de poids" },
  { value: "humeur", label: "Sautes d'humeur" },
  { value: "memoire", label: "Troubles de la mémoire" },
  { value: "douleurs", label: "Douleurs articulaires" },
  { value: "autre", label: "Autre" },
];

export const REASSURANCE: Record<SymptomKey, string> = {
  fatigue:
    "Ce que tu ressens n'est pas aléatoire.\n\nDans cette phase, ton corps peut avoir du mal à absorber certains micronutriments essentiels — notamment le magnésium, la vitamine D et le fer.\n\nCe qui peut expliquer ta fatigue, tes variations d'énergie, ce sentiment de ne plus te reconnaître.",
  bouffees:
    "Ce que tu ressens n'est pas aléatoire.\n\nLes bouffées de chaleur sont souvent liées à une baisse des phytoestrogènes et à certaines carences en micronutriments.\n\nCe que tu manges peut vraiment faire une différence — et NutriMéno est conçue pour te montrer laquelle.",
  sommeil:
    "Ce que tu ressens n'est pas aléatoire.\n\nLe sommeil perturbé pendant la ménopause est souvent lié à des carences en magnésium et à des pics de cortisol liés à l'alimentation.\n\nNutriMéno va t'aider à identifier et corriger ces déséquilibres.",
  poids:
    "Ce que tu ressens n'est pas aléatoire.\n\nLa prise de poids à cette période n'est pas une question de volonté.\n\nElle est souvent liée à des changements hormonaux et à des besoins nutritionnels spécifiques que ton alimentation actuelle ne couvre peut-être pas.",
  humeur:
    "Ce que tu ressens n'est pas aléatoire.\n\nLes variations d'humeur sont souvent liées à des fluctuations hormonales mais aussi à des carences en oméga-3, magnésium et vitamines B.\n\nL'alimentation peut devenir un vrai levier de stabilité émotionnelle.",
  memoire:
    "Ce que tu ressens n'est pas aléatoire.\n\nLes troubles de la mémoire et de la concentration pendant la ménopause sont souvent liés à des baisses en oméga-3, vitamines B et antioxydants.\n\nNutriMéno va t'aider à nourrir ton cerveau au quotidien.",
  douleurs:
    "Ce que tu ressens n'est pas aléatoire.\n\nLes douleurs articulaires sont fréquentes à cette période et souvent liées à des carences en vitamine D, oméga-3 et à une inflammation alimentaire.\n\nCertains aliments peuvent vraiment soulager — d'autres aggravent. NutriMéno t'aide à les distinguer.",
  autre:
    "Ce que tu ressens n'est pas aléatoire.\n\nChaque femme vit la ménopause différemment. Ton corps a des besoins nutritionnels spécifiques qui évoluent en ce moment.\n\nNutriMéno va t'aider à les identifier et à y répondre, jour après jour.",
};

export const PRIORITY_NUTRIENTS: Record<SymptomKey, string> = {
  fatigue: "Magnésium, Vitamine D, Fer",
  bouffees: "Phytoestrogènes, Vitamine D",
  sommeil: "Magnésium, Vitamine B6",
  poids: "Protéines, Fibres, Magnésium",
  humeur: "Oméga-3, Magnésium, Vitamines B",
  memoire: "Oméga-3, Vitamines B, Antioxydants",
  douleurs: "Oméga-3, Vitamine D, Curcumine",
  autre: "Magnésium, Vitamine D, Oméga-3",
};

export function calcCalories(age: number, weight: number, height: number) {
  const bmr = 10 * weight + 6.25 * height - 5 * age - 161;
  return Math.round(bmr * 1.4);
}

export const ONBOARDING_STORAGE_KEY = "nutrimeno_onboarding_answers";

export type OnboardingAnswers = {
  selected_statements: string[];
  duration_of_changes: string;
  main_symptom: SymptomKey;
  age: number;
  height: number;
  weight: number;
};
