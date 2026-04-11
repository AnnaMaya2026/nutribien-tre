
-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "Anyone can read aliments_ciqual" ON public.aliments_ciqual;

-- Create new policy allowing all roles (anon + authenticated)
CREATE POLICY "Anyone can read aliments_ciqual"
ON public.aliments_ciqual
FOR SELECT
TO anon, authenticated
USING (true);
