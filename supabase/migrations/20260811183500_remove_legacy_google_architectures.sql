-- Migration: Remove legacy Google integration architecture overloads and column
-- Timestamp: 20260811183500

-- 1. Drop legacy RPC functions
DROP FUNCTION IF EXISTS public.obter_google_refresh_token();
DROP FUNCTION IF EXISTS public.salvar_google_integracao(UUID, TEXT, TEXT);

-- 2. Drop legacy responsavel_user_id column from google_integracao table
ALTER TABLE public.google_integracao DROP COLUMN IF EXISTS responsavel_user_id CASCADE;
