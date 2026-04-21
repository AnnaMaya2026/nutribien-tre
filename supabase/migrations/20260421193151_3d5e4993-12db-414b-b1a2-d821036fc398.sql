ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS hydration_goal integer DEFAULT 8;