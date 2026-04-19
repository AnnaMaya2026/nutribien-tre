-- Feature 2: Customizable symptoms on profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS disabled_symptoms text[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS custom_symptoms text[] DEFAULT '{}'::text[];

-- Feature 3: Habit tracking table
CREATE TABLE IF NOT EXISTS public.habit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  habit_key text NOT NULL,
  habit_name text NOT NULL,
  habit_emoji text DEFAULT '•',
  goal numeric NOT NULL DEFAULT 1,
  unit text DEFAULT 'fois',
  count numeric NOT NULL DEFAULT 0,
  logged_at date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, habit_key, logged_at)
);

ALTER TABLE public.habit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own habit logs"
  ON public.habit_logs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own habit logs"
  ON public.habit_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own habit logs"
  ON public.habit_logs FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own habit logs"
  ON public.habit_logs FOR DELETE
  USING (auth.uid() = user_id);

CREATE TRIGGER update_habit_logs_updated_at
  BEFORE UPDATE ON public.habit_logs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_habit_logs_user_date ON public.habit_logs(user_id, logged_at DESC);

-- Feature 3: User-level habit definitions (which habits they track + goals)
CREATE TABLE IF NOT EXISTS public.user_habits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  habit_key text NOT NULL,
  habit_name text NOT NULL,
  habit_emoji text DEFAULT '•',
  goal numeric NOT NULL DEFAULT 1,
  unit text DEFAULT 'fois',
  symptom_warning text,
  active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, habit_key)
);

ALTER TABLE public.user_habits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own habit definitions"
  ON public.user_habits FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own habit definitions"
  ON public.user_habits FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own habit definitions"
  ON public.user_habits FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own habit definitions"
  ON public.user_habits FOR DELETE USING (auth.uid() = user_id);