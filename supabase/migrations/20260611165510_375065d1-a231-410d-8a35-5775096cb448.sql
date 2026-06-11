ALTER TABLE public.user_habits ADD COLUMN IF NOT EXISTS habit_type TEXT NOT NULL DEFAULT 'limiter';

-- Backfill auto-detection for existing rows
UPDATE public.user_habits
SET habit_type = 'atteindre'
WHERE habit_type = 'limiter'
  AND (
    lower(habit_key) ~ '(eau|hydrat|activit|sport|legume|légume|fruit|marche|step)'
    OR lower(habit_name) ~ '(eau|hydrat|activit|sport|légume|legume|fruit|marche)'
  );

UPDATE public.user_habits
SET habit_type = 'limiter'
WHERE lower(habit_key) ~ '(cafe|café|alcool|ecran|écran|epice|épice|sucre|soda|biere|bière|vin)'
   OR lower(habit_name) ~ '(café|cafe|alcool|écran|ecran|épice|epice|sucre|soda|bière|biere|vin)';