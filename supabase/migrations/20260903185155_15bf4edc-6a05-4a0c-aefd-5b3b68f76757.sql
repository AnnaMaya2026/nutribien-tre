
ALTER TABLE public.supplements
  ADD COLUMN IF NOT EXISTS quotidien boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS composition_incomplete boolean NOT NULL DEFAULT false;

-- Anciennes fiches migrées depuis les routines, sans composition : mises en veille
UPDATE public.supplements s
SET actif = false
WHERE s.source_routine_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM public.supplement_nutrients n WHERE n.supplement_id = s.id);

DO $$
DECLARE
  uid uuid := '81324b7a-5545-4fc7-b560-bc362d388bc4';
  sid uuid;
BEGIN
  -- 1. Therascience Physiomance Ménoliance SP
  INSERT INTO public.supplements (user_id, nom, marque, dose_par_prise, unite_dose, actif, quotidien)
  VALUES (uid, 'Physiomance Ménoliance SP', 'Therascience', 2, 'gélules', true, true)
  RETURNING id INTO sid;
  INSERT INTO public.supplement_nutrients (supplement_id, nutrient_key, amount, unit) VALUES
    (sid,'selenium',55,'µg'),(sid,'zinc',10,'mg'),(sid,'vitamin_c',80,'mg'),
    (sid,'vitamin_d',5,'µg'),(sid,'vitamin_e',12,'mg'),(sid,'vitamin_b1',1.1,'mg'),
    (sid,'vitamin_b2',1.4,'mg'),(sid,'vitamin_b3',16,'mg'),(sid,'vitamin_b5',6,'mg'),
    (sid,'vitamin_b6',1.4,'mg'),(sid,'vitamin_b8',50,'µg'),(sid,'vitamin_b9',200,'µg'),
    (sid,'vitamin_b12',2.5,'µg');

  -- 2. Arkopharma Forcapil Fortifiant (composition incomplète)
  INSERT INTO public.supplements (user_id, nom, marque, dose_par_prise, unite_dose, actif, quotidien, composition_incomplete)
  VALUES (uid, 'Forcapil Fortifiant', 'Arkopharma', 2, 'gélules', true, true, true)
  RETURNING id INTO sid;
  INSERT INTO public.supplement_nutrients (supplement_id, nutrient_key, amount, unit) VALUES
    (sid,'zinc',15,'mg'),(sid,'vitamin_b8',450,'µg'),
    (sid,'l_cystine',300,'mg'),(sid,'l_methionine',100,'mg');

  -- 3. Make My Mask DHT Blocker
  INSERT INTO public.supplements (user_id, nom, marque, dose_par_prise, unite_dose, actif, quotidien)
  VALUES (uid, 'DHT Blocker', 'Make My Mask', 2, 'gélules', true, true)
  RETURNING id INTO sid;
  INSERT INTO public.supplement_nutrients (supplement_id, nutrient_key, amount, unit) VALUES
    (sid,'zinc',1.5,'mg'),(sid,'vitamin_b6',0.42,'mg'),
    (sid,'vitamin_d',0.75,'µg'),(sid,'vitamin_b8',50,'µg');

  -- 4. Delical Poudre de Protéines (12 g typiques, valeurs ramenées à la dose)
  INSERT INTO public.supplements (user_id, nom, marque, dose_par_prise, unite_dose, actif, quotidien)
  VALUES (uid, 'Poudre de Protéines', 'Delical', 12, 'g', true, false)
  RETURNING id INTO sid;
  INSERT INTO public.supplement_nutrients (supplement_id, nutrient_key, amount, unit) VALUES
    (sid,'calcium',244.56,'mg'),(sid,'proteins',10.08,'g');

  -- 5. Colafit
  INSERT INTO public.supplements (user_id, nom, marque, dose_par_prise, unite_dose, actif, quotidien)
  VALUES (uid, 'Colafit', 'Colafit', 1, 'cube', true, true)
  RETURNING id INTO sid;
  INSERT INTO public.supplement_nutrients (supplement_id, nutrient_key, amount, unit) VALUES
    (sid,'collagene_type_i',8,'mg');
END $$;
