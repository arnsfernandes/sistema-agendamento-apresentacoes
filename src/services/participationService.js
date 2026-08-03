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
