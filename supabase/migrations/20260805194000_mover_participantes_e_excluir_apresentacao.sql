-- 1. Cria ou substitui a função com a lógica transacional
CREATE OR REPLACE FUNCTION public.mover_participantes_e_excluir_apresentacao(
  source_id BIGINT,
  target_id BIGINT
) RETURNS INT AS $$
DECLARE
  moved_rows_count INT;
  deleted_rows_count INT;
  source_exists BOOLEAN;
  target_exists BOOLEAN;
  has_cancelled BOOLEAN;
  has_duplicates BOOLEAN;
BEGIN
  -- 1. Valida se os IDs são iguais
  IF source_id = target_id THEN
    RAISE EXCEPTION 'A apresentação de origem e de destino devem ser diferentes.';
  END IF;

  -- 2. Confirma que a apresentação de origem existe
  SELECT EXISTS(SELECT 1 FROM public.apresentacoes WHERE id = source_id) INTO source_exists;
  IF NOT source_exists THEN
    RAISE EXCEPTION 'Apresentação de origem não encontrada.';
  END IF;

  -- 3. Confirma que a apresentação de destino existe
  SELECT EXISTS(SELECT 1 FROM public.apresentacoes WHERE id = target_id) INTO target_exists;
  IF NOT target_exists THEN
    RAISE EXCEPTION 'Apresentação de destino não encontrada.';
  END IF;

  -- 4. Bloqueia se não houver participações na origem
  IF NOT EXISTS(SELECT 1 FROM public.participacoes WHERE apresentacao_id = source_id) THEN
    RAISE EXCEPTION 'A apresentação de origem não possui participantes para mover.';
  END IF;

  -- 5. Bloqueia se houver qualquer participação cancelada na origem
  SELECT EXISTS(
    SELECT 1 FROM public.participacoes 
    WHERE apresentacao_id = source_id AND status = 'cancelado'
  ) INTO has_cancelled;
  IF has_cancelled THEN
    RAISE EXCEPTION 'Existem participantes cancelados na apresentação de origem. Reative-os primeiro para prosseguir.';
  END IF;

  -- 6. Bloqueia se qualquer cliente da origem já estiver vinculado ao destino (ativo ou cancelado)
  SELECT EXISTS(
    SELECT 1 FROM public.participacoes p_dest
    WHERE p_dest.apresentacao_id = target_id
      AND p_dest.cliente_id IN (
        SELECT p_orig.cliente_id 
        FROM public.participacoes p_orig 
        WHERE p_orig.apresentacao_id = source_id
      )
  ) INTO has_duplicates;
  IF has_duplicates THEN
    RAISE EXCEPTION 'Algum dos participantes já está vinculado à apresentação de destino.';
  END IF;

  -- 7. Move as participações com status ativo
  UPDATE public.participacoes
  SET apresentacao_id = target_id,
      observacao = NULL,
      link_enviado = FALSE
  WHERE apresentacao_id = source_id AND status = 'ativo';

  GET DIAGNOSTICS moved_rows_count = ROW_COUNT;

  -- 8. Exclui a origem somente se a movimentação tiver ocorrido
  IF moved_rows_count > 0 THEN
    DELETE FROM public.apresentacoes
    WHERE id = source_id;
    
    GET DIAGNOSTICS deleted_rows_count = ROW_COUNT;
    
    IF deleted_rows_count <> 1 THEN
      RAISE EXCEPTION 'A apresentação de origem não pôde ser excluída.';
    END IF;
  ELSE
    RAISE EXCEPTION 'Nenhuma participação ativa foi movida. A exclusão da origem foi cancelada.';
  END IF;

  RETURN moved_rows_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 2. Revoga privilégios de execução públicos e padrões
REVOKE EXECUTE ON FUNCTION public.mover_participantes_e_excluir_apresentacao(BIGINT, BIGINT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.mover_participantes_e_excluir_apresentacao(BIGINT, BIGINT) FROM anon;
REVOKE EXECUTE ON FUNCTION public.mover_participantes_e_excluir_apresentacao(BIGINT, BIGINT) FROM authenticated;

-- 3. Concede acesso estritamente ao service_role para chamadas via Edge Function
GRANT EXECUTE ON FUNCTION public.mover_participantes_e_excluir_apresentacao(BIGINT, BIGINT) TO service_role;
