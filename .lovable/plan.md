# Plan — 4 actions

## Action 1 — Habitude Sommeil
- Ajouter `sommeil` aux `defaultHabits` (type `atteindre`, goal `8`, unit `heures`, emoji `🌙`).
- `HabitsTracker.tsx`: pour `sommeil`, remplacer les boutons +/- par un input numérique (0 → 12, pas 0,5).
- Code couleur dédié au sommeil :
  - `< 6h` → rouge
  - `6 – 7h` → orange
  - `≥ 7h` → vert
- Mini-courbe 7 / 30 / 90 jours via un nouveau composant `SleepTrendChart` (Recharges LineChart) basé sur `habit_logs` filtrés sur `habit_key='sommeil'`.
- Corrélations : `CorrelationsSection.tsx` agrège déjà les habit_logs ; ajouter `sommeil` comme variable explicative (Δ score symptôme moyen entre nuits ≥7h et nuits <7h).

## Action 2 — Audit valeurs macros/micros (urgent)
- Lire `src/lib/openFoodFacts.ts`, `src/lib/ciqual.ts`, `src/lib/ciqualMatcher.ts`, `src/hooks/useFoodLogs.tsx`, et `parse-menu-foods` pour repérer les conversions douteuses.
- Vérifs ciblées :
  - **Vitamine D** : déjà géré (÷40 si > 50, valeurs CIQUAL en µg).
  - **Oméga-3** : confirmer que la colonne CIQUAL est en `g/100g` (et non `mg`). Si valeurs > 50 hors huiles ⇒ ÷1000 côté ingestion OFF.
  - **Calcium / Magnésium / Fer** : doivent être en `mg`, capper à valeurs physiologiques (Calcium < 2000mg/100g, Magnésium < 1000, Fer < 100).
  - **Protéines / Glucides / Lipides** : en `g/100g`, capper à 100.
- Centraliser dans un helper `sanitizeNutrient(key, value, foodName)` appelé à l’insertion (`useFoodLogs.add` + edge `parse-menu-foods`) pour bloquer toute valeur hors plage avant écriture en BDD.
- Migration ponctuelle (insert tool) : corriger les `food_logs` existants déjà aberrants (oméga-3 > 50 hors huile → /1000, vit D > 100 → /40, etc.).
- Test manuel : ajouter « Saumon 100g » et vérifier protéines ≈ 20g, oméga-3 ≈ 2g, vit D ≈ 8µg.

## Action 3 — Défi du jour : timing + variété
Fichier : `supabase/functions/daily-challenge/index.ts` + `src/components/DailyChallengeCard.tsx`.
- **Timing** : si heure locale ≥ 17h, générer le défi pour `tomorrow` (clé `challenge_date = J+1`), label « 🌅 Défi pour demain ». Sinon défi du jour.
- **Variété** : ajouter au prompt OpenAI la liste des 7 derniers `challenge_text` (à exclure). Fournir aussi une liste seed de 15 défis types (marche 15min, 1L d’eau, 1 fruit, étirement 30s, méditation 5min, yoga 10min, respiration 4-7-8, 10 squats, lecture 10min, contact ami, repas sans écran, etc.) à mixer.
- Card : afficher « Défi pour aujourd’hui » ou « Défi pour demain » selon la date stockée.

## Action 4 — Bilan Sophie hebdo (déficits + recettes)
On étend l’existant `weekly-report` au lieu d’en créer un nouveau.
- Edge `weekly-report/index.ts` : calculer sur les 7 derniers jours
  - moyenne quotidienne pour chaque macro (prot, gluc, lip) et micro (calcium, magnésium, fer, vit D, oméga-3, fibres),
  - delta vs objectif personnalisé (`calorieGoal.ts`),
  - top 3 déficits macros + top 3 déficits micros.
- Mapping `deficit → aliments` (table statique côté edge) :
  - calcium → yaourt, fromage, brocoli, sardines
  - oméga-3 → saumon, sardines, noix, graines de lin
  - magnésium → amandes, chocolat noir 70%, épinards
  - fer → lentilles, boudin, épinards
  - vit D → saumon, jaune œuf, champignons
  - fibres → légumineuses, fruits rouges, avoine
- Ajouter un appel OpenAI court pour produire **une recette unique** combinant 2-3 des aliments recommandés.
- `WeeklyReportCard.tsx` : nouveaux blocs « Tes principaux manques » (liste avec puces colorées) + « Recette suggérée ».

## Détails techniques
- Pas de nouvelle table : tout passe par `habit_logs`, `food_logs`, `weekly_reports.report_data` (JSON).
- Ajouter `sleep_hours` virtuel via `habit_logs.count` (count = heures × 2 si on garde l’entier, ou cast en numeric). On garde `count` integer mais on stocke des **demi-heures** (count = heures × 2) pour autoriser 7.5h sans migration ; affichage divisé par 2.
- `sanitizeNutrient` est pure → tests rapides via `vitest`.

## Ordre d’exécution
1. Action 2 (sanitize + migration data).
2. Action 1 (sommeil).
3. Action 3 (défi).
4. Action 4 (bilan).

Validation finale : `tsgo` + ajout d’un aliment test + déclenchement manuel `daily-challenge` à 18h simulé + déclenchement `weekly-report`.
