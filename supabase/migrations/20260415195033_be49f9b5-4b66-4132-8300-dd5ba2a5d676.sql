
CREATE TABLE public.nutrient_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  aliment_nom TEXT NOT NULL,
  nutrient_name TEXT NOT NULL,
  current_value NUMERIC,
  suggested_value NUMERIC,
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.nutrient_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert their own nutrient reports"
ON public.nutrient_reports FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own nutrient reports"
ON public.nutrient_reports FOR SELECT
USING (auth.uid() = user_id);
