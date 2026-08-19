-- Migration: Create reservar_apresentacoes_para_lembrete RPC
-- Date: 2026-08-19 14:58:00

CREATE OR REPLACE FUNCTION public.reservar_apresentacoes_para_lembrete(
  p_limite INT DEFAULT 10
)
RETURNS TABLE (
  id BIGINT,
  user_id UUID,
  google_integracao_id BIGINT,
  data DATE,
  horario TIME,
  meet_link TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH selecionados AS (
    SELECT a.id
    FROM public.apresentacoes a
    WHERE a.lembrete_enviado_em IS NULL
      AND a.sync_status <> 'google_deleted'
      AND (
        a.lembrete_reservado_em IS NULL
        OR a.lembrete_reservado_em < now() - interval '5 minutes'
      )
    ORDER BY a.data ASC, a.horario ASC
    LIMIT p_limite
    FOR UPDATE SKIP LOCKED
  )
  UPDATE public.apresentacoes a
  SET lembrete_reservado_em = now()
  FROM selecionados s
  WHERE a.id = s.id
  RETURNING 
    a.id,
    a.user_id,
    a.google_integracao_id,
    a.data,
    a.horario,
    a.meet_link;
END;
$$;
