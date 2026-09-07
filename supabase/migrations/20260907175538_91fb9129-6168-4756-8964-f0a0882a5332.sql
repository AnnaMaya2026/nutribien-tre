ALTER TABLE public.nutrient_references ADD COLUMN IF NOT EXISTS ar_etiquetage_ue numeric;

INSERT INTO public.nutrient_references (nutrient_key, unite, ar_etiquetage_ue) VALUES
  ('zinc','mg',10),
  ('vitamin_d','µg',5),
  ('vitamin_b12','µg',2.5),
  ('vitamin_b6','mg',1.4),
  ('vitamin_b9','µg',200),
  ('vitamin_c','mg',80),
  ('vitamin_e','mg',12),
  ('selenium','µg',55),
  ('calcium','mg',800)
ON CONFLICT (nutrient_key) DO UPDATE SET ar_etiquetage_ue = EXCLUDED.ar_etiquetage_ue;