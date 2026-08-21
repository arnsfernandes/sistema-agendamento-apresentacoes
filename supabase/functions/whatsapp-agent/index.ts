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

const parseSaoPauloDateTime = (dateStr: string, timeStr: string): Date => {
  const dummy = new Date(`${dateStr}T${timeStr}:00Z`)
  const tzString = dummy.toLocaleString('sv', { timeZone: TIME_ZONE })
  const spDate = new Date(tzString.replace(' ', 'T') + 'Z')
  const diffMs = dummy.getTime() - spDate.getTime()
  return new Date(dummy.getTime() + diffMs)
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

    // Pré-sincroniza do Google Agenda para o Supabase
    try {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')
      const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
      if (supabaseUrl && serviceRoleKey) {
        const syncResponse = await fetch(`${supabaseUrl}/functions/v1/google-calendar-sync-apply`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${serviceRoleKey}`,
            'x-user-id': userId
          },
          body: JSON.stringify({
            startDate: start_date,
            endDate: end_date
          })
        })
        if (!syncResponse.ok) {
          console.warn(`Pré-sincronização list_presentations retornou status ${syncResponse.status}`)
        }
      }
    } catch (syncErr) {
      console.error('Erro ao pré-sincronizar list_presentations:', syncErr)
    }

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
      .select('id, status, link_enviado, observacao, clientes(nome, telefone)')
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
    const { title, date, startTime, endTime, isRecurring, recurringDays, recurrenceEndOption, recurrenceEndDate } = args

    const pendingAction = {
      type: 'create_presentation',
      title,
      date,
      startTime,
      endTime,
      isRecurring: !!isRecurring,
      recurringDays: Array.isArray(recurringDays) ? recurringDays : [],
      recurrenceEndOption: recurrenceEndOption || 'never',
      recurrenceEndDate: recurrenceEndDate || '',
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

    let summary = `Ação de criar reunião comercial "${title}" no dia ${date} das ${startTime} às ${endTime}`
    if (isRecurring) {
      const daysLabel = recurringDays?.join(', ') || ''
      const endLabel = recurrenceEndOption === 'date' && recurrenceEndDate ? ` até ${recurrenceEndDate}` : ' sem data de término'
      summary += ` [Recorrência semanal às ${daysLabel}${endLabel}]`
    }

    return {
      status: 'pending_confirmation',
      message: `${summary} salva como pendente. Aguardando confirmação do usuário.`
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
          endTime: pendingAction.endTime,
          isRecurring: pendingAction.isRecurring,
          recurringDays: pendingAction.recurringDays,
          recurrenceEndOption: pendingAction.recurrenceEndOption,
          recurrenceEndDate: pendingAction.recurrenceEndDate
        })
      })

      const responseData = await response.json()

      if (!response.ok || responseData.error) {
        throw new Error(responseData.error || 'Erro desconhecido ao criar apresentação no Google.')
      }
      // Se for recorrente, dispara a sincronização inicial das primeiras ocorrências do mês de início
      if (pendingAction.isRecurring) {
        try {
          const presentationDateObj = new Date(pendingAction.date + 'T00:00:00')
          const y = presentationDateObj.getFullYear()
          const m = presentationDateObj.getMonth()
          const startDate = `${y}-${String(m + 1).padStart(2, '0')}-01`
          const next = new Date(y, m + 1, 1)
          const endDate = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}-01`

          await fetch(`${supabaseUrl}/functions/v1/google-calendar-sync-apply`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${serviceRoleKey}`,
              'x-user-id': userId
            },
            body: JSON.stringify({ startDate, endDate })
          })
        } catch (syncErr) {
          console.error('Erro ao rodar sincronização automática pós-criação da recorrência:', syncErr)
        }
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

  if (name === 'prepare_update_presentation') {
    const { presentationId, title, date, startTime, endTime, editScope } = args

    // Fetch original presentation to get fallback values and etag
    const { data: original, error: fetchErr } = await supabaseAdmin
      .from('apresentacoes')
      .select('titulo, data, horario, horario_fim, google_event_updated_at')
      .eq('id', presentationId)
      .single()

    if (fetchErr || !original) {
      return { error: 'Reunião comercial não encontrada.' }
    }

    const pendingAction = {
      type: 'update_presentation',
      presentationId,
      title: (title && typeof title === 'string' && title.trim()) ? title.trim() : original.titulo,
      date: (date && typeof date === 'string' && date.trim()) ? date.trim() : original.data,
      startTime: (startTime && typeof startTime === 'string' && startTime.trim()) ? startTime.trim() : original.horario.slice(0, 5),
      endTime: (endTime && typeof endTime === 'string' && endTime.trim()) ? endTime.trim() : original.horario_fim.slice(0, 5),
      etag: null,
      editScope: editScope || 'occurrence',
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
      message: `Ação de editar reunião comercial de ID ${presentationId} salva como pendente. Aguardando confirmação.`
    }
  }

  if (name === 'confirm_update_presentation') {
    const pendingAction = contextData?.pending_action

    if (!pendingAction || pendingAction.type !== 'update_presentation') {
      return { error: 'Não há nenhuma ação de edição de reunião pendente ou a pendência expirou.' }
    }

    try {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')
      const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

      const response = await fetch(`${supabaseUrl}/functions/v1/google-presentation-update`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${serviceRoleKey}`,
          'x-user-id': userId
        },
        body: JSON.stringify({
          presentationId: pendingAction.presentationId,
          title: pendingAction.title,
          date: pendingAction.date,
          startTime: pendingAction.startTime,
          endTime: pendingAction.endTime,
          etag: pendingAction.etag,
          editScope: pendingAction.editScope
        })
      })

      const responseData = await response.json()

      if (!response.ok || responseData.error) {
        throw new Error(responseData.error || 'Erro desconhecido ao atualizar apresentação no Google.')
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
        message: 'Reunião comercial atualizada com sucesso.',
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
        message: `Falha ao editar reunião: ${err.message}`
      }
    }
  }

  if (name === 'cancel_update_presentation') {
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
      message: 'Ação pendente de edição de reunião cancelada e removida com sucesso.'
    }
  }

  if (name === 'prepare_delete_presentation') {
    const { presentationId, deleteParticipants, deleteScope } = args

    // Fetch original presentation to get details for confirmation message
    const { data: original, error: fetchErr } = await supabaseAdmin
      .from('apresentacoes')
      .select('titulo, data, horario')
      .eq('id', presentationId)
      .single()

    if (fetchErr || !original) {
      return { error: 'Reunião comercial não encontrada.' }
    }

    const pendingAction = {
      type: 'delete_presentation',
      presentationId,
      deleteParticipants: !!deleteParticipants,
      deleteScope: deleteScope || 'occurrence',
      title: original.titulo,
      date: original.data,
      startTime: original.horario.slice(0, 5),
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
      message: `Ação de excluir a reunião comercial de ID ${presentationId} salva como pendente. Aguardando confirmação.`
    }
  }

  if (name === 'confirm_delete_presentation') {
    const pendingAction = contextData?.pending_action

    if (!pendingAction || pendingAction.type !== 'delete_presentation') {
      return { error: 'Não há nenhuma ação de exclusão de reunião pendente ou a pendência expirou.' }
    }

    try {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')
      const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

      const response = await fetch(`${supabaseUrl}/functions/v1/google-presentation-delete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${serviceRoleKey}`,
          'x-user-id': userId
        },
        body: JSON.stringify({
          presentationId: pendingAction.presentationId,
          deleteParticipants: pendingAction.deleteParticipants,
          deleteScope: pendingAction.deleteScope
        })
      })

      const rawText = await response.text()
      console.log('google-presentation-delete response status:', response.status, 'body:', rawText)

      let responseData: any = {}
      try {
        responseData = JSON.parse(rawText)
      } catch (jsonErr) {
        throw new Error(`Status ${response.status}: Resposta não-JSON do servidor de exclusão: ${rawText.slice(0, 100)}`)
      }

      if (!response.ok || responseData.error) {
        throw new Error(responseData.error || `Status ${response.status}: Erro ao excluir apresentação.`)
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
        message: 'Reunião comercial excluída com sucesso.',
        presentationId: pendingAction.presentationId
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
        message: `Falha ao excluir reunião: ${err.message}`
      }
    }
  }

  if (name === 'cancel_delete_presentation') {
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
      message: 'Ação pendente de exclusão de reunião cancelada e removida com sucesso.'
    }
  }

  if (name === 'prepare_move_and_delete_presentation') {
    const { sourcePresentationId, targetPresentationId } = args

    // Fetch original source and target presentations
    const { data: source, error: sourceErr } = await supabaseAdmin
      .from('apresentacoes')
      .select('titulo, data, horario')
      .eq('id', sourcePresentationId)
      .single()

    const { data: target, error: targetErr } = await supabaseAdmin
      .from('apresentacoes')
      .select('titulo, data, horario')
      .eq('id', targetPresentationId)
      .single()

    if (sourceErr || !source || targetErr || !target) {
      return { error: 'Reunião comercial de origem ou de destino não encontrada.' }
    }

    const pendingAction = {
      type: 'move_and_delete_presentation',
      sourcePresentationId,
      targetPresentationId,
      sourceTitle: source.titulo,
      sourceDate: source.data,
      sourceStartTime: source.horario.slice(0, 5),
      targetTitle: target.titulo,
      targetDate: target.data,
      targetStartTime: target.horario.slice(0, 5),
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
      message: `Ação de mover participantes da reunião ID ${sourcePresentationId} para reunião ID ${targetPresentationId} e excluir a origem salva como pendente. Aguardando confirmação.`
    }
  }

  if (name === 'confirm_move_and_delete_presentation') {
    const pendingAction = contextData?.pending_action

    if (!pendingAction || pendingAction.type !== 'move_and_delete_presentation') {
      return { error: 'Não há nenhuma ação de mover participantes pendente ou a pendência expirou.' }
    }

    try {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')
      const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

      const response = await fetch(`${supabaseUrl}/functions/v1/google-presentation-move-and-delete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${serviceRoleKey}`,
          'x-user-id': userId
        },
        body: JSON.stringify({
          sourcePresentationId: pendingAction.sourcePresentationId,
          targetPresentationId: pendingAction.targetPresentationId
        })
      })

      const responseData = await response.json()

      if (!response.ok || responseData.error) {
        throw new Error(responseData.error || 'Erro desconhecido ao mover participantes e excluir apresentação de origem.')
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
        message: 'Participantes movidos e reunião de origem excluída com sucesso.',
        sourcePresentationId: pendingAction.sourcePresentationId,
        targetPresentationId: pendingAction.targetPresentationId
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
        message: `Falha ao mover participantes e excluir: ${err.message}`
      }
    }
  }

  if (name === 'cancel_move_and_delete_presentation') {
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
      message: 'Ação pendente de mover participantes e excluir cancelada e removida com sucesso.'
    }
  }

  if (name === 'prepare_update_participant_link_status') {
    const { participantId, status } = args

    // Valida que o participante pertence a uma reunião do usuário e à integração Google ativa
    const { data: part, error: partError } = await supabaseAdmin
      .from('participacoes')
      .select('id, status, link_enviado, apresentacoes!inner(titulo, data, horario, user_id, google_integracao_id), clientes(nome)')
      .eq('id', participantId)
      .eq('apresentacoes.user_id', userId)
      .eq('apresentacoes.google_integracao_id', googleIntegracaoId)
      .maybeSingle()

    if (partError || !part) {
      return { error: 'Participante não encontrado ou você não tem permissão para gerenciar esta participação nesta integração ativa.' }
    }

    const pendingAction = {
      type: 'update_participant_link_status',
      participantId,
      status,
      clientName: part.clientes?.nome || 'Participante',
      presentationTitle: part.apresentacoes?.titulo || 'Reunião',
      presentationDate: part.apresentacoes?.data || '',
      presentationTime: part.apresentacoes?.horario || '',
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

    const statusLabel = status ? 'enviado' : 'pendente (não enviado)'
    return {
      status: 'pending_confirmation',
      message: `Ação de marcar o link do participante "${pendingAction.clientName}" na reunião "${pendingAction.presentationTitle}" como "${statusLabel}" salva como pendente. Aguardando confirmação.`
    }
  }

  if (name === 'confirm_update_participant_link_status') {
    const pendingAction = contextData?.pending_action

    if (!pendingAction || pendingAction.type !== 'update_participant_link_status') {
      return { error: 'Não há nenhuma ação de atualizar status do link de participante pendente ou a pendência expirou.' }
    }

    try {
      // Re-valida que o participante pertence a uma reunião do usuário e à integração Google ativa
      const { data: part, error: partError } = await supabaseAdmin
        .from('participacoes')
        .select('id, apresentacoes!inner(user_id, google_integracao_id)')
        .eq('id', pendingAction.participantId)
        .eq('apresentacoes.user_id', userId)
        .eq('apresentacoes.google_integracao_id', googleIntegracaoId)
        .maybeSingle()

      if (partError || !part) {
        throw new Error('Permissão negada ou participação inexistente.')
      }

      // Atualiza a coluna no banco
      const { error: updateError } = await supabaseAdmin
        .from('participacoes')
        .update({ link_enviado: pendingAction.status })
        .eq('id', pendingAction.participantId)

      if (updateError) throw updateError

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
        message: `Status de envio do link do participante "${pendingAction.clientName}" atualizado com sucesso para: ${pendingAction.status ? 'enviado' : 'pendente'}.`,
        participantId: pendingAction.participantId,
        status: pendingAction.status
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
        message: `Falha ao atualizar status do link do participante: ${err.message}`
      }
    }
  }

  if (name === 'cancel_update_participant_link_status') {
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
      message: 'Ação pendente de atualizar status do link de participante cancelada e removida com sucesso.'
    }
  }

  if (name === 'prepare_create_personal_reminder') {
    const { mensagem, data, horario } = args

    // Valida data/horário futuro no timezone America/Sao_Paulo
    const targetDate = parseSaoPauloDateTime(data, horario)
    if (targetDate <= new Date()) {
      return { error: 'Não é possível agendar um lembrete para uma data/horário que já passou.' }
    }

    const pendingAction = {
      type: 'create_personal_reminder',
      mensagem,
      disparar_em: targetDate.toISOString(),
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

    const dateParts = data.split('-')
    const formattedDate = `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}`
    return {
      status: 'pending_confirmation',
      message: `Ação de criar o lembrete pessoal "${mensagem}" para o dia ${formattedDate} às ${horario} salva como pendente. Aguardando confirmação.`
    }
  }

  if (name === 'confirm_create_personal_reminder') {
    const pendingAction = contextData?.pending_action

    if (!pendingAction || pendingAction.type !== 'create_personal_reminder') {
      return { error: 'Não há nenhuma ação de criar lembrete pessoal pendente ou a pendência expirou.' }
    }

    try {
      // Re-valida que o horário ainda está no futuro no momento da confirmação
      const targetDate = new Date(pendingAction.disparar_em)
      if (targetDate <= new Date()) {
        throw new Error('A data/horário do lembrete já passou.')
      }

      const { error: insertError } = await supabaseAdmin
        .from('lembretes_pessoais')
        .insert({
          user_id: userId,
          mensagem: pendingAction.mensagem,
          disparar_em: pendingAction.disparar_em
        })

      if (insertError) throw insertError

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
        message: 'Lembrete pessoal criado com sucesso.',
        mensagem: pendingAction.mensagem,
        disparar_em: pendingAction.disparar_em
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
        message: `Falha ao criar lembrete pessoal: ${err.message}`
      }
    }
  }

  if (name === 'cancel_create_personal_reminder') {
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
      message: 'Ação pendente de criar lembrete pessoal cancelada e removida com sucesso.'
    }
  }

  if (name === 'list_personal_reminders') {
    const { startDate, endDate } = args

    let query = supabaseAdmin
      .from('lembretes_pessoais')
      .select('id, mensagem, disparar_em')
      .eq('user_id', userId)
      .is('enviado_em', null)
      .gt('disparar_em', new Date().toISOString())
      .order('disparar_em', { ascending: true })

    if (startDate) {
      const startUtc = parseSaoPauloDateTime(startDate, '00:00').toISOString()
      query = query.gte('disparar_em', startUtc)
    }
    if (endDate) {
      const endUtc = parseSaoPauloDateTime(endDate, '23:59').toISOString()
      query = query.lte('disparar_em', endUtc)
    }

    const { data, error } = await query
    if (error) throw error

    return data || []
  }

  if (name === 'prepare_delete_client') {
    const { clientId } = args

    // 1. Fetch client and validate user/integration ownership
    const { data: client, error: clientErr } = await supabaseAdmin
      .from('clientes')
      .select('id, nome, excluido')
      .eq('id', clientId)
      .eq('user_id', userId)
      .eq('google_integracao_id', googleIntegracaoId)
      .maybeSingle()

    if (clientErr) throw clientErr
    if (!client || client.excluido) {
      return { error: 'Cliente não encontrado ou já inativo.' }
    }

    // 2. Check for active participations in future presentations (data >= hoje em America/Sao_Paulo)
    const todaySaoPaulo = new Date().toLocaleDateString('sv', { timeZone: TIME_ZONE })

    const { data: futureParticipations, error: partErr } = await supabaseAdmin
      .from('participacoes')
      .select(`
        id,
        apresentacoes!inner (
          id,
          titulo,
          data
        )
      `)
      .eq('cliente_id', clientId)
      .eq('status', 'ativo')
      .gte('apresentacoes.data', todaySaoPaulo)
      .eq('apresentacoes.user_id', userId)
      .eq('apresentacoes.google_integracao_id', googleIntegracaoId)

    if (partErr) throw partErr
    if (futureParticipations && futureParticipations.length > 0) {
      const meetingsList = futureParticipations.map(p => {
        const dateParts = p.apresentacoes?.data.split('-')
        const formattedDate = dateParts ? `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}` : p.apresentacoes?.data
        return `"${p.apresentacoes?.titulo}" em ${formattedDate}`
      }).join(', ')
      return { error: `Este cliente possui reuniões futuras (${meetingsList}). Remova-o dessas reuniões antes de excluir.` }
    }

    // 3. Save pending action
    const pendingAction = {
      type: 'delete_client',
      clientId,
      clientName: client.nome,
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
      message: `Ação de excluir o cliente "${client.nome}" salva como pendente. Confirma a exclusão?`
    }
  }

  if (name === 'confirm_delete_client') {
    const pendingAction = contextData?.pending_action

    if (!pendingAction || pendingAction.type !== 'delete_client') {
      return { error: 'Não há nenhuma ação de excluir cliente pendente ou a pendência expirou.' }
    }

    const { clientId, clientName } = pendingAction

    try {
      // 1. Re-validate the client belongs to user + integration and is not already excluded
      const { data: client, error: clientErr } = await supabaseAdmin
        .from('clientes')
        .select('id, nome, excluido')
        .eq('id', clientId)
        .eq('user_id', userId)
        .eq('google_integracao_id', googleIntegracaoId)
        .maybeSingle()

      if (clientErr) throw clientErr
      if (!client || client.excluido) {
        return { error: 'Cliente não encontrado ou já inativo.' }
      }

      // 2. Re-validate no active future meetings (data >= hoje)
      const todaySaoPaulo = new Date().toLocaleDateString('sv', { timeZone: TIME_ZONE })

      const { data: futureParticipations, error: partErr } = await supabaseAdmin
        .from('participacoes')
        .select(`
          id,
          apresentacoes!inner (
            id,
            titulo,
            data
          )
        `)
        .eq('cliente_id', clientId)
        .eq('status', 'ativo')
        .gte('apresentacoes.data', todaySaoPaulo)
        .eq('apresentacoes.user_id', userId)
        .eq('apresentacoes.google_integracao_id', googleIntegracaoId)

      if (partErr) throw partErr
      if (futureParticipations && futureParticipations.length > 0) {
        const meetingsList = futureParticipations.map(p => {
          const dateParts = p.apresentacoes?.data.split('-')
          const formattedDate = dateParts ? `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}` : p.apresentacoes?.data
          return `"${p.apresentacoes?.titulo}" em ${formattedDate}`
        }).join(', ')
        return { error: `Este cliente possui reuniões futuras (${meetingsList}). Remova-o dessas reuniões antes de excluir.` }
      }

      // 3. Perform logical deletion (excluido = true)
      const { error: deleteError } = await supabaseAdmin
        .from('clientes')
        .update({ excluido: true })
        .eq('id', clientId)

      if (deleteError) throw deleteError

      // 4. Clear pending action
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
        message: `Cliente "${clientName}" inativado com sucesso.`,
        clientId
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
        message: `Falha ao inativar cliente: ${err.message}`
      }
    }
  }

  if (name === 'cancel_delete_client') {
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
      message: 'Ação pendente de excluir cliente cancelada e removida com sucesso.'
    }
  }

  if (name === 'prepare_update_client') {
    const { clientId, nome, telefone, agencia } = args

    const { data: client, error: clientErr } = await supabaseAdmin
      .from('clientes')
      .select('id, nome, telefone, agencia, excluido')
      .eq('id', clientId)
      .eq('user_id', userId)
      .eq('google_integracao_id', googleIntegracaoId)
      .maybeSingle()

    if (clientErr) throw clientErr
    if (!client || client.excluido) {
      return { error: 'Cliente não encontrado ou inativo.' }
    }

    let cleanTel = client.telefone
    if (telefone !== undefined) {
      cleanTel = telefone.replace(/\D/g, '')
      if (cleanTel.length !== 10 && cleanTel.length !== 11) {
        return { error: 'Telefone deve conter 10 ou 11 dígitos.' }
      }
      if (cleanTel !== client.telefone) {
        const { data: existing, error: findError } = await supabaseAdmin
          .from('clientes')
          .select('id')
          .eq('telefone', cleanTel)
          .eq('user_id', userId)
          .eq('google_integracao_id', googleIntegracaoId)
          .maybeSingle()

        if (findError) throw findError
        if (existing) {
          return { error: 'Já existe um cliente cadastrado com este telefone.' }
        }
      }
    }

    const newNome = nome !== undefined ? nome.trim() : client.nome
    const newTelefone = cleanTel
    const newAgencia = agencia !== undefined ? agencia.trim() : client.agencia

    if (newNome === client.nome && newTelefone === client.telefone && newAgencia === client.agencia) {
      return { error: 'Nenhuma alteração informada em relação aos dados atuais.' }
    }

    const pendingAction = {
      type: 'update_client',
      clientId,
      oldData: {
        nome: client.nome,
        telefone: client.telefone,
        agencia: client.agencia
      },
      newData: {
        nome: newNome,
        telefone: newTelefone,
        agencia: newAgencia
      },
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

    // Resumo mostrando apenas os campos que realmente serão alterados
    const changes: string[] = []
    if (newNome !== client.nome) changes.push(`Nome: de "${client.nome}" para "${newNome}"`)
    if (newTelefone !== client.telefone) changes.push(`Telefone: de "${client.telefone}" para "${newTelefone}"`)
    if (newAgencia !== client.agencia) changes.push(`Agência: de "${client.agencia || '(vazio)'}" para "${newAgencia || '(vazio)'}"`)

    return {
      status: 'pending_confirmation',
      message: `Ação de atualizar dados cadastrais do cliente "${client.nome}" salva como pendente. Alterações agendadas:\n- ${changes.join('\n- ')}\n\nConfirma as alterações?`
    }
  }

  if (name === 'confirm_update_client') {
    const pendingAction = contextData?.pending_action

    if (!pendingAction || pendingAction.type !== 'update_client') {
      return { error: 'Não há nenhuma ação de atualizar cliente pendente ou a pendência expirou.' }
    }

    try {
      // Revalida duplicidade de telefone na confirmação se foi alterado
      if (pendingAction.newData.telefone !== pendingAction.oldData.telefone) {
        const { data: existing, error: findError } = await supabaseAdmin
          .from('clientes')
          .select('id')
          .eq('telefone', pendingAction.newData.telefone)
          .eq('user_id', userId)
          .eq('google_integracao_id', googleIntegracaoId)
          .maybeSingle()

        if (findError) throw findError
        if (existing) {
          throw new Error('Já existe outro cliente cadastrado com este telefone.')
        }
      }

      const { error: updateError } = await supabaseAdmin
        .from('clientes')
        .update({
          nome: pendingAction.newData.nome,
          telefone: pendingAction.newData.telefone,
          agencia: pendingAction.newData.agencia
        })
        .eq('id', pendingAction.clientId)
        .eq('user_id', userId)
        .eq('google_integracao_id', googleIntegracaoId)

      if (updateError) throw updateError

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
        message: 'Cadastro do cliente atualizado com sucesso.',
        client: pendingAction.newData
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
        message: `Falha ao atualizar o cadastro do cliente: ${err.message}`
      }
    }
  }

  if (name === 'cancel_update_client') {
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
      message: 'Ação pendente de atualizar cliente cancelada e removida com sucesso.'
    }
  }

  if (name === 'prepare_update_participation_observation') {
    const { participationId, observacao } = args

    // Fetch the participation and join with apresentacoes to validate user ownership
    const { data: part, error: partErr } = await supabaseAdmin
      .from('participacoes')
      .select(`
        id,
        observacao,
        status,
        apresentacoes!inner (
          id,
          titulo,
          data,
          horario,
          user_id,
          google_integracao_id
        ),
        clientes!inner (
          nome
        )
      `)
      .eq('id', participationId)
      .eq('apresentacoes.user_id', userId)
      .eq('apresentacoes.google_integracao_id', googleIntegracaoId)
      .maybeSingle()

    if (partErr) throw partErr
    if (!part) {
      return { error: 'Participação não encontrada ou sem acesso.' }
    }

    if (part.status === 'cancelado') {
      return { error: 'Não é possível alterar a observação de uma participação cancelada.' }
    }

    const cleanObs = observacao !== undefined ? (observacao || '').trim() : ''

    if (cleanObs === (part.observacao || '')) {
      return { error: 'A observação fornecida já é igual à observação atual.' }
    }

    const pendingAction = {
      type: 'update_participation_observation',
      participationId,
      clientName: part.clientes?.nome || 'Cliente',
      presentationTitle: part.apresentacoes?.titulo || 'Reunião',
      oldObservacao: part.observacao || '',
      newObservacao: cleanObs,
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

    const oldObsText = part.observacao ? `"${part.observacao}"` : '(vazio)'
    return {
      status: 'pending_confirmation',
      message: `Ação de atualizar a observação de "${part.clientes?.nome}" na reunião "${part.apresentacoes?.titulo}" salva como pendente. Alteração: de ${oldObsText} para ${cleanObs ? `"${cleanObs}"` : '(vazio)'}. Confirma?`
    }
  }

  if (name === 'confirm_update_participation_observation') {
    const pendingAction = contextData?.pending_action

    if (!pendingAction || pendingAction.type !== 'update_participation_observation') {
      return { error: 'Não há nenhuma ação de atualizar observação pendente ou a pendência expirou.' }
    }

    try {
      const { error: updateError } = await supabaseAdmin
        .from('participacoes')
        .update({ observacao: pendingAction.newObservacao || '' })
        .eq('id', pendingAction.participationId)

      if (updateError) throw updateError

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
        message: 'Observação da participação atualizada com sucesso.',
        observacao: pendingAction.newObservacao
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
        message: `Falha ao atualizar a observação da participação: ${err.message}`
      }
    }
  }

  if (name === 'cancel_update_participation_observation') {
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
      message: 'Ação pendente de atualizar a observação do participante cancelada e removida com sucesso.'
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
          let recurrenceStr = ''
          if (pendingAction.isRecurring) {
            const daysLabel = pendingAction.recurringDays?.join(', ') || ''
            const endLabel = pendingAction.recurrenceEndOption === 'date' && pendingAction.recurrenceEndDate
              ? ` até ${pendingAction.recurrenceEndDate.split('-').reverse().join('/')}`
              : ' sem data de término'
            recurrenceStr = ` [Recorrência semanal às ${daysLabel}${endLabel}]`
          }
          pendingActionDetails = `Criar reunião comercial "${pendingAction.title}" no dia ${formattedDate} das ${pendingAction.startTime} às ${pendingAction.endTime}${recurrenceStr}`
        } else if (pendingAction.type === 'update_presentation') {
          const dateParts = pendingAction.date.split('-')
          const formattedDate = `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}`
          pendingActionDetails = `Editar reunião comercial de ID ${pendingAction.presentationId} para: Título: "${pendingAction.title}", Dia: ${formattedDate}, das ${pendingAction.startTime} às ${pendingAction.endTime} (Escopo: ${pendingAction.editScope === 'series' ? 'Série completa' : 'Apenas esta ocorrência'})`
        } else if (pendingAction.type === 'delete_presentation') {
          const dateParts = pendingAction.date.split('-')
          const formattedDate = `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}`
          pendingActionDetails = `Excluir a reunião comercial de ID ${pendingAction.presentationId} ("${pendingAction.title}" em ${formattedDate} às ${pendingAction.startTime}) com deleteParticipants: ${pendingAction.deleteParticipants} e deleteScope: ${pendingAction.deleteScope === 'series' ? 'Série completa' : 'Apenas esta ocorrência'}`
        } else if (pendingAction.type === 'move_and_delete_presentation') {
          const sDateParts = pendingAction.sourceDate.split('-')
          const sFormattedDate = `${sDateParts[2]}/${sDateParts[1]}/${sDateParts[0]}`
          const tDateParts = pendingAction.targetDate.split('-')
          const tFormattedDate = `${tDateParts[2]}/${tDateParts[1]}/${tDateParts[0]}`
          pendingActionDetails = `Mover participantes da reunião comercial de ID ${pendingAction.sourcePresentationId} ("${pendingAction.sourceTitle}" em ${sFormattedDate} às ${pendingAction.sourceStartTime}) para a reunião de ID ${pendingAction.targetPresentationId} ("${pendingAction.targetTitle}" em ${tFormattedDate} às ${pendingAction.targetStartTime}) e depois excluir a de origem`
        } else if (pendingAction.type === 'update_participant_link_status') {
          const statusLabel = pendingAction.status ? 'enviado' : 'pendente'
          const dateParts = pendingAction.presentationDate.split('-')
          const formattedDate = `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}`
          pendingActionDetails = `Marcar o link do participante "${pendingAction.clientName}" na reunião "${pendingAction.presentationTitle}" em ${formattedDate} às ${pendingAction.presentationTime.slice(0, 5)} como "${statusLabel}"`
        } else if (pendingAction.type === 'create_personal_reminder') {
          const date = new Date(pendingAction.disparar_em)
          const spStr = date.toLocaleString('sv', { timeZone: TIME_ZONE }).replace(' ', 'T')
          const datePart = spStr.slice(0, 10).split('-').reverse().join('/')
          const timePart = spStr.slice(11, 16)
          pendingActionDetails = `Criar lembrete pessoal "${pendingAction.mensagem}" para o dia ${datePart} às ${timePart}`
        } else if (pendingAction.type === 'update_client') {
          const changes: string[] = []
          if (pendingAction.newData.nome !== pendingAction.oldData.nome) changes.push(`Nome para "${pendingAction.newData.nome}"`)
          if (pendingAction.newData.telefone !== pendingAction.oldData.telefone) changes.push(`Telefone para "${pendingAction.newData.telefone}"`)
          if (pendingAction.newData.agencia !== pendingAction.oldData.agencia) changes.push(`Agência para "${pendingAction.newData.agencia || '(vazio)'}"`)
          pendingActionDetails = `Atualizar dados do cliente ID ${pendingAction.clientId}: ${changes.join(', ')}`
        } else if (pendingAction.type === 'update_participation_observation') {
          const actionText = pendingAction.newObservacao ? `para "${pendingAction.newObservacao}"` : 'como vazia'
          pendingActionDetails = `Atualizar a observação de "${pendingAction.clientName}" na reunião "${pendingAction.presentationTitle}" ${actionText}`
        } else if (pendingAction.type === 'delete_client') {
          pendingActionDetails = `Excluir o cliente "${pendingAction.clientName}" (ID: ${pendingAction.clientId})`
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
            },
            isRecurring: {
              type: 'boolean',
              description: 'Indica se a reunião possui recorrência semanal'
            },
            recurringDays: {
              type: 'array',
              items: {
                type: 'string',
                enum: ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU']
              },
              description: 'Dias da semana da recorrência'
            },
            recurrenceEndOption: {
              type: 'string',
              enum: ['never', 'date'],
              description: 'Opção de término da recorrência'
            },
            recurrenceEndDate: {
              type: 'string',
              description: 'Data de término da recorrência no formato YYYY-MM-DD'
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
      },
      {
        type: 'function',
        name: 'prepare_update_presentation',
        description: 'Salva uma ação pendente de editar uma reunião comercial no banco de dados.',
        parameters: {
          type: 'object',
          properties: {
            presentationId: {
              type: 'integer',
              description: 'ID da reunião comercial a ser editada'
            },
            title: {
              type: 'string',
              description: 'Novo título opcional da reunião comercial'
            },
            date: {
              type: 'string',
              description: 'Nova data opcional no formato YYYY-MM-DD'
            },
            startTime: {
              type: 'string',
              description: 'Novo horário de início opcional no formato HH:MM'
            },
            endTime: {
              type: 'string',
              description: 'Novo horário de término opcional no formato HH:MM'
            },
            editScope: {
              type: 'string',
              description: 'Escopo de edição para reuniões recorrentes: "occurrence" ou "series"'
            }
          },
          required: ['presentationId'],
          additionalProperties: false
        }
      },
      {
        type: 'function',
        name: 'confirm_update_presentation',
        description: 'Efetiva a edição da reunião comercial da ação pendente no Google Agenda e banco de dados.',
        parameters: {
          type: 'object',
          properties: {},
          required: [],
          additionalProperties: false
        }
      },
      {
        type: 'function',
        name: 'cancel_update_presentation',
        description: 'Cancela e descarta a ação pendente de edição de reunião atual.',
        parameters: {
          type: 'object',
          properties: {},
          required: [],
          additionalProperties: false
        }
      },
      {
        type: 'function',
        name: 'prepare_delete_presentation',
        description: 'Salva uma ação pendente de excluir uma reunião comercial no banco de dados.',
        parameters: {
          type: 'object',
          properties: {
            presentationId: {
              type: 'integer',
              description: 'ID da reunião comercial a ser excluída'
            },
            deleteParticipants: {
              type: 'boolean',
              description: 'Se verdadeiro, exclui os participantes da reunião'
            },
            deleteScope: {
              type: 'string',
              description: 'Escopo de exclusão para reuniões recorrentes: "occurrence" ou "series"'
            }
          },
          required: ['presentationId', 'deleteParticipants'],
          additionalProperties: false
        }
      },
      {
        type: 'function',
        name: 'confirm_delete_presentation',
        description: 'Efetiva a exclusão da reunião comercial da ação pendente no Google Agenda e banco de dados.',
        parameters: {
          type: 'object',
          properties: {},
          required: [],
          additionalProperties: false
        }
      },
      {
        type: 'function',
        name: 'cancel_delete_presentation',
        description: 'Cancela e descarta a ação pendente de exclusão de reunião atual.',
        parameters: {
          type: 'object',
          properties: {},
          required: [],
          additionalProperties: false
        }
      },
      {
        type: 'function',
        name: 'prepare_move_and_delete_presentation',
        description: 'Salva uma ação pendente de mover participantes de uma reunião de origem para uma de destino e excluir a de origem.',
        parameters: {
          type: 'object',
          properties: {
            sourcePresentationId: {
              type: 'integer',
              description: 'ID da reunião de origem'
            },
            targetPresentationId: {
              type: 'integer',
              description: 'ID da reunião de destino'
            }
          },
          required: ['sourcePresentationId', 'targetPresentationId'],
          additionalProperties: false
        }
      },
      {
        type: 'function',
        name: 'confirm_move_and_delete_presentation',
        description: 'Efetiva a movimentação de participantes e exclusão da reunião de origem da ação pendente.',
        parameters: {
          type: 'object',
          properties: {},
          required: [],
          additionalProperties: false
        }
      },
      {
        type: 'function',
        name: 'cancel_move_and_delete_presentation',
        description: 'Cancela e descarta a ação pendente de mover participantes e excluir.',
        parameters: {
          type: 'object',
          properties: {},
          required: [],
          additionalProperties: false
        }
      },
      {
        type: 'function',
        name: 'prepare_update_participant_link_status',
        description: 'Salva uma ação pendente de atualizar o status de envio do link (link_enviado) de um participante.',
        parameters: {
          type: 'object',
          properties: {
            participantId: {
              type: 'integer',
              description: 'ID da participação do cliente (id retornado por list_participants)'
            },
            status: {
              type: 'boolean',
              description: 'O novo status de link_enviado (true para enviado, false para pendente)'
            }
          },
          required: ['participantId', 'status'],
          additionalProperties: false
        }
      },
      {
        type: 'function',
        name: 'confirm_update_participant_link_status',
        description: 'Efetiva a alteração do status de link_enviado da ação pendente no banco de dados.',
        parameters: {
          type: 'object',
          properties: {},
          required: [],
          additionalProperties: false
        }
      },
      {
        type: 'function',
        name: 'cancel_update_participant_link_status',
        description: 'Cancela e descarta a ação pendente de alterar o status de link_enviado do participante.',
        parameters: {
          type: 'object',
          properties: {},
          required: [],
          additionalProperties: false
        }
      },
      {
        type: 'function',
        name: 'prepare_create_personal_reminder',
        description: 'Salva uma ação pendente de criar um lembrete pessoal no banco de dados.',
        parameters: {
          type: 'object',
          properties: {
            mensagem: {
              type: 'string',
              description: 'Texto/conteúdo do lembrete pessoal'
            },
            data: {
              type: 'string',
              description: 'Data de disparo no formato YYYY-MM-DD'
            },
            horario: {
              type: 'string',
              description: 'Horário de disparo no formato HH:MM'
            }
          },
          required: ['mensagem', 'data', 'horario'],
          additionalProperties: false
        }
      },
      {
        type: 'function',
        name: 'confirm_create_personal_reminder',
        description: 'Efetiva a criação do lembrete pessoal da ação pendente no banco de dados.',
        parameters: {
          type: 'object',
          properties: {},
          required: [],
          additionalProperties: false
        }
      },
      {
        type: 'function',
        name: 'cancel_create_personal_reminder',
        description: 'Cancela e descarta a ação pendente de criação de lembrete pessoal.',
        parameters: {
          type: 'object',
          properties: {},
          required: [],
          additionalProperties: false
        }
      },
      {
        type: 'function',
        name: 'list_personal_reminders',
        description: 'Lista os lembretes pessoais pendentes/futuros do usuário, com filtros opcionais de data.',
        parameters: {
          type: 'object',
          properties: {
            startDate: {
              type: 'string',
              description: 'Filtro de data inicial no formato YYYY-MM-DD (inclusive)'
            },
            endDate: {
              type: 'string',
              description: 'Filtro de data final no formato YYYY-MM-DD (inclusive)'
            }
          },
          required: [],
          additionalProperties: false
        }
      },
      {
        type: 'function',
        name: 'prepare_update_client',
        description: 'Salva uma ação pendente de atualizar dados cadastrais de um cliente.',
        parameters: {
          type: 'object',
          properties: {
            clientId: {
              type: 'integer',
              description: 'ID do cliente a ser atualizado'
            },
            nome: {
              type: 'string',
              description: 'Novo nome do cliente (opcional)'
            },
            telefone: {
              type: 'string',
              description: 'Novo telefone do cliente (opcional)'
            },
            agencia: {
              type: 'string',
              description: 'Nova agência do cliente (opcional)'
            }
          },
          required: ['clientId'],
          additionalProperties: false
        }
      },
      {
        type: 'function',
        name: 'confirm_update_client',
        description: 'Efetiva a atualização dos dados cadastrais do cliente da ação pendente no banco de dados.',
        parameters: {
          type: 'object',
          properties: {},
          required: [],
          additionalProperties: false
        }
      },
      {
        type: 'function',
        name: 'cancel_update_client',
        description: 'Cancela e descarta a ação pendente de atualizar o cliente.',
        parameters: {
          type: 'object',
          properties: {},
          required: [],
          additionalProperties: false
        }
      },
      {
        type: 'function',
        name: 'prepare_update_participation_observation',
        description: 'Salva uma ação pendente de atualizar a observação de uma participação de participante.',
        parameters: {
          type: 'object',
          properties: {
            participationId: {
              type: 'integer',
              description: 'ID da participação a ser atualizada'
            },
            observacao: {
              type: 'string',
              description: 'Texto da nova observação. Envie vazio ("") ou null para limpar a observacao atual.'
            }
          },
          required: ['participationId'],
          additionalProperties: false
        }
      },
      {
        type: 'function',
        name: 'confirm_update_participation_observation',
        description: 'Efetiva a atualização da observação da participação da ação pendente no banco de dados.',
        parameters: {
          type: 'object',
          properties: {},
          required: [],
          additionalProperties: false
        }
      },
      {
        type: 'function',
        name: 'cancel_update_participation_observation',
        description: 'Cancela e descarta a ação pendente de atualizar a observação do participante.',
        parameters: {
          type: 'object',
          properties: {},
          required: [],
          additionalProperties: false
        }
      },
      {
        type: 'function',
        name: 'prepare_delete_client',
        description: 'Salva uma ação pendente de inativação/exclusão lógica de um cliente.',
        parameters: {
          type: 'object',
          properties: {
            clientId: {
              type: 'integer',
              description: 'ID do cliente a ser excluído logicamente'
            }
          },
          required: ['clientId'],
          additionalProperties: false
        }
      },
      {
        type: 'function',
        name: 'confirm_delete_client',
        description: 'Efetiva a inativação/exclusão lógica do cliente da ação pendente no banco de dados.',
        parameters: {
          type: 'object',
          properties: {},
          required: [],
          additionalProperties: false
        }
      },
      {
        type: 'function',
        name: 'cancel_delete_client',
        description: 'Cancela e descarta a ação pendente de excluir/inativar o cliente.',
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
