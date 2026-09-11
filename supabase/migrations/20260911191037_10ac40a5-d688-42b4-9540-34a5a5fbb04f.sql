ALTER TABLE public.food_logs
  ADD COLUMN IF NOT EXISTS sel numeric,
  ADD COLUMN IF NOT EXISTS sodium numeric,
  ADD COLUMN IF NOT EXISTS sucres numeric,
  ADD COLUMN IF NOT EXISTS acides_gras_satures numeric,
  ADD COLUMN IF NOT EXISTS brand text,
  ADD COLUMN IF NOT EXISTS micros_estimes boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS micros_coverage_percent numeric;

ALTER TABLE public.favorite_meal_items
  ADD COLUMN IF NOT EXISTS sel numeric,
  ADD COLUMN IF NOT EXISTS sodium numeric,
  ADD COLUMN IF NOT EXISTS sucres numeric,
  ADD COLUMN IF NOT EXISTS acides_gras_satures numeric,
  ADD COLUMN IF NOT EXISTS brand text,
  ADD COLUMN IF NOT EXISTS micros_estimes boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS micros_coverage_percent numeric;