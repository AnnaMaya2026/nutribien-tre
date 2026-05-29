ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS seen_diagnosis boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS nutritional_diagnosis jsonb,
  ADD COLUMN IF NOT EXISTS sophie_first_message text;