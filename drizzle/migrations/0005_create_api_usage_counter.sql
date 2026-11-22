CREATE TABLE public.api_usage (
  user_id uuid NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  usage_date date NOT NULL,
  function_name text NOT NULL,
  call_count integer NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, usage_date, function_name)
);
GRANT ALL ON TABLE public.api_usage TO service_role;
REVOKE ALL ON TABLE public.api_usage FROM PUBLIC, anon, authenticated;
ALTER TABLE public.api_usage ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.increment_api_usage(p_user_id uuid, p_function_name text, p_usage_date date)
RETURNS integer
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $function$
  INSERT INTO public.api_usage AS usage (user_id, usage_date, function_name, call_count)
  VALUES (p_user_id, p_usage_date, p_function_name, 1)
  ON CONFLICT (user_id, usage_date, function_name)
  DO UPDATE SET call_count = usage.call_count + 1
  RETURNING call_count;
$function$;
REVOKE ALL ON FUNCTION public.increment_api_usage(uuid, text, date) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.increment_api_usage(uuid, text, date) TO service_role;