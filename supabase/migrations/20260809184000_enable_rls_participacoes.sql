-- Migration: Enable Row-Level Security on participacoes (Phase 3 - Step 3 - Part 3)
-- Date: 2026-08-09 18:40:00

-- Enable RLS
ALTER TABLE public.participacoes ENABLE ROW LEVEL SECURITY;

-- Drop policy if exists to avoid conflicts
DROP POLICY IF EXISTS "Participacoes isolation policy" ON public.participacoes;

-- Create policy for select, insert, update, delete operations
CREATE POLICY "Participacoes isolation policy" ON public.participacoes
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.apresentacoes a
      WHERE a.id = apresentacao_id 
        AND a.user_id = auth.uid()
        AND a.google_integracao_id IN (
          SELECT id 
          FROM public.google_integracao 
          WHERE user_id = auth.uid() AND ativo = true
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.apresentacoes a
      WHERE a.id = apresentacao_id 
        AND a.user_id = auth.uid()
        AND a.google_integracao_id IN (
          SELECT id 
          FROM public.google_integracao 
          WHERE user_id = auth.uid() AND ativo = true
        )
    )
  );
