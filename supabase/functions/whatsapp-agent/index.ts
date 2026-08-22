import { createClient } from 'npm:@supabase/supabase-js@2'
import { getAgentInstructions } from '../_shared/whatsappAgentInstructions.ts'
import { TIME_ZONE, getSaoPauloTodayDetails } from '../_shared/dateUtils.ts'
import { tools } from './toolsSchemas.ts'
import { handlePresentationTool } from './handlers/presentationsHandler.ts'
import { handleReminderTool } from './handlers/remindersHandler.ts'
import { handleClientTool } from './handlers/clientsHandler.ts'
import { handleParticipantTool } from './handlers/participantsHandler.ts'

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
  if (
    name === 'list_presentations' ||
    name === 'get_presentation_details' ||
    name === 'prepare_create_presentation' ||
    name === 'confirm_create_presentation' ||
    name === 'cancel_create_presentation' ||
    name === 'prepare_update_presentation' ||
    name === 'confirm_update_presentation' ||
    name === 'cancel_update_presentation' ||
    name === 'prepare_delete_presentation' ||
    name === 'confirm_delete_presentation' ||
    name === 'cancel_delete_presentation' ||
    name === 'prepare_move_and_delete_presentation' ||
    name === 'confirm_move_and_delete_presentation' ||
    name === 'cancel_move_and_delete_presentation'
  ) {
    return handlePresentationTool(supabaseAdmin, userId, googleIntegracaoId, name, args, contextData)
  }

  if (
    name === 'list_participants' ||
    name === 'prepare_schedule_participant' ||
    name === 'confirm_schedule_participant' ||
    name === 'cancel_schedule_participant' ||
    name === 'prepare_reschedule_participant' ||
    name === 'confirm_reschedule_participant' ||
    name === 'cancel_reschedule_participant' ||
    name === 'prepare_cancel_participant' ||
    name === 'confirm_cancel_participant' ||
    name === 'cancel_cancel_participant' ||
    name === 'prepare_reactivate_participant' ||
    name === 'confirm_reactivate_participant' ||
    name === 'cancel_reactivate_participant' ||
    name === 'prepare_update_participant_link_status' ||
    name === 'confirm_update_participant_link_status' ||
    name === 'cancel_update_participant_link_status' ||
    name === 'prepare_update_participation_observation' ||
    name === 'confirm_update_participation_observation' ||
    name === 'cancel_update_participation_observation'
  ) {
    return handleParticipantTool(supabaseAdmin, userId, googleIntegracaoId, name, args, contextData)
  }

  if (
    name === 'find_client' ||
    name === 'prepare_create_client' ||
    name === 'confirm_create_client' ||
    name === 'cancel_create_client' ||
    name === 'prepare_delete_client' ||
    name === 'confirm_delete_client' ||
    name === 'cancel_delete_client' ||
    name === 'prepare_update_client' ||
    name === 'confirm_update_client' ||
    name === 'cancel_update_client'
  ) {
    return handleClientTool(supabaseAdmin, userId, googleIntegracaoId, name, args, contextData)
  }

  if (
    name === 'prepare_create_personal_reminder' ||
    name === 'confirm_create_personal_reminder' ||
    name === 'cancel_create_personal_reminder' ||
    name === 'list_personal_reminders'
  ) {
    return handleReminderTool(supabaseAdmin, userId, name, args, contextData)
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
