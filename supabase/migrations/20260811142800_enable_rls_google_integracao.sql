-- Migration: Enable Row-Level Security on google_integracao
-- Date: 2026-08-11 14:28:00

-- Enable RLS
ALTER TABLE public.google_integracao ENABLE ROW LEVEL SECURITY;

-- Drop policy if exists to avoid conflicts
DROP POLICY IF EXISTS "Google integracao isolation select policy" ON public.google_integracao;

-- Create policy for select operation only
CREATE POLICY "Google integracao isolation select policy" ON public.google_integracao
  FOR SELECT
  USING (
    auth.uid() = user_id
  );
