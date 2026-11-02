ALTER TABLE public.supplements ADD COLUMN periodicite_jours integer;

ALTER TABLE public.supplements ADD CONSTRAINT supplements_periodicite_jours_check
  CHECK (periodicite_jours IS NULL OR (periodicite_jours >= 2 AND periodicite_jours <= 365));

COMMENT ON COLUMN public.supplements.periodicite_jours IS 'Périodicité en jours (2-365) ; NULL = comportement actuel';