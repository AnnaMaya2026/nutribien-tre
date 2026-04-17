ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS duration_of_changes TEXT,
  ADD COLUMN IF NOT EXISTS main_symptom TEXT,
  ADD COLUMN IF NOT EXISTS selected_statements TEXT[] DEFAULT '{}'::text[];