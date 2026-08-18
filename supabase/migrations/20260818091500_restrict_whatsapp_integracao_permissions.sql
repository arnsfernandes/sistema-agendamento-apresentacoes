-- Migration: Restrict permissions for public.obter_whatsapp_integracao_ativa RPC
-- Date: 2026-08-18 09:15:00

-- Revoke default and explicit execute rights from PUBLIC, anon, and authenticated
REVOKE EXECUTE ON FUNCTION public.obter_whatsapp_integracao_ativa() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.obter_whatsapp_integracao_ativa() FROM anon;
REVOKE EXECUTE ON FUNCTION public.obter_whatsapp_integracao_ativa() FROM authenticated;

-- Grant execution privilege exclusively to service_role
GRANT EXECUTE ON FUNCTION public.obter_whatsapp_integracao_ativa() TO service_role;
