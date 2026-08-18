-- Migration: Restrict permissions for public.salvar_whatsapp_integracao RPC
-- Date: 2026-08-18 09:21:00

-- Revoke execute rights from PUBLIC, anon, and authenticated
REVOKE EXECUTE ON FUNCTION public.salvar_whatsapp_integracao(TEXT, TEXT, TEXT, TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.salvar_whatsapp_integracao(TEXT, TEXT, TEXT, TEXT) FROM anon;
REVOKE EXECUTE ON FUNCTION public.salvar_whatsapp_integracao(TEXT, TEXT, TEXT, TEXT) FROM authenticated;

-- Grant execution privilege exclusively to service_role
GRANT EXECUTE ON FUNCTION public.salvar_whatsapp_integracao(TEXT, TEXT, TEXT, TEXT) TO service_role;
