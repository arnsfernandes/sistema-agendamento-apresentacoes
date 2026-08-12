import { supabase } from './supabaseClient'

const PARTICIPATION_FIELDS = 'id, cliente_id, apresentacao_id, observacao, status'

const handleDbError = (error, action) => {
  throw new Error(`Falha ao ${action}: ${error.message}`)
}

export const findParticipation = async (clienteId, apresentacaoId) => {
  const { data, error } = await supabase
    .from('participacoes')
    .select(PARTICIPATION_FIELDS)
    .eq('cliente_id', clienteId)
    .eq('apresentacao_id', apresentacaoId)
    .maybeSingle()

  if (error) {
    handleDbError(error, 'buscar participação')
  }

  return data
}

export const createParticipation = async ({ clienteId, apresentacaoId, observacao }) => {
  const { data, error } = await supabase
    .from('participacoes')
    .insert([{
      cliente_id: clienteId,
      apresentacao_id: apresentacaoId,
      observacao,
      status: 'ativo'
    }])
    .select(PARTICIPATION_FIELDS)
    .single()

  if (error) {
    handleDbError(error, 'criar participação')
  }

  return data
}

export const updateParticipationObservation = async (participacaoId, observacao) => {
  const { data, error } = await supabase
    .from('participacoes')
    .update({ observacao })
    .eq('id', participacaoId)
    .select(PARTICIPATION_FIELDS)
    .single()

  if (error) {
    handleDbError(error, 'atualizar observação da participação')
  }

  return data
}

export const updateParticipationStatus = async (participacaoId, status) => {
  if (status !== 'ativo' && status !== 'cancelado') {
    throw new Error('Status inválido. Deve ser "ativo" ou "cancelado".')
  }

  const { data, error } = await supabase
    .from('participacoes')
    .update({ status })
    .eq('id', participacaoId)
    .select(PARTICIPATION_FIELDS)
    .single()

  if (error) {
    handleDbError(error, 'atualizar status da participação')
  }

  return data
}

export const updateParticipationPresentation = async (participacaoId, apresentacaoId) => {
  const { data, error } = await supabase
    .from('participacoes')
    .update({ apresentacao_id: apresentacaoId })
    .eq('id', participacaoId)
    .select(PARTICIPATION_FIELDS)
    .single()

  if (error) {
    handleDbError(error, 'atualizar a apresentação da participação')
  }

  return data
}
