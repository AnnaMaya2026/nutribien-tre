-- Routines definitions
CREATE TABLE public.routines (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'autre',
  frequency TEXT NOT NULL DEFAULT 'quotidien',
  active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.routines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own routines" ON public.routines
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own routines" ON public.routines
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own routines" ON public.routines
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own routines" ON public.routines
  FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_routines_updated_at
  BEFORE UPDATE ON public.routines
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Routine completion logs
CREATE TABLE public.routine_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  routine_id UUID NOT NULL REFERENCES public.routines(id) ON DELETE CASCADE,
  logged_at DATE NOT NULL DEFAULT CURRENT_DATE,
  completed BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (routine_id, logged_at)
);

ALTER TABLE public.routine_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own routine logs" ON public.routine_logs
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own routine logs" ON public.routine_logs
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own routine logs" ON public.routine_logs
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own routine logs" ON public.routine_logs
  FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX idx_routine_logs_user_date ON public.routine_logs(user_id, logged_at DESC);
CREATE INDEX idx_routines_user_active ON public.routines(user_id, active);