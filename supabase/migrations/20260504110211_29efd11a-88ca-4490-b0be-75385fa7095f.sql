ALTER TABLE public.routines
  ADD COLUMN IF NOT EXISTS provides_nutrient boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS nutrient_key text,
  ADD COLUMN IF NOT EXISTS nutrient_amount numeric,
  ADD COLUMN IF NOT EXISTS nutrient_unit text;