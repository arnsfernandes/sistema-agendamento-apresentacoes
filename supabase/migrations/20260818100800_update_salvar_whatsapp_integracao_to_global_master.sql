-- Migration: Update public.salvar_whatsapp_integracao to support single global master model
-- Date: 2026-08-18 10:08:00

CREATE OR REPLACE FUNCTION public.salvar_whatsapp_integracao(
  p_whatsapp_number TEXT,
  p_instance_name TEXT,
  p_server_url TEXT,
  p_token TEXT
) RETURNS VOID AS $$
DECLARE
  v_integration_id BIGINT;
  v_secret_id UUID;
BEGIN
  -- 1. Deactivate any currently active WhatsApp integrations globally
  UPDATE public.whatsapp_integracao
  SET ativo = false,
      updated_at = now()
  WHERE ativo = true;

  -- 2. Insert new global integration details
  INSERT INTO public.whatsapp_integracao (
    whatsapp_number,
    instance_name,
    server_url,
    ativo,
    created_at,
    updated_at
  ) VALUES (
    p_whatsapp_number,
    p_instance_name,
    p_server_url,
    true,
    now(),
    now()
  ) RETURNING id INTO v_integration_id;

  -- 3. Create the instance token secret in Supabase Vault
  SELECT vault.create_secret(p_token, 'whatsapp_instance_token_' || v_integration_id::text) INTO v_secret_id;

  -- 4. Update the integration row with the secret ID reference
  UPDATE public.whatsapp_integracao
  SET token_secret_id = v_secret_id
  WHERE id = v_integration_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Revoke execute rights from PUBLIC, anon, and authenticated
REVOKE EXECUTE ON FUNCTION public.salvar_whatsapp_integracao(TEXT, TEXT, TEXT, TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.salvar_whatsapp_integracao(TEXT, TEXT, TEXT, TEXT) FROM anon;
REVOKE EXECUTE ON FUNCTION public.salvar_whatsapp_integracao(TEXT, TEXT, TEXT, TEXT) FROM authenticated;

-- 6. Grant execution privilege exclusively to service_role
GRANT EXECUTE ON FUNCTION public.salvar_whatsapp_integracao(TEXT, TEXT, TEXT, TEXT) TO service_role;
