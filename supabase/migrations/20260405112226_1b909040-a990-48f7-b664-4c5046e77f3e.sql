
-- Create timestamp update function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Profiles table
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  age INTEGER,
  weight NUMERIC,
  height NUMERIC,
  menopause_stage TEXT CHECK (menopause_stage IN ('perimenopause', 'menopause', 'postmenopause')),
  symptoms TEXT[] DEFAULT '{}',
  dietary_preferences TEXT[] DEFAULT '{}',
  daily_calorie_goal INTEGER,
  profile_completed BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id) VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Food logs table
CREATE TABLE public.food_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  food_name TEXT NOT NULL,
  portion_size NUMERIC DEFAULT 1,
  calories NUMERIC DEFAULT 0,
  proteins NUMERIC DEFAULT 0,
  carbs NUMERIC DEFAULT 0,
  fats NUMERIC DEFAULT 0,
  calcium NUMERIC DEFAULT 0,
  vitamin_d NUMERIC DEFAULT 0,
  magnesium NUMERIC DEFAULT 0,
  iron NUMERIC DEFAULT 0,
  omega3 NUMERIC DEFAULT 0,
  phytoestrogens NUMERIC DEFAULT 0,
  vitamin_b12 NUMERIC DEFAULT 0,
  meal_type TEXT CHECK (meal_type IN ('petit-dejeuner', 'dejeuner', 'diner', 'collation')),
  logged_at DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.food_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own food logs" ON public.food_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own food logs" ON public.food_logs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own food logs" ON public.food_logs FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own food logs" ON public.food_logs FOR DELETE USING (auth.uid() = user_id);

-- Symptom logs table
CREATE TABLE public.symptom_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  fatigue INTEGER CHECK (fatigue BETWEEN 0 AND 5) DEFAULT 0,
  bouffees_chaleur INTEGER CHECK (bouffees_chaleur BETWEEN 0 AND 5) DEFAULT 0,
  insomnie INTEGER CHECK (insomnie BETWEEN 0 AND 5) DEFAULT 0,
  sautes_humeur INTEGER CHECK (sautes_humeur BETWEEN 0 AND 5) DEFAULT 0,
  notes TEXT,
  logged_at DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, logged_at)
);

ALTER TABLE public.symptom_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own symptom logs" ON public.symptom_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own symptom logs" ON public.symptom_logs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own symptom logs" ON public.symptom_logs FOR UPDATE USING (auth.uid() = user_id);
