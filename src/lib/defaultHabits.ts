// Default "bad habits" suggested to every user on first visit to the Habitudes tab.
export type DefaultHabit = {
  habit_key: string;
  habit_name: string;
  habit_emoji: string;
  goal: number;
  unit: string;
  symptom_warning?: string;
};

export const DEFAULT_HABITS: DefaultHabit[] = [
  {
    habit_key: "hydratation",
    habit_name: "Hydratation",
    habit_emoji: "💧",
    goal: 8,
    unit: "verre(s)",
    symptom_warning:
      "une bonne hydratation aide à réduire les bouffées de chaleur et la fatigue",
  },
  {
    habit_key: "cafe",
    habit_name: "Café",
    habit_emoji: "☕",
    goal: 2,
    unit: "tasse(s)",
    symptom_warning: "cela peut aggraver tes bouffées de chaleur",
  },
  {
    habit_key: "alcool",
    habit_name: "Alcool",
    habit_emoji: "🍷",
    goal: 1,
    unit: "verre(s)",
    symptom_warning: "cela peut aggraver bouffées de chaleur et insomnie",
  },
  {
    habit_key: "epices",
    habit_name: "Aliments épicés",
    habit_emoji: "🌶️",
    goal: 1,
    unit: "fois",
    symptom_warning: "cela peut déclencher des bouffées de chaleur le soir",
  },
  {
    habit_key: "sucres_rapides",
    habit_name: "Sucres rapides",
    habit_emoji: "🍬",
    goal: 1,
    unit: "fois",
    symptom_warning: "cela peut aggraver fatigue et prise de poids",
  },
  {
    habit_key: "ecrans_lit",
    habit_name: "Écrans avant lit",
    habit_emoji: "📱",
    goal: 0,
    unit: "fois après 21h",
    symptom_warning: "cela peut aggraver l'insomnie",
  },
];
