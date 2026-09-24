ALTER TABLE public.food_logs ADD COLUMN IF NOT EXISTS ingredients jsonb;
ALTER TABLE public.favorite_meal_items ADD COLUMN IF NOT EXISTS ingredients jsonb;