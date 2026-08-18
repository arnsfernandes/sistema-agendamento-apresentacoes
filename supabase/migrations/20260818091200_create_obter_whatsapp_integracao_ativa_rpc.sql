-- Migration: Create public.obter_whatsapp_integracao_ativa RPC
-- Date: 2026-08-18 09:12:00

CREATE OR REPLACE FUNCTION public.obter_whatsapp_integracao_ativa()
RETURNS TABLE (
  id BIGINT,
  whatsapp_number TEXT,
  instance_name TEXT,
  server_url TEXT,
  token TEXT
) AS $$
DECLARE
  v_user_id UUID;
BEGIN
  -- 1. Identify current authenticated user ID
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuario nao autenticado.';
  END IF;

  -- 2. Return active integration details joined with the decrypted secret value from Supabase Vault
  RETURN QUERY
  SELECT 
    w.id,
    w.whatsapp_number,
    w.instance_name,
    w.server_url,
    s.decrypted_secret::text AS token
  FROM public.whatsapp_integracao w
  LEFT JOIN vault.decrypted_secrets s ON w.token_secret_id = s.id
  WHERE w.user_id = v_user_id AND w.ativo = true
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
