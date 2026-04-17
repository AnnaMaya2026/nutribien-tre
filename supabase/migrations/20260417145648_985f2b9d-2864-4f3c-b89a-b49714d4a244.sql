CREATE EXTENSION IF NOT EXISTS unaccent;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE OR REPLACE FUNCTION public.f_unaccent(text)
RETURNS text
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
STRICT
SET search_path = public, pg_catalog
AS $$
  SELECT public.unaccent('public.unaccent', $1);
$$;

CREATE INDEX IF NOT EXISTS aliments_ciqual_nom_unaccent_idx
ON public.aliments_ciqual
USING gin (public.f_unaccent(nom) gin_trgm_ops);