-- 1. supplements
CREATE TABLE public.supplements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  nom text NOT NULL,
  marque text,
  dose_par_prise numeric,
  unite_dose text DEFAULT 'gélule',
  actif boolean NOT NULL DEFAULT true,
  source_routine_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.supplements TO authenticated;
GRANT ALL ON public.supplements TO service_role;
ALTER TABLE public.supplements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own supplements" ON public.supplements FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER update_supplements_updated_at BEFORE UPDATE ON public.supplements
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_supplements_user ON public.supplements(user_id);

-- 2. supplement_nutrients
CREATE TABLE public.supplement_nutrients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplement_id uuid NOT NULL REFERENCES public.supplements(id) ON DELETE CASCADE,
  nutrient_key text NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  unit text NOT NULL DEFAULT 'mg',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.supplement_nutrients TO authenticated;
GRANT ALL ON public.supplement_nutrients TO service_role;
ALTER TABLE public.supplement_nutrients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own supplement nutrients" ON public.supplement_nutrients FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.supplements s WHERE s.id = supplement_id AND s.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.supplements s WHERE s.id = supplement_id AND s.user_id = auth.uid()));
CREATE INDEX idx_supplement_nutrients_sup ON public.supplement_nutrients(supplement_id);

-- 3. supplement_logs
CREATE TABLE public.supplement_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  supplement_id uuid NOT NULL REFERENCES public.supplements(id) ON DELETE CASCADE,
  logged_at date NOT NULL DEFAULT CURRENT_DATE,
  taken boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (supplement_id, logged_at)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.supplement_logs TO authenticated;
GRANT ALL ON public.supplement_logs TO service_role;
ALTER TABLE public.supplement_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own supplement logs" ON public.supplement_logs FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX idx_supplement_logs_user_date ON public.supplement_logs(user_id, logged_at);

-- 4. nutrient_references (lecture seule côté app)
CREATE TABLE public.nutrient_references (
  nutrient_key text PRIMARY KEY,
  unite text NOT NULL,
  rnp_anses numeric,
  limite_haute numeric
);
GRANT SELECT ON public.nutrient_references TO authenticated;
GRANT SELECT ON public.nutrient_references TO anon;
GRANT ALL ON public.nutrient_references TO service_role;
ALTER TABLE public.nutrient_references ENABLE ROW LEVEL SECURITY;
CREATE POLICY "nutrient references readable" ON public.nutrient_references FOR SELECT USING (true);

INSERT INTO public.nutrient_references (nutrient_key, unite, rnp_anses, limite_haute) VALUES
  ('zinc',        'mg', 11,   25),
  ('vitamin_d',   'µg', 15,   100),
  ('vitamin_b12', 'µg', 4,    NULL),
  ('vitamin_b6',  'mg', 1.6,  25),
  ('vitamin_b9',  'µg', 330,  1000),
  ('vitamin_c',   'mg', 110,  NULL),
  ('vitamin_e',   'mg', 9.9,  300),
  ('selenium',    'µg', 70,   300),
  ('calcium',     'mg', 950,  2500);

-- 5. Migration des routines "complement" (historique conservé)
INSERT INTO public.supplements (user_id, nom, actif, source_routine_id, created_at)
SELECT r.user_id, r.name, r.active, r.id, r.created_at
FROM public.routines r
WHERE r.category = 'complement';

INSERT INTO public.supplement_nutrients (supplement_id, nutrient_key, amount, unit)
SELECT s.id, r.nutrient_key, r.nutrient_amount, COALESCE(r.nutrient_unit, 'mg')
FROM public.routines r
JOIN public.supplements s ON s.source_routine_id = r.id
WHERE r.provides_nutrient = true
  AND r.nutrient_key IS NOT NULL AND r.nutrient_key <> ''
  AND r.nutrient_amount IS NOT NULL AND r.nutrient_amount > 0;

INSERT INTO public.supplement_logs (user_id, supplement_id, logged_at, taken, created_at)
SELECT rl.user_id, s.id, rl.logged_at, rl.completed, rl.created_at
FROM public.routine_logs rl
JOIN public.supplements s ON s.source_routine_id = rl.routine_id
ON CONFLICT (supplement_id, logged_at) DO NOTHING;