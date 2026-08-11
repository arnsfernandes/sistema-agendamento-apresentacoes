-- Migration: Redefine salvar_agenda_google for multi-user recycling (Phase 2)
-- Date: 2026-08-09 17:54:00

CREATE OR REPLACE FUNCTION public.salvar_agenda_google(
  p_user_id UUID,
  p_calendar_id TEXT,
  p_calendar_name TEXT
) RETURNS VOID AS $$
DECLARE
  v_active_id BIGINT;
  v_active_secret_id UUID;
  v_active_sub TEXT;
  v_active_email TEXT;
  v_active_is_temp BOOLEAN;
  v_existing_id BIGINT;
  v_old_secret_id UUID;
  v_new_integration_id BIGINT;
  v_new_secret_id UUID;
  v_decrypted_token TEXT;
  r_abandoned RECORD;
BEGIN
  -- 1. Find the current active integration of this user (either temporary or consolidated)
  SELECT id, refresh_token_secret_id, google_account_sub, google_email, (calendar_id IS NULL)
  INTO v_active_id, v_active_secret_id, v_active_sub, v_active_email, v_active_is_temp
  FROM public.google_integracao
  WHERE user_id = p_user_id AND ativo = true
  LIMIT 1;

  IF v_active_id IS NULL THEN
    RAISE EXCEPTION 'Nenhuma conexao ativa do Google encontrada para este usuario.';
  END IF;

  -- 2. Check if a consolidated context already exists for this user + account + target calendar
  SELECT id, refresh_token_secret_id INTO v_existing_id, v_old_secret_id
  FROM public.google_integracao
  WHERE user_id = p_user_id 
    AND google_account_sub = v_active_sub 
    AND calendar_id = p_calendar_id
  LIMIT 1;

  -- Deactivate all integrations for this user first
  UPDATE public.google_integracao
  SET ativo = false
  WHERE user_id = p_user_id;

  IF v_existing_id IS NOT NULL THEN
    -- A. Recycle existing context row:
    -- Get the decrypted token value from the active row secret
    SELECT decrypted_secret INTO v_decrypted_token
    FROM vault.decrypted_secrets
    WHERE id = v_active_secret_id;

    -- Update the existing row's Vault secret using vault.update_secret
    IF v_old_secret_id IS NOT NULL THEN
      PERFORM vault.update_secret(v_old_secret_id, v_decrypted_token);
    ELSE
      SELECT vault.create_secret(v_decrypted_token, 'google_refresh_token_' || v_existing_id::text) INTO v_old_secret_id;
      UPDATE public.google_integracao
      SET refresh_token_secret_id = v_old_secret_id
      WHERE id = v_existing_id;
    END IF;

    -- Re-activate the existing row
    UPDATE public.google_integracao
    SET google_email = v_active_email,
        ativo = true,
        calendar_name = p_calendar_name,
        updated_at = now()
    WHERE id = v_existing_id;

    -- Delete the source temporary row if it was a temporary connection
    IF v_active_is_temp THEN
      DELETE FROM public.google_integracao WHERE id = v_active_id;
      
      -- Remove the temporary Vault secret to prevent orphans
      IF v_active_secret_id IS NOT NULL THEN
        DELETE FROM vault.secrets WHERE id = v_active_secret_id;
      END IF;
    END IF;

  ELSIF v_active_is_temp THEN
    -- B. Consolidate temporary active integration row directly
    UPDATE public.google_integracao
    SET calendar_id = p_calendar_id,
        calendar_name = p_calendar_name,
        ativo = true,
        updated_at = now()
    WHERE id = v_active_id;

  ELSE
    -- C. Create a NEW consolidated row from the active consolidated row (switching calendars)
    v_new_integration_id := nextval('public.google_integracao_id_seq');

    -- Create new Vault secret using the active token value
    SELECT decrypted_secret INTO v_decrypted_token
    FROM vault.decrypted_secrets
    WHERE id = v_active_secret_id;

    SELECT vault.create_secret(v_decrypted_token, 'google_refresh_token_' || v_new_integration_id::text) INTO v_new_secret_id;

    INSERT INTO public.google_integracao (id, user_id, google_email, refresh_token_secret_id, google_account_sub, calendar_id, calendar_name, ativo, updated_at)
    VALUES (v_new_integration_id, p_user_id, v_active_email, v_new_secret_id, v_active_sub, p_calendar_id, p_calendar_name, true, now());
  END IF;

  -- 3. Cleanup: Find and delete all abandoned temporary integrations (calendar_id IS NULL) and their Vault secrets
  FOR r_abandoned IN (
    SELECT id, refresh_token_secret_id 
    FROM public.google_integracao 
    WHERE user_id = p_user_id AND calendar_id IS NULL
  ) LOOP
    DELETE FROM public.google_integracao WHERE id = r_abandoned.id;
    IF r_abandoned.refresh_token_secret_id IS NOT NULL THEN
      DELETE FROM vault.secrets WHERE id = r_abandoned.refresh_token_secret_id;
    END IF;
  END LOOP;

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
