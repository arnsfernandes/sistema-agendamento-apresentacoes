-- Migration: Create public.salvar_whatsapp_integracao RPC
-- Date: 2026-08-18 09:10:00

CREATE OR REPLACE FUNCTION public.salvar_whatsapp_integracao(
  p_whatsapp_number TEXT,
  p_instance_name TEXT,
  p_server_url TEXT,
  p_token TEXT
) RETURNS VOID AS $$
DECLARE
  v_user_id UUID;
  v_integration_id BIGINT;
  v_secret_id UUID;
BEGIN
  -- 1. Get current authenticated user ID
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuario nao autenticado.';
  END IF;

  -- 2. Deactivate any currently active WhatsApp integrations for this user
  UPDATE public.whatsapp_integracao
  SET ativo = false,
      updated_at = now()
  WHERE user_id = v_user_id AND ativo = true;

  -- 3. Insert new integration details (initially with NULL token_secret_id to get the generated id)
  INSERT INTO public.whatsapp_integracao (
    user_id,
    whatsapp_number,
    instance_name,
    server_url,
    ativo,
    created_at,
    updated_at
  ) VALUES (
    v_user_id,
    p_whatsapp_number,
    p_instance_name,
    p_server_url,
    true,
    now(),
    now()
  ) RETURNING id INTO v_integration_id;

  -- 4. Create the instance token secret in Supabase Vault
  SELECT vault.create_secret(p_token, 'whatsapp_instance_token_' || v_integration_id::text) INTO v_secret_id;

  -- 5. Update the integration row with the secret ID reference
  UPDATE public.whatsapp_integracao
  SET token_secret_id = v_secret_id
  WHERE id = v_integration_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
