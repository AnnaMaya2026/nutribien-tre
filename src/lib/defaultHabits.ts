// Default "bad habits" suggested to every user on first visit to the Habitudes tab.
import { calculateHydration } from "./habitsCalculator";

export type DefaultHabit = {
  habit_key: string;
  habit_name: string;
  habit_emoji: string;
  goal: number;
  unit: string;
  symptom_warning?: string;
};

export function getDefaultHabits(weightKg?: number): DefaultHabit[] {
  if (!weightKg || weightKg <= 0) return DEFAULT_HABITS;
  const hydration = calculateHydration(weightKg);
  return DEFAULT_HABITS.map((habit) =>
    habit.habit_key === "hydratation"
      ? { ...habit, goal: hydration.target, unit: hydration.label }
      : habit
  );
}


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
    habit_key: "sommeil",
    habit_name: "Sommeil",
    habit_emoji: "🌙",
    // Stored as half-hours (count × 0.5 = heures) pour autoriser 7,5h sans migration.
    goal: 16, // = 8h
    unit: "heures",
    symptom_warning:
      "moins de 7h de sommeil peut aggraver fatigue, bouffées de chaleur et irritabilité",
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
