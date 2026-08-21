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

export const findActiveOtherParticipations = async (clienteId, currentPresentationId, userId, googleIntegracaoId) => {
  const { data, error } = await supabase
    .from('participacoes')
    .select(`
      id,
      status,
      apresentacoes!inner (
        id,
        data,
        horario,
        horario_fim,
        user_id,
        google_integracao_id
      )
    `)
    .eq('cliente_id', clienteId)
    .eq('status', 'ativo')
    .neq('apresentacao_id', currentPresentationId)
    .eq('apresentacoes.user_id', userId)
    .eq('apresentacoes.google_integracao_id', googleIntegracaoId)

  if (error) {
    handleDbError(error, 'buscar outras participações ativas')
  }

  return data || []
}

export const rescheduleParticipantApi = async (participantId, fromMeetingId, toMeetingId) => {
  const { data, error } = await supabase.functions.invoke('reschedule-participant', {
    body: { participantId, fromMeetingId, toMeetingId }
  })

  if (error) {
    throw new Error(error.message || 'Erro ao comunicar com o servidor.')
  }

  if (data && data.error) {
    const err = new Error(data.error)
    err.isValidationError = true
    throw err
  }

  return data.participation
}

export const cancelParticipantApi = async (participationId) => {
  const { data, error } = await supabase.functions.invoke('cancel-participant', {
    body: { participationId }
  })

  if (error) {
    throw new Error(error.message || 'Erro ao comunicar com o servidor.')
  }

  if (data && data.error) {
    throw new Error(data.error)
  }

  return data.participation
}

export const reactivateParticipantApi = async (participationId) => {
  const { data, error } = await supabase.functions.invoke('reactivate-participant', {
    body: { participationId }
  })

  if (error) {
    throw new Error(error.message || 'Erro ao comunicar com o servidor.')
  }

  if (data && data.error) {
    throw new Error(data.error)
  }

  return data.participation
}
