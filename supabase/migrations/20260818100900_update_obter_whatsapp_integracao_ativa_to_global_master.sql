-- Migration: Update public.obter_whatsapp_integracao_ativa to support single global master model
-- Date: 2026-08-18 10:09:00

-- 1. Drop old signature function to prevent overloading conflicts
DROP FUNCTION IF EXISTS public.obter_whatsapp_integracao_ativa(UUID);

-- 2. Create the updated function with no input parameters
CREATE OR REPLACE FUNCTION public.obter_whatsapp_integracao_ativa()
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
  WHERE w.ativo = true
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Revoke permissions from PUBLIC, anon, and authenticated
REVOKE EXECUTE ON FUNCTION public.obter_whatsapp_integracao_ativa() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.obter_whatsapp_integracao_ativa() FROM anon;
REVOKE EXECUTE ON FUNCTION public.obter_whatsapp_integracao_ativa() FROM authenticated;

-- 4. Grant execution privilege exclusively to service_role
GRANT EXECUTE ON FUNCTION public.obter_whatsapp_integracao_ativa() TO service_role;
