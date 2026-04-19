CREATE TABLE public.saved_menus (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  content text NOT NULL,
  menu_date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.saved_menus ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own saved menus"
  ON public.saved_menus FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own saved menus"
  ON public.saved_menus FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own saved menus"
  ON public.saved_menus FOR DELETE
  USING (auth.uid() = user_id);

CREATE INDEX idx_saved_menus_user_date ON public.saved_menus(user_id, menu_date DESC);