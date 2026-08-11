-- Migration: Adjust obter_google_refresh_token return columns (Phase 3 - Step 2)
-- Date: 2026-08-09 18:29:00

-- Drop function with old return type
DROP FUNCTION IF EXISTS public.obter_google_refresh_token(UUID);

-- Recreate function returning google_integracao_id as well
CREATE OR REPLACE FUNCTION public.obter_google_refresh_token(p_user_id UUID)
RETURNS TABLE (google_integracao_id BIGINT, refresh_token TEXT, calendar_id TEXT) AS $$
BEGIN
  RETURN QUERY
  SELECT g.id as google_integracao_id, s.decrypted_secret::text as refresh_token, g.calendar_id
  FROM public.google_integracao g
  JOIN vault.decrypted_secrets s ON g.refresh_token_secret_id = s.id
  WHERE g.user_id = p_user_id AND g.ativo = true
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
