// Source unique des repères nutritionnels de NutriMéno (femme adulte ménopausée).
//
// Ce fichier est lu à la fois par les écrans (via src/lib/nutrientReferences.ts)
// et par toutes les fonctions serveur (via ../_shared/nutrientReferences.ts).
// Aucun repère ne doit être réécrit ailleurs : le test
// src/test/nutrientReferences.test.ts échoue si un chiffre diverge.
//
// Vitamines et minéraux : ANSES, « Les références nutritionnelles en vitamines
// et minéraux », avis du 2 mars 2021 (saisine 2018-SA-0238), valeurs femme
// adulte, ménopausée pour le fer. Plafonds = limites supérieures de sécurité
// (LSS) publiées par l'ANSES (B6 12 mg et sélénium 255 µg repris de l'EFSA 2023).
// Ce fichier ne dépend d'aucun autre module.

export type ReferenceKey =
  | "calcium"
  | "vitamin_d"
  | "magnesium"
  | "iron"
  | "zinc"
  | "vitamin_b12"
  | "vitamin_b9"
  | "vitamin_b6"
  | "vitamin_e"
  | "vitamin_k"
  | "potassium"
  | "selenium"
  | "vitamin_c";

export type ReferenceUnit = "mg" | "µg" | "g";

export interface NutrientReference {
  label: string;
  unit: ReferenceUnit;
  /** Repère journalier à atteindre. */
  target: number;
  /** RNP = référence nutritionnelle pour la population ; AS = apport satisfaisant. */
  type: "RNP" | "AS";
  /** Limite supérieure de sécurité, ou null si l'ANSES n'en fixe pas. */
  upperLimit: number | null;
  /** « total » = alimentation + compléments ; « supplements » = compléments seuls. */
  upperLimitScope: "total" | "supplements" | null;
  note?: string;
}

export const NUTRIENT_REFERENCES_SOURCE =
  "ANSES, références nutritionnelles en vitamines et minéraux, mars 2021 — femme adulte ménopausée";

export const NUTRIENT_REFERENCES: Record<ReferenceKey, NutrientReference> = {
  calcium: { label: "Calcium", unit: "mg", target: 950, type: "RNP", upperLimit: 2500, upperLimitScope: "total", note: "à partir de 25 ans" },
  vitamin_d: { label: "Vitamine D", unit: "µg", target: 15, type: "AS", upperLimit: 100, upperLimitScope: "total" },
  magnesium: { label: "Magnésium", unit: "mg", target: 300, type: "AS", upperLimit: 250, upperLimitScope: "supplements", note: "la limite ne concerne que le magnésium des compléments" },
  iron: { label: "Fer", unit: "mg", target: 11, type: "RNP", upperLimit: 40, upperLimitScope: "total", note: "femme ménopausée" },
  zinc: { label: "Zinc", unit: "mg", target: 9.3, type: "RNP", upperLimit: 25, upperLimitScope: "total", note: "pour un apport en phytates de 600 mg/j (alimentation mixte courante)" },
  vitamin_b12: { label: "Vitamine B12", unit: "µg", target: 4, type: "AS", upperLimit: null, upperLimitScope: null },
  vitamin_b9: { label: "Vitamine B9 (folate)", unit: "µg", target: 330, type: "RNP", upperLimit: 1000, upperLimitScope: "supplements", note: "la limite concerne l'acide folique des compléments" },
  vitamin_b6: { label: "Vitamine B6", unit: "mg", target: 1.6, type: "RNP", upperLimit: 12, upperLimitScope: "total" },
  vitamin_e: { label: "Vitamine E", unit: "mg", target: 9, type: "AS", upperLimit: 300, upperLimitScope: "total" },
  vitamin_k: { label: "Vitamine K", unit: "µg", target: 79, type: "AS", upperLimit: null, upperLimitScope: null },
  potassium: { label: "Potassium", unit: "mg", target: 3500, type: "AS", upperLimit: null, upperLimitScope: null },
  selenium: { label: "Sélénium", unit: "µg", target: 70, type: "AS", upperLimit: 255, upperLimitScope: "total" },
  vitamin_c: { label: "Vitamine C", unit: "mg", target: 110, type: "RNP", upperLimit: null, upperLimitScope: null },
};

export function isReferenceKey(key: string): key is ReferenceKey {
  return Object.prototype.hasOwnProperty.call(NUTRIENT_REFERENCES, key);
}

/** Repère journalier d'un nutriment, ou null s'il n'est pas dans la table. */
export function referenceTarget(key: string): number | null {
  return isReferenceKey(key) ? NUTRIENT_REFERENCES[key].target : null;
}

/** Limite supérieure de sécurité d'un nutriment, ou null. */
export function referenceUpperLimit(key: string): number | null {
  return isReferenceKey(key) ? NUTRIENT_REFERENCES[key].upperLimit : null;
}

/**
 * Valeur à comparer à la limite de sécurité : total du jour, ou seulement
 * les compléments quand la limite ne porte que sur eux (magnésium, acide folique).
 */
export function amountForUpperLimit(key: string, food: number, supplements: number): number {
  if (isReferenceKey(key) && NUTRIENT_REFERENCES[key].upperLimitScope === "supplements") return supplements;
  return food + supplements;
}

// ── Macronutriments ────────────────────────────────────────────────────────

/** Fibres : apport satisfaisant adulte ANSES 2016, 30 g/jour. */
export const FIBRES_GOAL_G = 30;

/** Lipides : 35 % de l'énergie (ANSES, 35 à 40 %). Glucides = énergie restante. */
export const FAT_ENERGY_SHARE = 0.35;

/** Protéines : 1,2 g par kg de poids (choix validé pour la femme ménopausée). */
export const PROTEIN_G_PER_KG = 1.2;

/** Protéines (g/jour) selon le poids, ou null si le poids est inconnu. */
export function proteinGoalFromWeight(weightKg?: number | null): number | null {
  const w = Number(weightKg);
  return Number.isFinite(w) && w > 0 ? Math.round(w * PROTEIN_G_PER_KG) : null;
}

// ── Oméga-3 (ANSES 2011, acides gras) ──────────────────────────────────────
// ALA = 1 % de l'apport énergétique ; DHA 250 mg + EPA 250 mg = 0,5 g.
// L'appli suit un total : ALA (selon l'objectif calorique) + EPA + DHA.

export const OMEGA3_ALA_ENERGY_SHARE = 0.01;
export const OMEGA3_EPA_DHA_G = 0.5;
const KCAL_PER_G_FAT = 9;

/** Objectif oméga-3 total (g/jour) selon l'objectif calorique, ou null s'il est inconnu. */
export function omega3GoalG(calorieGoalKcal?: number | null): number | null {
  const kcal = Number(calorieGoalKcal);
  if (!Number.isFinite(kcal) || kcal <= 0) return null;
  const ala = (kcal * OMEGA3_ALA_ENERGY_SHARE) / KCAL_PER_G_FAT;
  return Math.round((ala + OMEGA3_EPA_DHA_G) * 10) / 10;
}

// ── Phytoestrogènes (isoflavones) ──────────────────────────────────────────
// Ce n'est PAS un objectif : l'ANSES (mars 2025) fixe une valeur toxicologique
// de référence à ne pas dépasser, 0,02 mg/kg de poids/jour pour la population
// générale (0,01 pour les femmes en âge de procréer, hors cible de l'appli).

export const PHYTOESTROGENS_MAX_MG_PER_KG = 0.02;

/** Seuil maximal d'isoflavones (mg/jour) selon le poids, ou null si le poids est inconnu. */
export function phytoestrogensMaxMg(weightKg?: number | null): number | null {
  const w = Number(weightKg);
  if (!Number.isFinite(w) || w <= 0) return null;
  return Math.round(w * PHYTOESTROGENS_MAX_MG_PER_KG * 10) / 10;
}

// ── Nutriments clés suivis par Sophie, le défi du jour et les rapports ─────

export interface KeyGoal {
  goal: number;
  label: string;
  unit: string;
}

/**
 * Objectifs des nutriments clés (calcium, vitamine D, magnésium, fer, oméga-3,
 * fibres). Les oméga-3 ne figurent que si l'objectif calorique est connu.
 */
export function keyNutrientGoals(calorieGoalKcal?: number | null): Record<string, KeyGoal> {
  const goals: Record<string, KeyGoal> = {};
  for (const key of ["calcium", "vitamin_d", "magnesium", "iron"] as const) {
    const r = NUTRIENT_REFERENCES[key];
    goals[key] = { goal: r.target, label: r.label, unit: r.unit };
  }
  const omega3 = omega3GoalG(calorieGoalKcal);
  if (omega3 != null) goals.omega3 = { goal: omega3, label: "Oméga-3", unit: "g" };
  goals.fibres = { goal: FIBRES_GOAL_G, label: "Fibres", unit: "g" };
  return goals;
}
