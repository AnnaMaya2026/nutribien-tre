CREATE TABLE public.sophie_conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  conversation_date DATE NOT NULL DEFAULT CURRENT_DATE,
  role TEXT NOT NULL CHECK (role IN ('user', 'sophie')),
  message TEXT NOT NULL,
  pinned BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.sophie_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own sophie conversations"
ON public.sophie_conversations FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own sophie conversations"
ON public.sophie_conversations FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own sophie conversations"
ON public.sophie_conversations FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own sophie conversations"
ON public.sophie_conversations FOR DELETE
USING (auth.uid() = user_id);

CREATE INDEX idx_sophie_conversations_user_date ON public.sophie_conversations(user_id, conversation_date DESC, created_at);
CREATE INDEX idx_sophie_conversations_pinned ON public.sophie_conversations(user_id, pinned) WHERE pinned = true;