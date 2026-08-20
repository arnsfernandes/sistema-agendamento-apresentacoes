import { createClient } from 'npm:@supabase/supabase-js@2'
import { scheduleParticipant, BusinessRuleError } from '../_shared/scheduling.ts'
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
    month: '2-digit',
    day: '2-digit',
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
    const { start_date, end_date } = args
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
    const { presentation_id } = args
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
      .select('id, status, clientes(nome, telefone, agencia)')
      .eq('apresentacao_id', presentation_id)
      .eq('status', 'ativo')

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
        const { data: cl } = await supabaseAdmin.from('clientes').select('nome, telefone').eq('id', pendingAction.client_id).maybeSingle()
        const { data: pr } = await supabaseAdmin.from('apresentacoes').select('titulo, data, horario').eq('id', pendingAction.presentation_id).maybeSingle()

        if (cl && pr) {
          const dateParts = pr.data.split('-')
          const formattedDate = `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}`
          pendingActionDetails = `Agendar participante "${cl.nome}" (Telefone: ${cl.telefone}) na reunião "${pr.titulo}" no dia ${formattedDate} às ${pr.horario.slice(0, 5)}`
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
        description: 'Lista os nomes dos participantes ativos confirmados para uma determinada apresentação.',
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
