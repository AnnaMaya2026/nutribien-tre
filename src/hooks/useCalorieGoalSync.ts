import { useEffect, useRef } from "react";
import { useProfile } from "@/hooks/useProfile";
import { calorieGoalDetails } from "@/lib/calorieGoal";

/**
 * Détail de l'objectif calorique du profil, et mise à jour de la valeur
 * enregistrée (profiles.daily_calorie_goal, lue par les fonctions serveur)
 * dès qu'elle diffère de l'objectif calculé.
 */
export function useCalorieGoalSync() {
  const { profile, updateProfile } = useProfile();
  const p = profile as any;
  const details = calorieGoalDetails({
    weight: p?.weight,
    height: p?.height,
    age: p?.age,
    activityLevel: p?.activity_level,
    objective: p?.objective,
  });
  const lastSent = useRef<number | null>(null);
  useEffect(() => {
    if (!p || Number(p.daily_calorie_goal) === details.goal || lastSent.current === details.goal) return;
    lastSent.current = details.goal;
    updateProfile.mutate({ daily_calorie_goal: details.goal } as any);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p?.daily_calorie_goal, details.goal]);
  return details;
}
