-- Migration: Create lembretes_pessoais table and reservation RPC
-- Date: 2026-08-21 14:25:00

CREATE TABLE public.lembretes_pessoais (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mensagem TEXT NOT NULL,
  disparar_em TIMESTAMPTZ NOT NULL,
  enviado_em TIMESTAMPTZ DEFAULT NULL,
  reservado_em TIMESTAMPTZ DEFAULT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.lembretes_pessoais ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Lembretes pessoais isolation policy" ON public.lembretes_pessoais
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Reservation RPC
CREATE OR REPLACE FUNCTION public.reservar_lembretes_pessoais(
  p_limite INT DEFAULT 10
)
RETURNS TABLE (
  id BIGINT,
  user_id UUID,
  mensagem TEXT,
  disparar_em TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH selecionados AS (
    SELECT l.id
    FROM public.lembretes_pessoais l
    WHERE l.enviado_em IS NULL
      AND l.disparar_em <= now()
      AND (
        l.reservado_em IS NULL
        OR l.reservado_em < now() - interval '5 minutes'
      )
    ORDER BY l.disparar_em ASC
    LIMIT p_limite
    FOR UPDATE SKIP LOCKED
  )
  UPDATE public.lembretes_pessoais l
  SET reservado_em = now()
  FROM selecionados s
  WHERE l.id = s.id
  RETURNING 
    l.id,
    l.user_id,
    l.mensagem,
    l.disparar_em;
END;
$$;

-- Grant execution to service_role
GRANT EXECUTE ON FUNCTION public.reservar_lembretes_pessoais(INT) TO service_role;
