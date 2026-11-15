ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS birth_year integer;

UPDATE public.profiles
SET birth_year = EXTRACT(YEAR FROM CURRENT_DATE)::int - age
WHERE age IS NOT NULL;

COMMENT ON COLUMN public.profiles.birth_year IS 'Année de naissance facultative, en années pleines. Renseignée par calcul depuis age lors de l''ajout de la colonne ; laissée vide quand age est absent.';