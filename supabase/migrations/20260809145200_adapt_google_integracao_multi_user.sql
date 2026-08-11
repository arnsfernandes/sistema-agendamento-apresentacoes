-- Migration: Adapt google_integracao to support multi-user integrations using bigint PK (Phase 1)
-- Date: 2026-08-09 15:22:00

-- =========================================================================
-- 1. Schema Alterations on google_integracao Table
-- =========================================================================

-- Drop NOT NULL constraint from responsavel_user_id to allow new rows to skip it
ALTER TABLE public.google_integracao ALTER COLUMN responsavel_user_id DROP NOT NULL;

-- Add new columns if they do not exist (id bigint is already the PK and remains unchanged)
ALTER TABLE public.google_integracao
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS google_account_sub TEXT,
  ADD COLUMN IF NOT EXISTS ativo BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT now();

-- Populate user_id and active status from existing data
UPDATE public.google_integracao
SET 
  user_id = responsavel_user_id,
  ativo = CASE WHEN refresh_token_secret_id IS NOT NULL THEN true ELSE false END
WHERE user_id IS NULL;

-- Enforce Rule A: Only 1 active integration per user at a time
DROP INDEX IF EXISTS unique_active_integration_per_user;
CREATE UNIQUE INDEX unique_active_integration_per_user 
  ON public.google_integracao (user_id) 
  WHERE (ativo = true);

-- Enforce Rule B: Prevent duplicate user_id + google_account_sub + calendar_id combinations
ALTER TABLE public.google_integracao DROP CONSTRAINT IF EXISTS unique_user_sub_calendar;
ALTER TABLE public.google_integracao 
  ADD CONSTRAINT unique_user_sub_calendar UNIQUE (user_id, google_account_sub, calendar_id);


-- =========================================================================
-- 2. New Database RPC Definitions (Overloads)
-- =========================================================================

-- RPC A: salvar_google_integracao (New 4-parameter signature)
-- Creates a temporary active context without a calendar and registers the token encrypted in Supabase Vault, tied to bigint ID
CREATE OR REPLACE FUNCTION public.salvar_google_integracao(
  p_user_id UUID,
  p_google_email TEXT,
  p_refresh_token TEXT,
  p_google_account_sub TEXT
) RETURNS VOID AS $$
DECLARE
  v_integration_id BIGINT;
  v_secret_id UUID;
BEGIN
  -- 1. Deactivate any currently active integrations for this user
  UPDATE public.google_integracao
  SET ativo = false
  WHERE user_id = p_user_id;

  -- 2. Pre-generate the next ID sequence value for the integration bigint PK
  v_integration_id := nextval('public.google_integracao_id_seq');

  -- 3. Create the secret in Supabase Vault (binding to the bigint integration ID)
  SELECT vault.create_secret(p_refresh_token, 'google_refresh_token_' || v_integration_id::text) INTO v_secret_id;

  -- 4. Insert temporary active connection row (calendar_id is NULL initially)
  INSERT INTO public.google_integracao (id, user_id, google_email, refresh_token_secret_id, google_account_sub, ativo, updated_at)
  VALUES (v_integration_id, p_user_id, p_google_email, v_secret_id, p_google_account_sub, true, now());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- RPC B: obter_google_refresh_token (New 1-parameter signature)
-- Filters strictly by user ID and active connection status, loading token safely from Vault
CREATE OR REPLACE FUNCTION public.obter_google_refresh_token(p_user_id UUID)
RETURNS TABLE (refresh_token TEXT, calendar_id TEXT) AS $$
BEGIN
  RETURN QUERY
  SELECT s.decrypted_secret::text as refresh_token, g.calendar_id
  FROM public.google_integracao g
  JOIN vault.decrypted_secrets s ON g.refresh_token_secret_id = s.id
  WHERE g.user_id = p_user_id AND g.ativo = true
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
