ALTER TABLE public.food_logs
  ADD COLUMN source text,
  ADD COLUMN ciqual_name text;

ALTER TABLE public.favorite_meal_items
  ADD COLUMN source text,
  ADD COLUMN ciqual_name text;