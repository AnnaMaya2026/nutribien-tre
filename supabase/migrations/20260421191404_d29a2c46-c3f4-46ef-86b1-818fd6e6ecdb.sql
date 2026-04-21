ALTER TABLE public.food_logs
  ADD COLUMN IF NOT EXISTS potassium numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS zinc numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS vitamin_k numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS vitamin_b6 numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS vitamin_b9 numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS vitamin_e numeric DEFAULT 0;

ALTER TABLE public.favorite_meal_items
  ADD COLUMN IF NOT EXISTS potassium numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS zinc numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS vitamin_k numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS vitamin_b6 numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS vitamin_b9 numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS vitamin_e numeric DEFAULT 0;