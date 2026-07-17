ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS sophie_preferences jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS sophie_trends_summary text,
  ADD COLUMN IF NOT EXISTS sophie_trends_updated_at timestamptz;