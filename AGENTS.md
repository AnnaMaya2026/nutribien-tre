# Architecture rules
- Keep frontend fibre targets in `src/lib/calorieGoal.ts` and server fibre targets in `supabase/functions/_shared/nutritionTargets.ts`, with an equality test, because server functions cannot import frontend source.
- Reuse SupplementFrequencyChoice and its settings validation in both supplement entry dialogs so frequency options cannot diverge between entry paths.