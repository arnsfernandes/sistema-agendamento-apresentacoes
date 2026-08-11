-- Migration: Preparatory changes for client and presentation isolation (Phase 3 - Step 1)
-- Date: 2026-08-09 18:21:00

-- =========================================================================
-- 1. Schema Alterations
-- =========================================================================

-- Add columns to public.clientes (preserving rows on integration deletion)
ALTER TABLE public.clientes
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS google_integracao_id BIGINT REFERENCES public.google_integracao(id) ON DELETE SET NULL;

-- Add columns to public.apresentacoes (preserving rows on integration deletion)
ALTER TABLE public.apresentacoes
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS google_integracao_id BIGINT REFERENCES public.google_integracao(id) ON DELETE SET NULL;


-- =========================================================================
-- 2. Safe Data Migration
-- =========================================================================

DO $$
DECLARE
  v_active_user_id UUID;
  v_active_integracao_id BIGINT;
  v_active_count INT;
BEGIN
  -- Count the number of active integrations to ensure unequivocal identification
  SELECT count(*) INTO v_active_count
  FROM public.google_integracao
  WHERE ativo = true;

  -- Only migrate if there is exactly one active integration in the entire database
  IF v_active_count = 1 THEN
    SELECT user_id, id INTO v_active_user_id, v_active_integracao_id
    FROM public.google_integracao
    WHERE ativo = true
    LIMIT 1;

    -- Update existing clients
    UPDATE public.clientes
    SET user_id = v_active_user_id,
        google_integracao_id = v_active_integracao_id
    WHERE user_id IS NULL;

    -- Update existing presentations
    UPDATE public.apresentacoes
    SET user_id = v_active_user_id,
        google_integracao_id = v_active_integracao_id
    WHERE user_id IS NULL;

    RAISE NOTICE 'Dados legados migrados com sucesso para a integracao ativa %.', v_active_integracao_id;
  ELSE
    RAISE NOTICE 'Migracao de dados pulada: % integracoes ativas encontradas.', v_active_count;
  END IF;
END $$;
