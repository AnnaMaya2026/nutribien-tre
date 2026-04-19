// Health conditions options shown in the dashboard health profile card.
// Saved as text codes in profiles.health_conditions[].
export const HEALTH_CONDITIONS = [
  { value: "cholesterol", label: "Cholestérol élevé" },
  { value: "diabete", label: "Diabète ou prédiabète" },
  { value: "hypertension", label: "Hypertension" },
  { value: "osteoporose", label: "Ostéoporose ou ostéopénie" },
  { value: "surpoids", label: "Surpoids" },
  { value: "syndrome_metabolique", label: "Syndrome métabolique" },
  { value: "thyroide", label: "Troubles thyroïdiens" },
] as const;

export type HealthConditionCode = typeof HEALTH_CONDITIONS[number]["value"];

export const HEALTH_DISCLAIMER =
  "⚠️ NutriMéno ne remplace pas un suivi médical. Consultez votre médecin pour tout conseil de santé personnalisé.";
