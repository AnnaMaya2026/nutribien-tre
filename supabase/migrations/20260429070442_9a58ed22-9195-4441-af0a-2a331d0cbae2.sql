ALTER TABLE public.routines ADD COLUMN IF NOT EXISTS reminder_enabled boolean NOT NULL DEFAULT false;
ALTER TABLE public.routines ADD COLUMN IF NOT EXISTS reminder_time time;