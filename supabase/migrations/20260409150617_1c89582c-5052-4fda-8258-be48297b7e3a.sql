CREATE POLICY "Anyone can read aliments_ciqual"
ON public.aliments_ciqual
FOR SELECT
TO authenticated
USING (true);