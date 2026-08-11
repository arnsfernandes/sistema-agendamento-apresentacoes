-- Migration: Redefine desconectar_google_integracao for soft-disconnect (Phase 2)
-- Date: 2026-08-09 18:10:00

CREATE OR REPLACE FUNCTION public.desconectar_google_integracao(
  p_user_id UUID
) RETURNS VOID AS $$
BEGIN
  -- Deactivates only the active integration row for the specified user
  -- Preserves database rows and Vault secrets intact
  UPDATE public.google_integracao
  SET ativo = false,
      updated_at = now()
  WHERE user_id = p_user_id AND ativo = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
