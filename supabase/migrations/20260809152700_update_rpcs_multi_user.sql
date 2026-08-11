-- Migration: Create new multi-user RPC overloads for Google integration (Phase 1)
-- Date: 2026-08-09 15:27:00

-- =========================================================================
-- 1. RPC A: salvar_google_integracao (New 4-parameter signature)
-- =========================================================================
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


-- =========================================================================
-- 2. RPC B: obter_google_refresh_token (New 1-parameter signature)
-- =========================================================================
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
