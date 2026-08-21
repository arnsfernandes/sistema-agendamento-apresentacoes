const TIME_ZONE = 'America/Sao_Paulo'

export class BusinessRuleError extends Error {
  code: string
  details?: any

  constructor(message: string, code: string, details?: any) {
    super(message)
    this.name = 'BusinessRuleError'
    this.code = code
    this.details = details
  }
}

export const getSaoPauloDateTime = (date = new Date()) => {
  const formatter = new Intl.DateTimeFormat('sv-SE', {
    timeZone: TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23'
  })
  return formatter.format(date).replace(' ', 'T')
}

export const isPresentationPast = (meeting: any) => {
  if (!meeting) return false
  const timeToCheck = meeting.horario_fim || meeting.horario
  if (!timeToCheck) return false

  const parts = timeToCheck.split(':')
  const normalizedTime = parts.length === 2 ? `${timeToCheck}:00` : timeToCheck

  const meetingDateTimeStr = `${meeting.data}T${normalizedTime}`
  const nowDateTimeStr = getSaoPauloDateTime()
  return meetingDateTimeStr < nowDateTimeStr
}

export const isPresentationFuture = (meeting: any) => {
  if (!meeting) return false
  const timeToCheck = meeting.horario || '00:00'
  const parts = timeToCheck.split(':')
  const normalizedTime = parts.length === 2 ? `${timeToCheck}:00` : timeToCheck

  const meetingDateTimeStr = `${meeting.data}T${normalizedTime}`
  const nowDateTimeStr = getSaoPauloDateTime()
  return meetingDateTimeStr > nowDateTimeStr
}

export async function scheduleParticipant(
  supabaseAdmin: any,
  userId: string,
  googleIntegracaoId: number,
  meetingId: number,
  participantData: { nome: string; telefone: string; agencia?: string; observacao?: string }
) {
  // 1. Fetch presentation to validate
  const { data: meeting, error: meetingError } = await supabaseAdmin
    .from('apresentacoes')
    .select('id, data, horario, horario_fim, user_id, google_integracao_id')
    .eq('id', meetingId)
    .eq('user_id', userId)
    .eq('google_integracao_id', googleIntegracaoId)
    .maybeSingle()

  if (meetingError || !meeting) {
    throw new Error('Apresentação comercial não encontrada.')
  }

  // Validate if the presentation has already passed
  if (isPresentationPast(meeting)) {
    throw new Error('Não é possível alterar uma apresentação que já ocorreu.')
  }

  // 2. Find or create client
  let { data: client, error: clientError } = await supabaseAdmin
    .from('clientes')
    .select('id, nome, telefone, agencia')
    .eq('telefone', participantData.telefone)
    .eq('user_id', userId)
    .eq('google_integracao_id', googleIntegracaoId)
    .maybeSingle()

  if (clientError) {
    throw new Error('Erro ao buscar cliente no banco de dados.')
  }

  if (!client) {
    client = await createClient(supabaseAdmin, userId, googleIntegracaoId, participantData)
  }

  // 3. Verify existing participation on the same presentation
  const { data: existingPart, error: existingPartError } = await supabaseAdmin
    .from('participacoes')
    .select('id, status')
    .eq('cliente_id', client.id)
    .eq('apresentacao_id', meetingId)
    .maybeSingle()

  if (existingPartError) {
    throw new Error('Erro ao verificar participação existente.')
  }

  if (existingPart) {
    if (existingPart.status === 'ativo') {
      throw new Error('Este cliente já está cadastrado nesta reunião.')
    } else {
      throw new Error('Este cliente já possui uma participação cancelada nesta reunião.')
    }
  }

  // 4. Verify if the client has any active participation in other future presentations
  const { data: otherParticipations, error: otherPartError } = await supabaseAdmin
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
    .eq('cliente_id', client.id)
    .eq('status', 'ativo')
    .neq('apresentacao_id', meetingId)
    .eq('apresentacoes.user_id', userId)
    .eq('apresentacoes.google_integracao_id', googleIntegracaoId)

  if (otherPartError) {
    throw new Error('Erro ao verificar outras participações do cliente.')
  }

  const conflictingPart = (otherParticipations || []).find((part: any) => {
    return isPresentationFuture(part.apresentacoes)
  })

  if (conflictingPart) {
    const meet = conflictingPart.apresentacoes
    throw new BusinessRuleError(
      'Este cliente já está agendado em outra reunião futura.',
      'CLIENT_ALREADY_SCHEDULED_FUTURE',
      {
        presentation_id: meet.id,
        titulo: meet.titulo,
        data: meet.data,
        horario_inicio: meet.horario,
        horario_fim: meet.horario_fim
      }
    )
  }

  // 5. Create active participation
  const { data: participation, error: partCreateError } = await supabaseAdmin
    .from('participacoes')
    .insert([{
      cliente_id: client.id,
      apresentacao_id: meetingId,
      observacao: participantData.observacao || '',
      status: 'ativo'
    }])
    .select('id, cliente_id, apresentacao_id, observacao, status')
    .single()

  if (partCreateError) {
    throw new Error('Erro ao criar a participação.')
  }

  return { client, participation }
}

export async function rescheduleParticipant(
  supabaseAdmin: any,
  userId: string,
  googleIntegracaoId: number,
  participantId: number,
  fromMeetingId: number,
  toMeetingId: number
) {
  // 1. Fetch source meeting
  const { data: fromMeeting, error: fromError } = await supabaseAdmin
    .from('apresentacoes')
    .select('id, data, horario, horario_fim, user_id, google_integracao_id')
    .eq('id', fromMeetingId)
    .eq('user_id', userId)
    .eq('google_integracao_id', googleIntegracaoId)
    .maybeSingle()

  if (fromError || !fromMeeting) {
    throw new Error('Apresentação de origem não encontrada ou sem acesso.')
  }

  // 2. Fetch destination meeting
  const { data: toMeeting, error: toError } = await supabaseAdmin
    .from('apresentacoes')
    .select('id, data, horario, horario_fim, user_id, google_integracao_id')
    .eq('id', toMeetingId)
    .eq('user_id', userId)
    .eq('google_integracao_id', googleIntegracaoId)
    .maybeSingle()

  if (toError || !toMeeting) {
    throw new Error('Apresentação de destino não encontrada ou sem acesso.')
  }

  // 3. Verify temporal rules (past presentations cannot be changed/moved)
  if (isPresentationPast(fromMeeting) || isPresentationPast(toMeeting)) {
    throw new BusinessRuleError(
      'Não é possível alterar uma apresentação que já ocorreu.',
      'PRESENTATION_ALREADY_OCCURRED'
    )
  }

  // 4. Fetch the existing participation to move
  const { data: participation, error: partError } = await supabaseAdmin
    .from('participacoes')
    .select('id, cliente_id, apresentacao_id, observacao, status')
    .eq('id', participantId)
    .eq('apresentacao_id', fromMeetingId)
    .maybeSingle()

  if (partError || !participation) {
    throw new Error('Participação não encontrada ou não pertence à apresentação de origem informada.')
  }

  // 5. Check if client already has participation in destination
  const { data: destinationPart, error: destError } = await supabaseAdmin
    .from('participacoes')
    .select('id, status')
    .eq('cliente_id', participation.cliente_id)
    .eq('apresentacao_id', toMeetingId)
    .maybeSingle()

  if (destError) {
    throw new Error('Erro ao verificar participação no destino.')
  }

  if (destinationPart) {
    if (destinationPart.status === 'ativo') {
      throw new BusinessRuleError(
        'Este cliente já está ativo na reunião de destino.',
        'CLIENT_ALREADY_ACTIVE_IN_DESTINATION',
        { participation_id: destinationPart.id }
      )
    } else {
      throw new BusinessRuleError(
        'Já existe uma participação cancelada no destino.',
        'CLIENT_CANCELLED_IN_DESTINATION',
        { participation_id: destinationPart.id }
      )
    }
  }

  // 6. Update the existing participation's presentation ID
  const { data: updatedParticipation, error: updateError } = await supabaseAdmin
    .from('participacoes')
    .update({ apresentacao_id: toMeetingId })
    .eq('id', participantId)
    .select('id, cliente_id, apresentacao_id, observacao, status')
    .single()

  if (updateError || !updatedParticipation) {
    throw new Error(`Falha ao remarcar participante: ${updateError?.message}`)
  }

  return {
    success: true,
    participation: updatedParticipation
  }
}

export async function cancelParticipant(
  supabaseAdmin: any,
  userId: string,
  googleIntegracaoId: number,
  participationId: number
) {
  // 1. Fetch participation details including presentation
  const { data: participation, error: partError } = await supabaseAdmin
    .from('participacoes')
    .select(`
      id,
      cliente_id,
      apresentacao_id,
      observacao,
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
    .eq('id', participationId)
    .eq('apresentacoes.user_id', userId)
    .eq('apresentacoes.google_integracao_id', googleIntegracaoId)
    .maybeSingle()

  if (partError || !participation) {
    throw new Error('Participação não encontrada.')
  }

  // 2. Validate temporal rules (past presentation cannot be altered)
  if (isPresentationPast(participation.apresentacoes)) {
    throw new Error('Não é possível alterar uma apresentação que já ocorreu.')
  }

  // 3. Update status to cancelado
  const { data: updatedParticipation, error: updateError } = await supabaseAdmin
    .from('participacoes')
    .update({ status: 'cancelado' })
    .eq('id', participationId)
    .select('id, cliente_id, apresentacao_id, observacao, status')
    .single()

  if (updateError || !updatedParticipation) {
    throw new Error(`Falha ao cancelar participação: ${updateError?.message}`)
  }

  return {
    success: true,
    participation: updatedParticipation
  }
}

export async function reactivateParticipant(
  supabaseAdmin: any,
  userId: string,
  googleIntegracaoId: number,
  participationId: number
) {
  // 1. Fetch participation details including presentation
  const { data: participation, error: partError } = await supabaseAdmin
    .from('participacoes')
    .select(`
      id,
      cliente_id,
      apresentacao_id,
      observacao,
      status,
      apresentacoes!inner (
        id,
        data,
        horario,
        horario_fim,
        user_id,
        google_integracao_id
      ),
      clientes!inner (
        id,
        nome,
        telefone
      )
    `)
    .eq('id', participationId)
    .eq('apresentacoes.user_id', userId)
    .eq('apresentacoes.google_integracao_id', googleIntegracaoId)
    .maybeSingle()

  if (partError || !participation) {
    throw new Error('Participação não encontrada.')
  }

  // 2. Validate temporal rules (past presentation cannot be altered)
  if (isPresentationPast(participation.apresentacoes)) {
    throw new Error('Não é possível alterar uma apresentação que já ocorreu.')
  }

  // 3. Check duplicate client active in the same presentation
  const { data: duplicateActive, error: dupError } = await supabaseAdmin
    .from('participacoes')
    .select('id')
    .eq('apresentacao_id', participation.apresentacao_id)
    .eq('cliente_id', participation.cliente_id)
    .eq('status', 'ativo')
    .neq('id', participationId)
    .maybeSingle()

  if (dupError) {
    throw new Error('Erro ao verificar duplicidade.')
  }

  if (duplicateActive) {
    throw new Error('Este cliente já está cadastrado nesta reunião.')
  }

  // 4. Verify if the client has any active participation in other future presentations of the same integration
  const { data: otherParticipations, error: otherPartError } = await supabaseAdmin
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
    .eq('cliente_id', participation.cliente_id)
    .eq('status', 'ativo')
    .neq('apresentacao_id', participation.apresentacao_id)
    .eq('apresentacoes.user_id', userId)
    .eq('apresentacoes.google_integracao_id', googleIntegracaoId)

  if (otherPartError) {
    throw new Error('Erro ao verificar outras participações do cliente.')
  }

  const conflictingPart = (otherParticipations || []).find((part: any) => {
    return isPresentationFuture(part.apresentacoes)
  })

  if (conflictingPart) {
    const meet = conflictingPart.apresentacoes
    throw new BusinessRuleError(
      'Este cliente já está agendado em outra reunião futura.',
      'CLIENT_ALREADY_SCHEDULED_FUTURE',
      {
        presentation_id: meet.id,
        titulo: meet.titulo,
        data: meet.data,
        horario_inicio: meet.horario,
        horario_fim: meet.horario_fim
      }
    )
  }

  // 5. Update status to ativo
  const { data: updatedParticipation, error: updateError } = await supabaseAdmin
    .from('participacoes')
    .update({ status: 'ativo' })
    .eq('id', participationId)
    .select('id, cliente_id, apresentacao_id, observacao, status')
    .single()

  if (updateError || !updatedParticipation) {
    throw new Error(`Falha ao reativar participação: ${updateError?.message}`)
  }

  return {
    success: true,
    participation: updatedParticipation
  }
}

export async function createClient(
  supabaseAdmin: any,
  userId: string,
  googleIntegracaoId: number,
  clientData: { nome: string; telefone: string; agencia?: string }
) {
  const nome = (clientData.nome || '').trim()
  if (!nome) {
    throw new BusinessRuleError('Nome é obrigatório.', 'CLIENT_NAME_REQUIRED')
  }

  const cleanTel = (clientData.telefone || '').replace(/\D/g, '')
  if (!cleanTel) {
    throw new BusinessRuleError('Telefone é obrigatório.', 'CLIENT_PHONE_REQUIRED')
  }

  if (cleanTel.length !== 10 && cleanTel.length !== 11) {
    throw new BusinessRuleError('Telefone deve conter 10 ou 11 dígitos.', 'CLIENT_PHONE_INVALID_LENGTH')
  }

  // Verify duplicate telephone in same integration
  const { data: existing, error: findError } = await supabaseAdmin
    .from('clientes')
    .select('id')
    .eq('telefone', cleanTel)
    .eq('user_id', userId)
    .eq('google_integracao_id', googleIntegracaoId)
    .maybeSingle()

  if (findError) {
    throw new Error(`Erro ao verificar duplicidade de cliente: ${findError.message}`)
  }

  if (existing) {
    throw new BusinessRuleError('Já existe um cliente cadastrado com este telefone.', 'CLIENT_DUPLICATE_PHONE')
  }

  const { data: newClient, error: createError } = await supabaseAdmin
    .from('clientes')
    .insert([{
      nome,
      telefone: cleanTel,
      agencia: clientData.agencia || '',
      user_id: userId,
      google_integracao_id: googleIntegracaoId
    }])
    .select('id, nome, telefone, agencia')
    .single()

  if (createError) {
    throw new Error(`Erro ao cadastrar o cliente: ${createError.message}`)
  }

  return newClient
}
