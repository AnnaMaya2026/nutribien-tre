
ALTER TABLE public.weekly_reports
  ADD COLUMN IF NOT EXISTS week_end date,
  ADD COLUMN IF NOT EXISTS report_data jsonb;
ALTER TABLE public.weekly_reports ALTER COLUMN report_text DROP NOT NULL;
