CREATE OR REPLACE FUNCTION public.search_aliments_unaccent(search_term text, max_results int DEFAULT 1000)
RETURNS SETOF public.aliments_ciqual
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
  SELECT *
  FROM public.aliments_ciqual
  WHERE public.f_unaccent(nom) ILIKE '%' || public.f_unaccent(search_term) || '%'
  LIMIT max_results;
$$;

GRANT EXECUTE ON FUNCTION public.search_aliments_unaccent(text, int) TO anon, authenticated;