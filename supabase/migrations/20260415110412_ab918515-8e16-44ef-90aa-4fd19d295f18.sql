
-- Create favorite_meals table
CREATE TABLE public.favorite_meals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  meal_type TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.favorite_meals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own favorite meals" ON public.favorite_meals FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own favorite meals" ON public.favorite_meals FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own favorite meals" ON public.favorite_meals FOR DELETE USING (auth.uid() = user_id);

-- Create favorite_meal_items table
CREATE TABLE public.favorite_meal_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  favorite_meal_id UUID NOT NULL REFERENCES public.favorite_meals(id) ON DELETE CASCADE,
  food_name TEXT NOT NULL,
  portion_size NUMERIC DEFAULT 1,
  calories NUMERIC DEFAULT 0,
  proteins NUMERIC DEFAULT 0,
  carbs NUMERIC DEFAULT 0,
  fats NUMERIC DEFAULT 0,
  fibres NUMERIC DEFAULT 0,
  calcium NUMERIC DEFAULT 0,
  vitamin_d NUMERIC DEFAULT 0,
  magnesium NUMERIC DEFAULT 0,
  iron NUMERIC DEFAULT 0,
  omega3 NUMERIC DEFAULT 0,
  phytoestrogens NUMERIC DEFAULT 0,
  vitamin_b12 NUMERIC DEFAULT 0
);

ALTER TABLE public.favorite_meal_items ENABLE ROW LEVEL SECURITY;

-- RLS via parent table ownership
CREATE POLICY "Users can view their own favorite meal items" ON public.favorite_meal_items FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.favorite_meals WHERE id = favorite_meal_id AND user_id = auth.uid())
);
CREATE POLICY "Users can insert their own favorite meal items" ON public.favorite_meal_items FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.favorite_meals WHERE id = favorite_meal_id AND user_id = auth.uid())
);
CREATE POLICY "Users can delete their own favorite meal items" ON public.favorite_meal_items FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.favorite_meals WHERE id = favorite_meal_id AND user_id = auth.uid())
);
