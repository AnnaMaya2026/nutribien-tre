-- Daily AI recap table
CREATE TABLE public.daily_recaps (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  recap_date DATE NOT NULL DEFAULT CURRENT_DATE,
  recap_text TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, recap_date)
);

ALTER TABLE public.daily_recaps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own recaps"
  ON public.daily_recaps FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own recaps"
  ON public.daily_recaps FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own recaps"
  ON public.daily_recaps FOR DELETE
  USING (auth.uid() = user_id);

-- Profile additions: health conditions + Sophie daily message counter
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS health_conditions TEXT[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS health_other TEXT,
  ADD COLUMN IF NOT EXISTS daily_message_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_message_date DATE;