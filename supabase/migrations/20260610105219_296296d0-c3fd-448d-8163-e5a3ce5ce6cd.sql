-- Streak fields on profiles
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS current_streak integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS best_streak integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_streak_date date;

-- Daily challenges
CREATE TABLE IF NOT EXISTS public.daily_challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  challenge_date date NOT NULL DEFAULT CURRENT_DATE,
  challenge_text text NOT NULL,
  nutrient_key text,
  completed boolean NOT NULL DEFAULT false,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, challenge_date)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.daily_challenges TO authenticated;
GRANT ALL ON public.daily_challenges TO service_role;

ALTER TABLE public.daily_challenges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own challenges" ON public.daily_challenges
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own challenges" ON public.daily_challenges
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own challenges" ON public.daily_challenges
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users delete own challenges" ON public.daily_challenges
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Sophie evening messages
CREATE TABLE IF NOT EXISTS public.sophie_evening_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message_date date NOT NULL DEFAULT CURRENT_DATE,
  summary text NOT NULL,
  insight text NOT NULL,
  challenge text NOT NULL,
  seen boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, message_date)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.sophie_evening_messages TO authenticated;
GRANT ALL ON public.sophie_evening_messages TO service_role;

ALTER TABLE public.sophie_evening_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own evening msgs" ON public.sophie_evening_messages
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own evening msgs" ON public.sophie_evening_messages
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own evening msgs" ON public.sophie_evening_messages
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users delete own evening msgs" ON public.sophie_evening_messages
  FOR DELETE TO authenticated USING (auth.uid() = user_id);
