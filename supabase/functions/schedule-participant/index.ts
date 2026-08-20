import { createClient } from 'npm:@supabase/supabase-js@2'

const TIME_ZONE = 'America/Sao_Paulo'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const jsonResponse = (body: Record<string, any>, status = 200) => {
  return Response.json(body, {
    status,
    headers: corsHeaders,
  })
}

const getSaoPauloDateTime = (date = new Date()) => {
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

const isPresentationPast = (meeting: any) => {
  if (!meeting) return false
  const timeToCheck = meeting.horario_fim || meeting.horario
  if (!timeToCheck) return false

  const parts = timeToCheck.split(':')
  const normalizedTime = parts.length === 2 ? `${timeToCheck}:00` : timeToCheck

  const meetingDateTimeStr = `${meeting.data}T${normalizedTime}`
  const nowDateTimeStr = getSaoPauloDateTime()
  return meetingDateTimeStr < nowDateTimeStr
}

const isPresentationFuture = (meeting: any) => {
  if (!meeting) return false
  const timeToCheck = meeting.horario || '00:00'
  const parts = timeToCheck.split(':')
  const normalizedTime = parts.length === 2 ? `${timeToCheck}:00` : timeToCheck

  const meetingDateTimeStr = `${meeting.data}T${normalizedTime}`
  const nowDateTimeStr = getSaoPauloDateTime()
  return meetingDateTimeStr > nowDateTimeStr
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Método não permitido.' }, 405)
  }

  try {
    const authorization = req.headers.get('Authorization')
    if (!authorization?.startsWith('Bearer ')) {
      return jsonResponse({ error: 'Usuário não autenticado.' }, 401)
    }

    const accessToken = authorization.replace('Bearer ', '')

    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
      throw new Error('Configuração incompleta do servidor.')
    }

    // 1. Authenticate user from JWT
    const supabaseUser = createClient(supabaseUrl, anonKey)
    const { data: { user }, error: userError } = await supabaseUser.auth.getUser(accessToken)

    if (userError || !user) {
      return jsonResponse({ error: 'Sessão inválida ou expirada.' }, 401)
    }

    const userId = user.id

    // Parse request body
    const { meetingId, participantData } = await req.json()

    if (!meetingId || !participantData || !participantData.telefone || !participantData.nome) {
      return jsonResponse({ error: 'Dados de agendamento incompletos.' }, 400)
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey)

    // 2. Find active google integration for the authenticated user
    const { data: integration, error: integrationError } = await supabaseAdmin
      .from('google_integracao')
      .select('id')
      .eq('user_id', userId)
      .eq('ativo', true)
      .maybeSingle()

    if (integrationError || !integration) {
      return jsonResponse({ error: 'Nenhuma conta Google Agenda conectada e ativa.' }, 400)
    }

    const googleIntegracaoId = integration.id

    // 3. Fetch presentation to validate
    const { data: meeting, error: meetingError } = await supabaseAdmin
      .from('apresentacoes')
      .select('id, data, horario, horario_fim, user_id, google_integracao_id')
      .eq('id', meetingId)
      .eq('user_id', userId)
      .eq('google_integracao_id', googleIntegracaoId)
      .maybeSingle()

    if (meetingError || !meeting) {
      return jsonResponse({ error: 'Apresentação comercial não encontrada.' }, 404)
    }

    // Validate if the presentation has already passed
    if (isPresentationPast(meeting)) {
      return jsonResponse({ error: 'Não é possível alterar uma apresentação que já ocorreu.' }, 400)
    }

    // 4. Find or create client
    let { data: client, error: clientError } = await supabaseAdmin
      .from('clientes')
      .select('id, nome, telefone, agencia')
      .eq('telefone', participantData.telefone)
      .eq('user_id', userId)
      .eq('google_integracao_id', googleIntegracaoId)
      .maybeSingle()

    if (clientError) {
      return jsonResponse({ error: 'Erro ao buscar cliente.' }, 500)
    }

    if (!client) {
      const { data: newClient, error: createError } = await supabaseAdmin
        .from('clientes')
        .insert([{
          nome: participantData.nome,
          telefone: participantData.telefone,
          agencia: participantData.agencia,
          user_id: userId,
          google_integracao_id: googleIntegracaoId
        }])
        .select('id, nome, telefone, agencia')
        .single()

      if (createError) {
        return jsonResponse({ error: 'Erro ao cadastrar novo cliente.' }, 500)
      }
      client = newClient
    }

    // 5. Verify existing participation on the same presentation
    const { data: existingPart, error: existingPartError } = await supabaseAdmin
      .from('participacoes')
      .select('id, status')
      .eq('cliente_id', client.id)
      .eq('apresentacao_id', meetingId)
      .maybeSingle()

    if (existingPartError) {
      return jsonResponse({ error: 'Erro ao verificar participação existente.' }, 500)
    }

    if (existingPart) {
      if (existingPart.status === 'ativo') {
        return jsonResponse({ error: 'Este cliente já está cadastrado nesta reunião.' }, 400)
      } else {
        return jsonResponse({ error: 'Este cliente já possui uma participação cancelada nesta reunião.' }, 400)
      }
    }

    // 6. Verify if the client has any active participation in other future presentations
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
      return jsonResponse({ error: 'Erro ao verificar outras participações do cliente.' }, 500)
    }

    const hasFuture = (otherParticipations || []).some((part: any) => {
      return isPresentationFuture(part.apresentacoes)
    })

    if (hasFuture) {
      return jsonResponse({ error: 'Este cliente já está agendado em outra reunião futura.' }, 400)
    }

    // 7. Create active participation
    const { data: participation, error: partCreateError } = await supabaseAdmin
      .from('participacoes')
      .insert([{
        cliente_id: client.id,
        apresentacao_id: meetingId,
        observacao: participantData.observacao,
        status: 'ativo'
      }])
      .select('id, cliente_id, apresentacao_id, observacao, status')
      .single()

    if (partCreateError) {
      return jsonResponse({ error: 'Erro ao criar a participação.' }, 500)
    }

    return jsonResponse({ success: true, client, participation })

  } catch (error: any) {
    console.error('Erro na Edge Function:', error.message || error)
    return jsonResponse({ error: 'Ocorreu um erro interno ao agendar o participante.' }, 500)
  }
})
