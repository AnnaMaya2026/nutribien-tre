
CREATE TABLE public.weight_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  weight_kg NUMERIC NOT NULL,
  logged_at DATE NOT NULL DEFAULT CURRENT_DATE,
  goal_weight NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, logged_at)
);

ALTER TABLE public.weight_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own weight logs"
ON public.weight_logs FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own weight logs"
ON public.weight_logs FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own weight logs"
ON public.weight_logs FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own weight logs"
ON public.weight_logs FOR DELETE
USING (auth.uid() = user_id);
