import { supabase } from '../supabaseClient'

export const findParticipation = async (clienteId, apresentacaoId) => {
  const { data, error } = await supabase
    .from('participacoes')
    .select('id, cliente_id, apresentacao_id, observacao, status')
    .eq('cliente_id', clienteId)
    .eq('apresentacao_id', apresentacaoId)
    .maybeSingle()

  if (error) {
    throw new Error(`Falha ao buscar participação: ${error.message}`)
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
    .select('id, cliente_id, apresentacao_id, observacao, status')
    .single()

  if (error) {
    throw new Error(`Falha ao criar participação: ${error.message}`)
  }

  return data
}

export const updateParticipationObservation = async (participacaoId, observacao) => {
  const { data, error } = await supabase
    .from('participacoes')
    .update({ observacao })
    .eq('id', participacaoId)
    .select('id, cliente_id, apresentacao_id, observacao, status')
    .single()

  if (error) {
    throw new Error(`Falha ao atualizar observação da participação: ${error.message}`)
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
    .select('id, cliente_id, apresentacao_id, observacao, status')
    .single()

  if (error) {
    throw new Error(`Falha ao atualizar status da participação: ${error.message}`)
  }

  return data
}

export const updateParticipationPresentation = async (participacaoId, apresentacaoId) => {
  const { data, error } = await supabase
    .from('participacoes')
    .update({ apresentacao_id: apresentacaoId })
    .eq('id', participacaoId)
    .select('id, cliente_id, apresentacao_id, observacao, status')
    .single()

  if (error) {
    throw new Error(`Falha ao atualizar a apresentação da participação: ${error.message}`)
  }

  return data
}
