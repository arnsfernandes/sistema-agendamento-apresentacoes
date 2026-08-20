-- Migration: Create public.whatsapp_agent_context table
-- Date: 2026-08-20 13:48:00

CREATE TABLE IF NOT EXISTS public.whatsapp_agent_context (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  last_presentation_ids BIGINT[] NOT NULL DEFAULT '{}',
  last_query_date DATE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.whatsapp_agent_context ENABLE ROW LEVEL SECURITY;

-- Policy for select/insert/update/delete
DROP POLICY IF EXISTS "Whatsapp_agent_context isolation policy" ON public.whatsapp_agent_context;
CREATE POLICY "Whatsapp_agent_context isolation policy" ON public.whatsapp_agent_context
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
