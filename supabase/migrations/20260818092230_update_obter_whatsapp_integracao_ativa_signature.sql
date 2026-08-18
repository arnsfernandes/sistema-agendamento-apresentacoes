-- Migration: Update public.obter_whatsapp_integracao_ativa signature to accept p_user_id UUID
-- Date: 2026-08-18 09:22:30

-- 1. Drop old signature function to prevent overloading conflicts
DROP FUNCTION IF EXISTS public.obter_whatsapp_integracao_ativa();

-- 2. Create the updated function with p_user_id UUID parameter
CREATE OR REPLACE FUNCTION public.obter_whatsapp_integracao_ativa(
  p_user_id UUID
)
RETURNS TABLE (
  id BIGINT,
  whatsapp_number TEXT,
  instance_name TEXT,
  server_url TEXT,
  token TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    w.id,
    w.whatsapp_number,
    w.instance_name,
    w.server_url,
    s.decrypted_secret::text AS token
  FROM public.whatsapp_integracao w
  LEFT JOIN vault.decrypted_secrets s ON w.token_secret_id = s.id
  WHERE w.user_id = p_user_id AND w.ativo = true
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Revoke permissions from PUBLIC, anon, and authenticated
REVOKE EXECUTE ON FUNCTION public.obter_whatsapp_integracao_ativa(UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.obter_whatsapp_integracao_ativa(UUID) FROM anon;
REVOKE EXECUTE ON FUNCTION public.obter_whatsapp_integracao_ativa(UUID) FROM authenticated;

-- 4. Grant execution privilege exclusively to service_role
GRANT EXECUTE ON FUNCTION public.obter_whatsapp_integracao_ativa(UUID) TO service_role;
