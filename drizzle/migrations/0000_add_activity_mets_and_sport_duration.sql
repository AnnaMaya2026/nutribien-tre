CREATE TABLE public.activity_mets (
  id SERIAL PRIMARY KEY,
  activite TEXT NOT NULL UNIQUE,
  met NUMERIC NOT NULL,
  commentaire TEXT
);

GRANT SELECT ON public.activity_mets TO authenticated;
GRANT SELECT ON public.activity_mets TO anon;
GRANT ALL ON public.activity_mets TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.activity_mets_id_seq TO service_role;

ALTER TABLE public.activity_mets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Activity METs are readable by everyone"
ON public.activity_mets FOR SELECT
USING (true);

ALTER TABLE public.routines
  ADD COLUMN IF NOT EXISTS activity_key TEXT,
  ADD COLUMN IF NOT EXISTS custom_met NUMERIC,
  ADD COLUMN IF NOT EXISTS default_duration_min NUMERIC;

ALTER TABLE public.routine_logs
  ADD COLUMN IF NOT EXISTS duration_min NUMERIC,
  ADD COLUMN IF NOT EXISTS met_used NUMERIC,
  ADD COLUMN IF NOT EXISTS calories_burned NUMERIC;