import { supabase } from './supabaseClient'
import { findClientByPhone, createClient } from './clientService'
import { findParticipation, createParticipation, findActiveOtherParticipations } from './participationService'
import { getActiveIntegration } from './googleIntegrationService'
import { isPresentationPast, isPresentationFuture } from '../utils/dateUtils'

export const scheduleParticipant = async (meetingId, participantData) => {
  // 1. Fetch the presentation to validate
  const { data: dbMeeting, error: meetingError } = await supabase
    .from('apresentacoes')
    .select('id, data, horario, horario_fim')
    .eq('id', meetingId)
    .single()

  if (meetingError || !dbMeeting) {
    throw new Error('Apresentação comercial não encontrada.')
  }

  const meeting = {
    id: dbMeeting.id,
    date: dbMeeting.data,
    time: dbMeeting.horario,
    timeEnd: dbMeeting.horario_fim
  }

  // 2. Validate if the presentation has already passed
  if (isPresentationPast(meeting)) {
    throw new Error('Não é possível alterar uma apresentação que já ocorreu.')
  }

  // 3. Find or create client
  let client = await findClientByPhone(participantData.telefone)
  
  if (!client) {
    client = await createClient({
      nome: participantData.nome,
      telefone: participantData.telefone,
      agencia: participantData.agencia
    })
  }

  // 4. Verify existing participation on the same presentation
  const existingPart = await findParticipation(client.id, meetingId)
  if (existingPart) {
    if (existingPart.status === 'ativo') {
      throw new Error('Este cliente já está cadastrado nesta reunião.')
    } else {
      throw new Error('Este cliente já possui uma participação cancelada nesta reunião.')
    }
  }

  // 5. Verify if the client has any active participation in other future presentations
  const { userId, googleIntegracaoId } = await getActiveIntegration()
  const otherParticipations = await findActiveOtherParticipations(client.id, meetingId, userId, googleIntegracaoId)

  const hasFuture = otherParticipations.some(part => {
    const pres = {
      date: part.apresentacoes.data,
      time: part.apresentacoes.horario,
      timeEnd: part.apresentacoes.horario_fim
    }
    return isPresentationFuture(pres)
  })

  if (hasFuture) {
    throw new Error('Este cliente já está agendado em outra reunião futura.')
  }

  // 6. Create active participation
  const participation = await createParticipation({
    clienteId: client.id,
    apresentacaoId: meetingId,
    observacao: participantData.observacao
  })

  return { client, participation }
}
