import { createClient } from 'npm:@supabase/supabase-js@2'
import { scheduleParticipant, rescheduleParticipant, cancelParticipant, reactivateParticipant, createClient as backendCreateClient, BusinessRuleError } from '../_shared/scheduling.ts'
import { getAgentInstructions } from '../_shared/whatsappAgentInstructions.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-gateway-secret',
}

const jsonResponse = (body: Record<string, any>, status = 200) => {
  return Response.json(body, {
    status,
    headers: corsHeaders,
  })
}

const TIME_ZONE = 'America/Sao_Paulo'

const getSaoPauloTodayDetails = () => {
  const date = new Date()
  const formatter = new Intl.DateTimeFormat('pt-BR', {
    timeZone: TIME_ZONE,
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
  return formatter.format(date) // e.g. "quinta-feira, 20 de agosto de 2026"
}

async function callOpenAI(apiKey: string, payload: Record<string, any>) {
  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify(payload)
  })

  if (!response.ok) {
    const errText = await response.text()
    throw new Error(`OpenAI Responses API Error: ${errText}`)
  }

  return response.json()
}

async function executeTool(
  supabaseAdmin: any,
  userId: string,
  googleIntegracaoId: number,
  name: string,
  args: any,
  contextData: any
) {
  if (name === 'list_presentations') {
    let { start_date, end_date } = args
    if (start_date.includes('T')) start_date = start_date.split('T')[0]
    if (end_date.includes('T')) end_date = end_date.split('T')[0]

    const { data, error } = await supabaseAdmin
      .from('apresentacoes')
      .select('id, titulo, data, horario, horario_fim')
      .eq('user_id', userId)
      .eq('google_integracao_id', googleIntegracaoId)
      .gte('data', start_date)
      .lte('data', end_date)
      .order('data', { ascending: true })
      .order('horario', { ascending: true })

    if (error) throw error
    return data || []
  }

  if (name === 'get_presentation_details') {
    const { presentation_id } = args
    const { data, error } = await supabaseAdmin
      .from('apresentacoes')
      .select('id, titulo, data, horario, horario_fim, meet_link')
      .eq('id', presentation_id)
      .eq('user_id', userId)
      .eq('google_integracao_id', googleIntegracaoId)
      .maybeSingle()

    if (error) throw error
    return data || { error: 'Reunião não encontrada ou não pertence ao usuário.' }
  }

  if (name === 'list_participants') {
    const presentation_id = args.presentation_id
    const status = args.status || 'ativo'
    // Verify presentation belongs to this user
    const { data: pres } = await supabaseAdmin
      .from('apresentacoes')
      .select('id')
      .eq('id', presentation_id)
      .eq('user_id', userId)
      .maybeSingle()

    if (!pres) {
      return { error: 'Reunião não encontrada ou não pertence ao usuário.' }
    }

    const { data, error } = await supabaseAdmin
      .from('participacoes')
      .select('id, status, clientes(nome, telefone)')
      .eq('apresentacao_id', presentation_id)
      .eq('status', status)

    if (error) throw error
    return data || []
  }

  if (name === 'find_client') {
    const { query } = args
    const { data, error } = await supabaseAdmin
      .from('clientes')
      .select('id, nome, telefone, agencia')
      .eq('user_id', userId)
      .eq('google_integracao_id', googleIntegracaoId)
      .or(`nome.ilike.%${query}%,telefone.like.%${query}%`)

    if (error) throw error
    return data || []
  }

  if (name === 'prepare_schedule_participant') {
    const { client_id, presentation_id } = args

    // Verify client exists
    const { data: client } = await supabaseAdmin
      .from('clientes')
      .select('id, nome, telefone')
      .eq('id', client_id)
      .eq('user_id', userId)
      .maybeSingle()

    // Verify presentation exists
    const { data: presentation } = await supabaseAdmin
      .from('apresentacoes')
      .select('id, titulo, data, horario')
      .eq('id', presentation_id)
      .eq('user_id', userId)
      .maybeSingle()

    if (!client || !presentation) {
      return { error: 'Cliente ou reunião não encontrados no banco de dados.' }
    }

    // Save pending action in context
    const pendingAction = {
      type: 'schedule_participant',
      client_id,
      presentation_id,
      timestamp: new Date().toISOString()
    }

    const { error: saveError } = await supabaseAdmin
      .from('whatsapp_agent_context')
      .upsert({
        user_id: userId,
        pending_action: pendingAction,
        previous_response_id: contextData?.previous_response_id || null,
        updated_at: new Date().toISOString()
      })

    if (saveError) throw saveError

    return {
      status: 'pending_confirmation',
      message: `Ação de agendamento de "${client.nome}" na reunião "${presentation.titulo}" salva como pendente. Aguardando confirmação do usuário.`
    }
  }

  if (name === 'confirm_schedule_participant') {
    const pendingAction = contextData?.pending_action

    if (!pendingAction || pendingAction.type !== 'schedule_participant') {
      return { error: 'Não há nenhuma ação de agendamento pendente no momento ou a pendência expirou.' }
    }

    // Retrieve client details
    const { data: client, error: clientErr } = await supabaseAdmin
      .from('clientes')
      .select('nome, telefone, agencia')
      .eq('id', pendingAction.client_id)
      .maybeSingle()

    if (clientErr || !client) {
      return { error: 'Cliente correspondente ao agendamento pendente não foi encontrado.' }
    }

    try {
      // Execute shared scheduling rules module
      const res = await scheduleParticipant(
        supabaseAdmin,
        userId,
        googleIntegracaoId,
        pendingAction.presentation_id,
        {
          nome: client.nome,
          telefone: client.telefone,
          agencia: client.agencia || ''
        }
      )

      // Clear pending action
      await supabaseAdmin
        .from('whatsapp_agent_context')
        .upsert({
          user_id: userId,
          pending_action: null,
          previous_response_id: contextData?.previous_response_id || null,
          updated_at: new Date().toISOString()
        })

      return {
        status: 'success',
        message: 'Agendamento concluído com sucesso no banco de dados.',
        client: res.client,
        participation: res.participation
      }
    } catch (err: any) {
      // Clear pending action even on validation failure to enforce flow
      await supabaseAdmin
        .from('whatsapp_agent_context')
        .upsert({
          user_id: userId,
          pending_action: null,
          previous_response_id: contextData?.previous_response_id || null,
          updated_at: new Date().toISOString()
        })

      if (err.name === 'BusinessRuleError' || err instanceof BusinessRuleError) {
        return {
          status: 'error',
          code: err.code,
          message: `Falha de validação: ${err.message}`,
          details: err.details
        }
      }

      return {
        status: 'error',
        message: `Falha de validação: ${err.message}`
      }
    }
  }

  if (name === 'cancel_schedule_participant') {
    await supabaseAdmin
      .from('whatsapp_agent_context')
      .upsert({
        user_id: userId,
        pending_action: null,
        previous_response_id: contextData?.previous_response_id || null,
        updated_at: new Date().toISOString()
      })

    return {
      status: 'canceled',
      message: 'Ação pendente cancelada e removida com sucesso.'
    }
  }

  if (name === 'prepare_reschedule_participant') {
    const { participant_id, from_presentation_id, to_presentation_id } = args

    // 1. Verify source meeting exists and belongs to user
    const { data: fromMeeting } = await supabaseAdmin
      .from('apresentacoes')
      .select('id, titulo')
      .eq('id', from_presentation_id)
      .eq('user_id', userId)
      .maybeSingle()

    // 2. Verify destination meeting exists and belongs to user
    const { data: toMeeting } = await supabaseAdmin
      .from('apresentacoes')
      .select('id, titulo')
      .eq('id', to_presentation_id)
      .eq('user_id', userId)
      .maybeSingle()

    // 3. Verify participation exists for that presentation
    const { data: participation } = await supabaseAdmin
      .from('participacoes')
      .select('id, cliente_id, clientes(nome)')
      .eq('id', participant_id)
      .eq('apresentacao_id', from_presentation_id)
      .maybeSingle()

    if (!fromMeeting || !toMeeting || !participation) {
      return { error: 'Reunião de origem, reunião de destino ou a participação selecionada não foram encontradas no banco de dados.' }
    }

    const clientName = participation.clientes?.nome || 'Cliente'

    // Save pending reschedule action
    const pendingAction = {
      type: 'reschedule_participant',
      participant_id,
      from_presentation_id,
      to_presentation_id,
      timestamp: new Date().toISOString()
    }

    const { error: saveError } = await supabaseAdmin
      .from('whatsapp_agent_context')
      .upsert({
        user_id: userId,
        pending_action: pendingAction,
        previous_response_id: contextData?.previous_response_id || null,
        updated_at: new Date().toISOString()
      })

    if (saveError) throw saveError

    return {
      status: 'pending_confirmation',
      message: `Ação de remarcar "${clientName}" da reunião "${fromMeeting.titulo}" para a reunião "${toMeeting.titulo}" salva como pendente. Aguardando confirmação do usuário.`
    }
  }

  if (name === 'confirm_reschedule_participant') {
    const pendingAction = contextData?.pending_action

    if (!pendingAction || pendingAction.type !== 'reschedule_participant') {
      return { error: 'Não há nenhuma ação de remarcação pendente no momento ou a pendência expirou.' }
    }

    try {
      // Execute shared rescheduling rules module
      const res = await rescheduleParticipant(
        supabaseAdmin,
        userId,
        googleIntegracaoId,
        pendingAction.participant_id,
        pendingAction.from_presentation_id,
        pendingAction.to_presentation_id
      )

      // Clear pending action on success
      await supabaseAdmin
        .from('whatsapp_agent_context')
        .upsert({
          user_id: userId,
          pending_action: null,
          previous_response_id: contextData?.previous_response_id || null,
          updated_at: new Date().toISOString()
        })

      return {
        status: 'success',
        message: 'Remarcação concluída com sucesso no banco de dados.',
        participation: res.participation
      }
    } catch (err: any) {
      // Clear pending action even on validation failure to enforce flow
      await supabaseAdmin
        .from('whatsapp_agent_context')
        .upsert({
          user_id: userId,
          pending_action: null,
          previous_response_id: contextData?.previous_response_id || null,
          updated_at: new Date().toISOString()
        })

      if (err.name === 'BusinessRuleError' || err instanceof BusinessRuleError) {
        return {
          status: 'error',
          code: err.code,
          message: `Falha de validação: ${err.message}`,
          details: err.details
        }
      }

      return {
        status: 'error',
        message: `Falha de validação: ${err.message}`
      }
    }
  }

  if (name === 'cancel_reschedule_participant') {
    await supabaseAdmin
      .from('whatsapp_agent_context')
      .upsert({
        user_id: userId,
        pending_action: null,
        previous_response_id: contextData?.previous_response_id || null,
        updated_at: new Date().toISOString()
      })

    return {
      status: 'canceled',
      message: 'Ação pendente de remarcação cancelada e removida com sucesso.'
    }
  }

  if (name === 'prepare_cancel_participant') {
    const { participant_id, presentation_id } = args

    const { data: meeting } = await supabaseAdmin
      .from('apresentacoes')
      .select('id, titulo')
      .eq('id', presentation_id)
      .eq('user_id', userId)
      .maybeSingle()

    const { data: participation } = await supabaseAdmin
      .from('participacoes')
      .select('id, cliente_id, status, clientes(nome)')
      .eq('id', participant_id)
      .eq('apresentacao_id', presentation_id)
      .maybeSingle()

    if (!meeting || !participation) {
      return { error: 'Reunião ou participação correspondente não foram encontradas no banco de dados.' }
    }

    if (participation.status === 'cancelado') {
      return { error: 'Esta participação já está cancelada.' }
    }

    const clientName = participation.clientes?.nome || 'Cliente'

    const pendingAction = {
      type: 'cancel_participant',
      participant_id,
      presentation_id,
      timestamp: new Date().toISOString()
    }

    const { error: saveError } = await supabaseAdmin
      .from('whatsapp_agent_context')
      .upsert({
        user_id: userId,
        pending_action: pendingAction,
        previous_response_id: contextData?.previous_response_id || null,
        updated_at: new Date().toISOString()
      })

    if (saveError) throw saveError

    return {
      status: 'pending_confirmation',
      message: `Ação de cancelar a participação de "${clientName}" na reunião "${meeting.titulo}" salva como pendente. Aguardando confirmação do usuário.`
    }
  }

  if (name === 'confirm_cancel_participant') {
    const pendingAction = contextData?.pending_action

    if (!pendingAction || pendingAction.type !== 'cancel_participant') {
      return { error: 'Não há nenhuma ação de cancelamento de participação pendente ou a pendência expirou.' }
    }

    try {
      const res = await cancelParticipant(
        supabaseAdmin,
        userId,
        googleIntegracaoId,
        pendingAction.participant_id
      )

      await supabaseAdmin
        .from('whatsapp_agent_context')
        .upsert({
          user_id: userId,
          pending_action: null,
          previous_response_id: contextData?.previous_response_id || null,
          updated_at: new Date().toISOString()
        })

      return {
        status: 'success',
        message: 'Cancelamento de participação concluído com sucesso.',
        participation: res.participation
      }
    } catch (err: any) {
      await supabaseAdmin
        .from('whatsapp_agent_context')
        .upsert({
          user_id: userId,
          pending_action: null,
          previous_response_id: contextData?.previous_response_id || null,
          updated_at: new Date().toISOString()
        })

      return {
        status: 'error',
        message: `Falha ao cancelar participação: ${err.message}`
      }
    }
  }

  if (name === 'cancel_cancel_participant') {
    await supabaseAdmin
      .from('whatsapp_agent_context')
      .upsert({
        user_id: userId,
        pending_action: null,
        previous_response_id: contextData?.previous_response_id || null,
        updated_at: new Date().toISOString()
      })

    return {
      status: 'canceled',
      message: 'Ação pendente de cancelamento de participação cancelada e removida com sucesso.'
    }
  }

  if (name === 'prepare_reactivate_participant') {
    const { participant_id, presentation_id } = args

    const { data: meeting } = await supabaseAdmin
      .from('apresentacoes')
      .select('id, titulo')
      .eq('id', presentation_id)
      .eq('user_id', userId)
      .maybeSingle()

    const { data: participation } = await supabaseAdmin
      .from('participacoes')
      .select('id, cliente_id, status, clientes(nome)')
      .eq('id', participant_id)
      .eq('apresentacao_id', presentation_id)
      .maybeSingle()

    if (!meeting || !participation) {
      return { error: 'Reunião ou participação correspondente não foram encontradas no banco de dados.' }
    }

    if (participation.status === 'ativo') {
      return { error: 'Esta participação já está ativa.' }
    }

    const clientName = participation.clientes?.nome || 'Cliente'

    const pendingAction = {
      type: 'reactivate_participant',
      participant_id,
      presentation_id,
      timestamp: new Date().toISOString()
    }

    const { error: saveError } = await supabaseAdmin
      .from('whatsapp_agent_context')
      .upsert({
        user_id: userId,
        pending_action: pendingAction,
        previous_response_id: contextData?.previous_response_id || null,
        updated_at: new Date().toISOString()
      })

    if (saveError) throw saveError

    return {
      status: 'pending_confirmation',
      message: `Ação de reativar a participação de "${clientName}" na reunião "${meeting.titulo}" salva como pendente. Aguardando confirmação do usuário.`
    }
  }

  if (name === 'confirm_reactivate_participant') {
    const pendingAction = contextData?.pending_action

    if (!pendingAction || pendingAction.type !== 'reactivate_participant') {
      return { error: 'Não há nenhuma ação de reativação de participação pendente ou a pendência expirou.' }
    }

    try {
      const res = await reactivateParticipant(
        supabaseAdmin,
        userId,
        googleIntegracaoId,
        pendingAction.participant_id
      )

      await supabaseAdmin
        .from('whatsapp_agent_context')
        .upsert({
          user_id: userId,
          pending_action: null,
          previous_response_id: contextData?.previous_response_id || null,
          updated_at: new Date().toISOString()
        })

      return {
        status: 'success',
        message: 'Reativação de participação concluída com sucesso.',
        participation: res.participation
      }
    } catch (err: any) {
      await supabaseAdmin
        .from('whatsapp_agent_context')
        .upsert({
          user_id: userId,
          pending_action: null,
          previous_response_id: contextData?.previous_response_id || null,
          updated_at: new Date().toISOString()
        })

      if (err.name === 'BusinessRuleError' || err instanceof BusinessRuleError) {
        return {
          status: 'error',
          code: err.code,
          message: `Falha ao reativar participação: ${err.message}`,
          details: err.details
        }
      }

      return {
        status: 'error',
        message: `Falha ao reativar participação: ${err.message}`
      }
    }
  }

  if (name === 'cancel_reactivate_participant') {
    await supabaseAdmin
      .from('whatsapp_agent_context')
      .upsert({
        user_id: userId,
        pending_action: null,
        previous_response_id: contextData?.previous_response_id || null,
        updated_at: new Date().toISOString()
      })

    return {
      status: 'canceled',
      message: 'Ação pendente de reativação de participação cancelada e removida com sucesso.'
    }
  }

  if (name === 'prepare_create_client') {
    const { nome, telefone, agencia } = args

    // Save pending client creation action
    const pendingAction = {
      type: 'create_client',
      nome,
      telefone,
      agencia: agencia || '',
      timestamp: new Date().toISOString()
    }

    const { error: saveError } = await supabaseAdmin
      .from('whatsapp_agent_context')
      .upsert({
        user_id: userId,
        pending_action: pendingAction,
        previous_response_id: contextData?.previous_response_id || null,
        updated_at: new Date().toISOString()
      })

    if (saveError) throw saveError

    return {
      status: 'pending_confirmation',
      message: `Ação de cadastrar novo cliente "${nome}" com telefone "${telefone}" salva como pendente. Aguardando confirmação do usuário.`
    }
  }

  if (name === 'confirm_create_client') {
    const pendingAction = contextData?.pending_action

    if (!pendingAction || pendingAction.type !== 'create_client') {
      return { error: 'Não há nenhuma ação de cadastro de cliente pendente ou a pendência expirou.' }
    }

    try {
      const client = await backendCreateClient(
        supabaseAdmin,
        userId,
        googleIntegracaoId,
        {
          nome: pendingAction.nome,
          telefone: pendingAction.telefone,
          agencia: pendingAction.agencia
        }
      )

      // Clear pending action on success
      await supabaseAdmin
        .from('whatsapp_agent_context')
        .upsert({
          user_id: userId,
          pending_action: null,
          previous_response_id: contextData?.previous_response_id || null,
          updated_at: new Date().toISOString()
        })

      return {
        status: 'success',
        message: 'Cliente cadastrado com sucesso.',
        client
      }
    } catch (err: any) {
      await supabaseAdmin
        .from('whatsapp_agent_context')
        .upsert({
          user_id: userId,
          pending_action: null,
          previous_response_id: contextData?.previous_response_id || null,
          updated_at: new Date().toISOString()
        })

      if (err.name === 'BusinessRuleError' || err instanceof BusinessRuleError) {
        return {
          status: 'error',
          code: err.code,
          message: `Falha de validação: ${err.message}`,
          details: err.details
        }
      }

      return {
        status: 'error',
        message: `Falha ao cadastrar cliente: ${err.message}`
      }
    }
  }

  if (name === 'cancel_create_client') {
    await supabaseAdmin
      .from('whatsapp_agent_context')
      .upsert({
        user_id: userId,
        pending_action: null,
        previous_response_id: contextData?.previous_response_id || null,
        updated_at: new Date().toISOString()
      })

    return {
      status: 'canceled',
      message: 'Ação pendente de cadastro de cliente cancelada e removida com sucesso.'
    }
  }

  if (name === 'prepare_create_presentation') {
    const { title, date, startTime, endTime } = args

    const pendingAction = {
      type: 'create_presentation',
      title,
      date,
      startTime,
      endTime,
      timestamp: new Date().toISOString()
    }

    const { error: saveError } = await supabaseAdmin
      .from('whatsapp_agent_context')
      .upsert({
        user_id: userId,
        pending_action: pendingAction,
        previous_response_id: contextData?.previous_response_id || null,
        updated_at: new Date().toISOString()
      })

    if (saveError) throw saveError

    return {
      status: 'pending_confirmation',
      message: `Ação de criar reunião comercial "${title}" no dia ${date} das ${startTime} às ${endTime} salva como pendente. Aguardando confirmação do usuário.`
    }
  }

  if (name === 'confirm_create_presentation') {
    const pendingAction = contextData?.pending_action

    if (!pendingAction || pendingAction.type !== 'create_presentation') {
      return { error: 'Não há nenhuma ação de criação de reunião pendente ou a pendência expirou.' }
    }

    try {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')
      const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

      const response = await fetch(`${supabaseUrl}/functions/v1/google-presentation-create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${serviceRoleKey}`,
          'x-user-id': userId
        },
        body: JSON.stringify({
          title: pendingAction.title,
          date: pendingAction.date,
          startTime: pendingAction.startTime,
          endTime: pendingAction.endTime
        })
      })

      const responseData = await response.json()

      if (!response.ok || responseData.error) {
        throw new Error(responseData.error || 'Erro desconhecido ao criar apresentação no Google.')
      }

      await supabaseAdmin
        .from('whatsapp_agent_context')
        .upsert({
          user_id: userId,
          pending_action: null,
          previous_response_id: contextData?.previous_response_id || null,
          updated_at: new Date().toISOString()
        })

      return {
        status: 'success',
        message: 'Reunião comercial criada com sucesso.',
        presentation: responseData.presentation
      }
    } catch (err: any) {
      await supabaseAdmin
        .from('whatsapp_agent_context')
        .upsert({
          user_id: userId,
          pending_action: null,
          previous_response_id: contextData?.previous_response_id || null,
          updated_at: new Date().toISOString()
        })

      return {
        status: 'error',
        message: `Falha ao criar reunião: ${err.message}`
      }
    }
  }

  if (name === 'cancel_create_presentation') {
    await supabaseAdmin
      .from('whatsapp_agent_context')
      .upsert({
        user_id: userId,
        pending_action: null,
        previous_response_id: contextData?.previous_response_id || null,
        updated_at: new Date().toISOString()
      })

    return {
      status: 'canceled',
      message: 'Ação pendente de criação de reunião cancelada e removida com sucesso.'
    }
  }

  throw new Error(`Tool ${name} desconhecida.`)
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Método não permitido.' }, 405)
  }

  try {
    const requestSecret = req.headers.get('x-gateway-secret')
    const gatewaySecret = Deno.env.get('GATEWAY_SECRET') || Deno.env.get('LEMBRETES_CRON_SECRET')

    if (!gatewaySecret || requestSecret !== gatewaySecret) {
      return jsonResponse({ error: 'Não autorizado.' }, 401)
    }

    const { userId, text } = await req.json()

    if (!userId || !text) {
      return jsonResponse({ error: 'Parâmetros userId e text são obrigatórios.' }, 400)
    }

    const openAiApiKey = Deno.env.get('OPENAI_API_KEY')
    if (!openAiApiKey) {
      return jsonResponse({ error: 'Chave do OpenAI não configurada no servidor.' }, 500)
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error('Configuração incompleta do Supabase no servidor.')
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey)

    // A. Check active Google integration
    const { data: integration, error: integrationError } = await supabaseAdmin
      .from('google_integracao')
      .select('id')
      .eq('user_id', userId)
      .eq('ativo', true)
      .maybeSingle()

    if (integrationError || !integration) {
      return jsonResponse({
        responseText: 'Olá! Não consegui consultar sua agenda porque você não possui nenhuma conta Google Agenda conectada e ativa no Meety. Por favor, acesse as configurações no painel web para conectar.'
      })
    }

    const googleIntegracaoId = integration.id

    // B. Load previous response context (expiration window: 30 minutes)
    const limitTime = new Date(Date.now() - 30 * 60 * 1000).toISOString()
    const { data: contextData } = await supabaseAdmin
      .from('whatsapp_agent_context')
      .select('previous_response_id, pending_action, updated_at')
      .eq('user_id', userId)
      .gt('updated_at', limitTime)
      .maybeSingle()

    const activePrevResponseId = contextData?.previous_response_id || null

    // C. Validate pending_action expiration (5 minutes)
    let pendingAction = contextData?.pending_action || null
    let pendingActionDetails = 'Nenhuma ação pendente.'
    if (pendingAction) {
      const updatedAtStr = contextData.updated_at
      const updatedAt = new Date(updatedAtStr).getTime()
      const isExpired = Date.now() - updatedAt > 5 * 60 * 1000 // 5 minutes window

      if (isExpired) {
        pendingAction = null
        // Clear expired action
        await supabaseAdmin
          .from('whatsapp_agent_context')
          .upsert({
            user_id: userId,
            pending_action: null,
            previous_response_id: activePrevResponseId,
            updated_at: new Date().toISOString()
          })
      } else {
        if (pendingAction.type === 'schedule_participant') {
          const { data: cl } = await supabaseAdmin.from('clientes').select('nome, telefone').eq('id', pendingAction.client_id).maybeSingle()
          const { data: pr } = await supabaseAdmin.from('apresentacoes').select('titulo, data, horario').eq('id', pendingAction.presentation_id).maybeSingle()

          if (cl && pr) {
            const dateParts = pr.data.split('-')
            const formattedDate = `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}`
            pendingActionDetails = `Agendar participante "${cl.nome}" (Telefone: ${cl.telefone}) na reunião "${pr.titulo}" no dia ${formattedDate} às ${pr.horario.slice(0, 5)}`
          }
        } else if (pendingAction.type === 'reschedule_participant') {
          const { data: part } = await supabaseAdmin.from('participacoes').select('id, cliente_id, clientes(nome)').eq('id', pendingAction.participant_id).maybeSingle()
          const { data: fromPr } = await supabaseAdmin.from('apresentacoes').select('titulo').eq('id', pendingAction.from_presentation_id).maybeSingle()
          const { data: toPr } = await supabaseAdmin.from('apresentacoes').select('titulo, data, horario').eq('id', pendingAction.to_presentation_id).maybeSingle()

          if (part && fromPr && toPr) {
            const clientName = part.clientes?.nome || 'Cliente'
            const dateParts = toPr.data.split('-')
            const formattedDate = `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}`
            pendingActionDetails = `Remarcar participante "${clientName}" da reunião "${fromPr.titulo}" para a reunião "${toPr.titulo}" no dia ${formattedDate} às ${toPr.horario.slice(0, 5)}`
          }
        } else if (pendingAction.type === 'cancel_participant') {
          const { data: part } = await supabaseAdmin.from('participacoes').select('id, cliente_id, clientes(nome)').eq('id', pendingAction.participant_id).maybeSingle()
          const { data: pr } = await supabaseAdmin.from('apresentacoes').select('titulo, data, horario').eq('id', pendingAction.presentation_id).maybeSingle()

          if (part && pr) {
            const clientName = part.clientes?.nome || 'Cliente'
            const dateParts = pr.data.split('-')
            const formattedDate = `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}`
            pendingActionDetails = `Cancelar participante "${clientName}" da reunião "${pr.titulo}" no dia ${formattedDate} às ${pr.horario.slice(0, 5)}`
          }
        } else if (pendingAction.type === 'reactivate_participant') {
          const { data: part } = await supabaseAdmin.from('participacoes').select('id, cliente_id, clientes(nome)').eq('id', pendingAction.participant_id).maybeSingle()
          const { data: pr } = await supabaseAdmin.from('apresentacoes').select('titulo, data, horario').eq('id', pendingAction.presentation_id).maybeSingle()

          if (part && pr) {
            const clientName = part.clientes?.nome || 'Cliente'
            const dateParts = pr.data.split('-')
            const formattedDate = `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}`
            pendingActionDetails = `Reativar participante "${clientName}" na reunião "${pr.titulo}" no dia ${formattedDate} às ${pr.horario.slice(0, 5)}`
          }
        } else if (pendingAction.type === 'create_client') {
          pendingActionDetails = `Cadastrar cliente "${pendingAction.nome}" (Telefone: ${pendingAction.telefone}${pendingAction.agencia ? `, Agência: ${pendingAction.agencia}` : ''})`
        } else if (pendingAction.type === 'create_presentation') {
          const dateParts = pendingAction.date.split('-')
          const formattedDate = `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}`
          pendingActionDetails = `Criar reunião comercial "${pendingAction.title}" no dia ${formattedDate} das ${pendingAction.startTime} às ${pendingAction.endTime}`
        }
      }
    }

    // Load recent presentations for system prompt injection
    let contextPresentations: any[] = []
    if (contextData && contextData.last_presentation_ids && contextData.last_presentation_ids.length > 0) {
      const { data: presList } = await supabaseAdmin
        .from('apresentacoes')
        .select('id, titulo, horario, horario_fim, data')
        .in('id', contextData.last_presentation_ids)
        .order('horario', { ascending: true })
      contextPresentations = presList || []
    }

    let contextStr = 'Nenhuma reunião recente na memória da conversa.'
    if (contextPresentations.length > 0) {
      contextStr = contextPresentations.map((p, idx) => {
        const start = p.horario ? p.horario.slice(0, 5) : '00:00'
        const dateParts = p.data.split('-')
        const formattedDate = `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}`
        return `Index ${idx + 1}: ID: ${p.id}, Título: "${p.titulo}", Horário: ${start}, Data: ${formattedDate}`
      }).join('\n')
    }

    const todayDateDetails = getSaoPauloTodayDetails()

    const instructions = getAgentInstructions(todayDateDetails, contextStr, pendingActionDetails)

    const tools = [
      {
        type: 'function',
        name: 'list_presentations',
        description: 'Lista todas as reuniões do usuário em um intervalo de datas. Datas no formato YYYY-MM-DD.',
        parameters: {
          type: 'object',
          properties: {
            start_date: {
              type: 'string',
              description: 'Data de início no formato YYYY-MM-DD'
            },
            end_date: {
              type: 'string',
              description: 'Data de término no formato YYYY-MM-DD'
            }
          },
          required: ['start_date', 'end_date'],
          additionalProperties: false
        }
      },
      {
        type: 'function',
        name: 'get_presentation_details',
        description: 'Retorna detalhes específicos de uma apresentação (título, horário de início e fim, link do Google Meet e data) a partir do ID.',
        parameters: {
          type: 'object',
          properties: {
            presentation_id: {
              type: 'integer',
              description: 'ID numérico da apresentação'
            }
          },
          required: ['presentation_id'],
          additionalProperties: false
        }
      },
      {
        type: 'function',
        name: 'list_participants',
        description: 'Lista os nomes dos participantes para uma determinada apresentação. Pode listar ativos ou cancelados.',
        parameters: {
          type: 'object',
          properties: {
            presentation_id: {
              type: 'integer',
              description: 'ID numérico da apresentação'
            },
            status: {
              type: 'string',
              description: 'Status dos participantes a listar (ativo ou cancelado). Padrão é ativo.',
              enum: ['ativo', 'cancelado']
            }
          },
          required: ['presentation_id'],
          additionalProperties: false
        }
      },
      {
        type: 'function',
        name: 'find_client',
        description: 'Busca dados de um cliente pelo seu nome ou telefone.',
        parameters: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Nome ou telefone do cliente para buscar'
            }
          },
          required: ['query'],
          additionalProperties: false
        }
      },
      {
        type: 'function',
        name: 'prepare_schedule_participant',
        description: 'Salva uma ação pendente de agendamento de cliente na reunião comercial.',
        parameters: {
          type: 'object',
          properties: {
            client_id: {
              type: 'integer',
              description: 'ID do cliente cadastrado'
            },
            presentation_id: {
              type: 'integer',
              description: 'ID da reunião comercial'
            }
          },
          required: ['client_id', 'presentation_id'],
          additionalProperties: false
        }
      },
      {
        type: 'function',
        name: 'confirm_schedule_participant',
        description: 'Efetiva o agendamento da ação pendente no banco de dados aplicando todas as regras de validação do Meety.',
        parameters: {
          type: 'object',
          properties: {},
          required: [],
          additionalProperties: false
        }
      },
      {
        type: 'function',
        name: 'cancel_schedule_participant',
        description: 'Cancela e descarta a ação pendente de agendamento atual.',
        parameters: {
          type: 'object',
          properties: {},
          required: [],
          additionalProperties: false
        }
      },
      {
        type: 'function',
        name: 'prepare_reschedule_participant',
        description: 'Salva uma ação pendente de remarcação de participante entre duas apresentações comerciais.',
        parameters: {
          type: 'object',
          properties: {
            participant_id: {
              type: 'integer',
              description: 'ID da participação existente do cliente a ser movido'
            },
            from_presentation_id: {
              type: 'integer',
              description: 'ID da reunião comercial de origem'
            },
            to_presentation_id: {
              type: 'integer',
              description: 'ID da reunião comercial futura de destino'
            }
          },
          required: ['participant_id', 'from_presentation_id', 'to_presentation_id'],
          additionalProperties: false
        }
      },
      {
        type: 'function',
        name: 'confirm_reschedule_participant',
        description: 'Efetiva a remarcação da ação pendente no banco de dados aplicando todas as regras de validação do Meety.',
        parameters: {
          type: 'object',
          properties: {},
          required: [],
          additionalProperties: false
        }
      },
      {
        type: 'function',
        name: 'cancel_reschedule_participant',
        description: 'Cancela e descarta a ação pendente de remarcação atual.',
        parameters: {
          type: 'object',
          properties: {},
          required: [],
          additionalProperties: false
        }
      },
      {
        type: 'function',
        name: 'prepare_cancel_participant',
        description: 'Salva uma ação pendente de cancelamento de participação na reunião comercial.',
        parameters: {
          type: 'object',
          properties: {
            participant_id: {
              type: 'integer',
              description: 'ID da participação a ser cancelada'
            },
            presentation_id: {
              type: 'integer',
              description: 'ID da reunião comercial'
            }
          },
          required: ['participant_id', 'presentation_id'],
          additionalProperties: false
        }
      },
      {
        type: 'function',
        name: 'confirm_cancel_participant',
        description: 'Efetiva o cancelamento da participação da ação pendente no banco de dados aplicando todas as regras de validação do Meety.',
        parameters: {
          type: 'object',
          properties: {},
          required: [],
          additionalProperties: false
        }
      },
      {
        type: 'function',
        name: 'cancel_cancel_participant',
        description: 'Cancela e descarta a ação pendente de cancelamento de participação atual.',
        parameters: {
          type: 'object',
          properties: {},
          required: [],
          additionalProperties: false
        }
      },
      {
        type: 'function',
        name: 'prepare_reactivate_participant',
        description: 'Salva uma ação pendente de reativação de participação na reunião comercial.',
        parameters: {
          type: 'object',
          properties: {
            participant_id: {
              type: 'integer',
              description: 'ID da participação cancelada a ser reativada'
            },
            presentation_id: {
              type: 'integer',
              description: 'ID da reunião comercial'
            }
          },
          required: ['participant_id', 'presentation_id'],
          additionalProperties: false
        }
      },
      {
        type: 'function',
        name: 'confirm_reactivate_participant',
        description: 'Efetiva a reativação da participação da ação pendente no banco de dados aplicando todas as regras de validação do Meety.',
        parameters: {
          type: 'object',
          properties: {},
          required: [],
          additionalProperties: false
        }
      },
      {
        type: 'function',
        name: 'cancel_reactivate_participant',
        description: 'Cancela e descarta a ação pendente de reativação de participação atual.',
        parameters: {
          type: 'object',
          properties: {},
          required: [],
          additionalProperties: false
        }
      },
      {
        type: 'function',
        name: 'prepare_create_client',
        description: 'Salva uma ação pendente de cadastrar um novo cliente no banco de dados.',
        parameters: {
          type: 'object',
          properties: {
            nome: {
              type: 'string',
              description: 'Nome completo do cliente a ser cadastrado'
            },
            telefone: {
              type: 'string',
              description: 'Telefone do cliente (DDD + Número)'
            },
            agencia: {
              type: 'string',
              description: 'Agência opcional do cliente'
            }
          },
          required: ['nome', 'telefone'],
          additionalProperties: false
        }
      },
      {
        type: 'function',
        name: 'confirm_create_client',
        description: 'Efetiva o cadastro do novo cliente da ação pendente no banco de dados aplicando todas as regras do Meety.',
        parameters: {
          type: 'object',
          properties: {},
          required: [],
          additionalProperties: false
        }
      },
      {
        type: 'function',
        name: 'cancel_create_client',
        description: 'Cancela e descarta a ação pendente de cadastro de cliente atual.',
        parameters: {
          type: 'object',
          properties: {},
          required: [],
          additionalProperties: false
        }
      },
      {
        type: 'function',
        name: 'prepare_create_presentation',
        description: 'Salva uma ação pendente de criar uma nova reunião comercial no banco de dados.',
        parameters: {
          type: 'object',
          properties: {
            title: {
              type: 'string',
              description: 'Título da reunião comercial'
            },
            date: {
              type: 'string',
              description: 'Data da reunião no formato YYYY-MM-DD'
            },
            startTime: {
              type: 'string',
              description: 'Horário de início no formato HH:MM'
            },
            endTime: {
              type: 'string',
              description: 'Horário de término no formato HH:MM'
            }
          },
          required: ['title', 'date', 'startTime', 'endTime'],
          additionalProperties: false
        }
      },
      {
        type: 'function',
        name: 'confirm_create_presentation',
        description: 'Efetiva a criação da nova reunião comercial da ação pendente no Google Agenda e banco de dados.',
        parameters: {
          type: 'object',
          properties: {},
          required: [],
          additionalProperties: false
        }
      },
      {
        type: 'function',
        name: 'cancel_create_presentation',
        description: 'Cancela e descarta a ação pendente de criação de reunião atual.',
        parameters: {
          type: 'object',
          properties: {},
          required: [],
          additionalProperties: false
        }
      }
    ]

    // D. Setup Responses payload
    const payload: Record<string, any> = {
      model: 'gpt-4o-mini',
      input: text,
      instructions,
      tools
    }

    if (activePrevResponseId) {
      payload.previous_response_id = activePrevResponseId
    }

    let lastPayload: any = null
    let lastResponseData: any = null

    try {
      // E. Call OpenAI Responses API with self-healing retry for blocked conversation threads
      let responseData
      try {
        responseData = await callOpenAI(openAiApiKey, payload)
      } catch (err: any) {
        if (activePrevResponseId && err.message.includes('No tool output found for function call')) {
          console.warn('Conversa travada por tool call pendente. Resetando contexto...', err.message)
          await supabaseAdmin
            .from('whatsapp_agent_context')
            .upsert({
              user_id: userId,
              previous_response_id: null,
              pending_action: pendingAction,
              updated_at: new Date().toISOString()
            })
          delete payload.previous_response_id
          responseData = await callOpenAI(openAiApiKey, payload)
        } else {
          throw err
        }
      }
      lastResponseData = responseData

      // Handle tool calls items inside output using a loop to support multi-step tool calls
      let loopCount = 0
      while (loopCount < 5) {
        const toolCalls = (responseData.output || []).filter((item: any) => item.type === 'function_call')
        if (toolCalls.length === 0) break

        const toolOutputs: any[] = []

        for (const toolCall of toolCalls) {
          const name = toolCall.name
          const args = JSON.parse(toolCall.arguments || '{}')

          let result
          try {
            result = await executeTool(supabaseAdmin, userId, googleIntegracaoId, name, args, {
              previous_response_id: responseData.id,
              pending_action: pendingAction
            })
          } catch (err: any) {
            console.error(`Erro ao executar tool ${name}:`, err)
            result = { error: `Erro ao processar dados: ${err.message}` }
          }

          toolOutputs.push({
            type: 'function_call_output',
            call_id: toolCall.call_id,
            output: JSON.stringify(result)
          })
        }

        // Submit tool outputs to continue the conversation
        const submitPayload: Record<string, any> = {
          model: 'gpt-4o-mini',
          previous_response_id: responseData.id,
          input: toolOutputs,
          instructions,
          tools
        }
        lastPayload = submitPayload

        responseData = await callOpenAI(openAiApiKey, submitPayload)
        lastResponseData = responseData
        loopCount++
      }

      // Extract text from the response's output
      const messageItem = (responseData.output || []).find((item: any) => item.type === 'message')
      const contentItem = (messageItem?.content || []).find((c: any) => c.type === 'output_text')
      const responseText = contentItem?.text || 'Não consegui processar a resposta.'

      // F. Save updated conversation context (persist last valid response ID)
      // Fetch latest context to preserve pending_action updates made during tool execution
      const { data: latestContext } = await supabaseAdmin
        .from('whatsapp_agent_context')
        .select('pending_action')
        .eq('user_id', userId)
        .maybeSingle()

      const { error: contextSaveError } = await supabaseAdmin
        .from('whatsapp_agent_context')
        .upsert({
          user_id: userId,
          previous_response_id: responseData.id,
          pending_action: latestContext?.pending_action || null,
          updated_at: new Date().toISOString()
        })

      if (contextSaveError) {
        console.error('Erro ao atualizar contexto de responses no banco:', contextSaveError)
      }

      return jsonResponse({ responseText })

    } catch (error: any) {
      console.error('Erro na Edge Function:', error.message || error)
      return jsonResponse({
        error: error.message,
        stack: error.stack,
        lastPayload,
        lastResponseData
      }, 500)
    }
  } catch (error: any) {
    console.error('Erro geral na Edge Function:', error.message || error)
    return jsonResponse({ error: error.message, stack: error.stack }, 500)
  }
})
