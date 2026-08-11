-- Migration: Enable Row-Level Security on apresentacoes (Phase 3 - Step 3 - Part 2)
-- Date: 2026-08-09 18:38:00

-- Enable RLS
ALTER TABLE public.apresentacoes ENABLE ROW LEVEL SECURITY;

-- Drop policy if exists to avoid conflicts
DROP POLICY IF EXISTS "Apresentacoes isolation policy" ON public.apresentacoes;

-- Create policy for select, insert, update, delete operations
CREATE POLICY "Apresentacoes isolation policy" ON public.apresentacoes
  FOR ALL
  USING (
    auth.uid() = user_id 
    AND google_integracao_id IN (
      SELECT id 
      FROM public.google_integracao 
      WHERE user_id = auth.uid() AND ativo = true
    )
  )
  WITH CHECK (
    auth.uid() = user_id 
    AND google_integracao_id IN (
      SELECT id 
      FROM public.google_integracao 
      WHERE user_id = auth.uid() AND ativo = true
    )
  );
