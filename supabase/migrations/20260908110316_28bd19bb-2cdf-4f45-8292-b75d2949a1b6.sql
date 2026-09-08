ALTER TABLE public.supplements ADD COLUMN IF NOT EXISTS poids_dose_g numeric;
ALTER TABLE public.supplement_logs ADD COLUMN IF NOT EXISTS quantite numeric NOT NULL DEFAULT 1;