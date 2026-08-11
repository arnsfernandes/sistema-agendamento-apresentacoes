-- Migration: Enable Row-Level Security on clientes (Phase 3 - Step 3 - Part 1)
-- Date: 2026-08-09 18:36:00

-- Enable RLS
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;

-- Drop policy if exists to avoid conflicts
DROP POLICY IF EXISTS "Clientes isolation policy" ON public.clientes;

-- Create policy for select, insert, update, delete operations
CREATE POLICY "Clientes isolation policy" ON public.clientes
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
