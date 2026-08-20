const TIME_ZONE = 'America/Sao_Paulo'

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
    const { data: newClient, error: createError } = await supabaseAdmin
      .from('clientes')
      .insert([{
        nome: participantData.nome,
        telefone: participantData.telefone,
        agencia: participantData.agencia || '',
        user_id: userId,
        google_integracao_id: googleIntegracaoId
      }])
      .select('id, nome, telefone, agencia')
      .single()

    if (createError) {
      throw new Error('Erro ao cadastrar novo cliente.')
    }
    client = newClient
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

  const hasFuture = (otherParticipations || []).some((part: any) => {
    return isPresentationFuture(part.apresentacoes)
  })

  if (hasFuture) {
    throw new Error('Este cliente já está agendado em outra reunião futura.')
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
