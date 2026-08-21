import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Trata requisições CORS preflight (OPTIONS)
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  // Aceita apenas requisições POST além do OPTIONS
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Método não permitido. Apenas requisições POST são aceitas.' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  try {
    // 0. Validação das variáveis de ambiente necessárias
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const googleClientId = Deno.env.get('GOOGLE_CLIENT_ID')
    const googleClientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET')

    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey || !googleClientId || !googleClientSecret) {
      console.error('Configuração de ambiente incompleta.')
      return new Response(
        JSON.stringify({ error: 'Erro de configuração interna da função.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Autorização ausente nos cabeçalhos da requisição.' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    let user: any = null
    const clientAccessToken = authHeader.replace('Bearer ', '')

    if (clientAccessToken === supabaseServiceRoleKey) {
      const targetUserId = req.headers.get('x-user-id')
      if (!targetUserId) {
        return new Response(
          JSON.stringify({ error: 'Cabeçalho x-user-id é obrigatório para chamadas de service role.' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      user = { id: targetUserId }
    } else {
      // Inicializa o cliente Supabase com a role do usuário para validação de sessão
      const supabaseClient = createClient(
        supabaseUrl,
        supabaseAnonKey,
        { global: { headers: { Authorization: authHeader } } }
      )

      // Valida se o usuário está autenticado
      const { data: { user: authUser }, error: authError } = await supabaseClient.auth.getUser()
      if (authError || !authUser) {
        return new Response(
          JSON.stringify({ error: 'Usuário não autenticado.' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      user = authUser
    }

    // Obtém os parâmetros e valida
    const { sourcePresentationId, targetPresentationId } = await req.json()
    const sourceId = Number(sourcePresentationId)
    const targetId = Number(targetPresentationId)

    if (!Number.isInteger(sourceId) || sourceId <= 0 || !Number.isInteger(targetId) || targetId <= 0) {
      return new Response(
        JSON.stringify({ error: 'Os parâmetros de ID de origem e destino devem ser números inteiros positivos.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (sourceId === targetId) {
      return new Response(
        JSON.stringify({ error: 'A apresentação de origem e de destino devem ser diferentes.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Inicializa o cliente Supabase Admin
    const supabaseAdmin = createClient(
      supabaseUrl,
      supabaseServiceRoleKey
    )

    // 1. Obtém a integração Google por RPC para validação do contexto
    const {
      data: integrationData,
      error: integrationError,
    } = await supabaseAdmin.rpc(
      'obter_google_refresh_token',
      { p_user_id: user.id }
    )

    const integration = integrationData?.[0]

    if (integrationError || !integration || !integration.refresh_token || !integration.calendar_id) {
      return new Response(
        JSON.stringify({ error: 'Integração ou agenda do Google não configurada.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 2. Busca apresentações de origem e destino filtrando pelo contexto ativo
    const { data: sourcePresentation, error: sourceError } = await supabaseAdmin
      .from('apresentacoes')
      .select('*')
      .eq('id', sourceId)
      .eq('user_id', user.id)
      .eq('google_integracao_id', integration.google_integracao_id)
      .single()

    if (sourceError || !sourcePresentation) {
      return new Response(
        JSON.stringify({ error: 'Apresentação de origem não encontrada.' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { data: targetPresentation, error: targetError } = await supabaseAdmin
      .from('apresentacoes')
      .select('*')
      .eq('id', targetId)
      .eq('user_id', user.id)
      .eq('google_integracao_id', integration.google_integracao_id)
      .single()

    if (targetError || !targetPresentation) {
      return new Response(
        JSON.stringify({ error: 'Apresentação de destino não encontrada.' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const getSaoPauloDateTime = () => {
      const formatter = new Intl.DateTimeFormat('sv-SE', {
        timeZone: 'America/Sao_Paulo',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hourCycle: 'h23'
      })
      return formatter.format(new Date()).replace(' ', 'T')
    }

    const currentSaoPauloTime = getSaoPauloDateTime()

    // 3. Valida se a apresentação de origem já começou
    const sourceTime = sourcePresentation.horario || '00:00'
    const sourceParts = sourceTime.split(':')
    const sourceNormalizedTime = sourceParts.length === 2 ? `${sourceTime}:00` : sourceTime
    const sourceDateTimeStr = `${sourcePresentation.data}T${sourceNormalizedTime}`

    if (currentSaoPauloTime >= sourceDateTimeStr) {
      return new Response(
        JSON.stringify({ error: 'A apresentação de origem já iniciou. Não é possível realizar a movimentação.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 4. Valida se a apresentação de destino é futura
    const targetTime = targetPresentation.horario || '00:00'
    const targetParts = targetTime.split(':')
    const targetNormalizedTime = targetParts.length === 2 ? `${targetTime}:00` : targetTime
    const targetDateTimeStr = `${targetPresentation.data}T${targetNormalizedTime}`

    if (currentSaoPauloTime >= targetDateTimeStr) {
      return new Response(
        JSON.stringify({ error: 'A apresentação de destino deve ser uma data/hora no futuro.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 5. Busca participações da origem
    const { data: sourceParticipations, error: partsError } = await supabaseAdmin
      .from('participacoes')
      .select('*')
      .eq('apresentacao_id', sourceId)

    if (partsError) {
      return new Response(
        JSON.stringify({ error: 'Erro ao buscar participantes da origem.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Bloqueia se a apresentação de origem não possuir nenhuma participação
    if (!sourceParticipations || sourceParticipations.length === 0) {
      return new Response(
        JSON.stringify({ error: 'A apresentação de origem não possui participantes para mover.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Bloqueia se houver qualquer participação cancelada na origem
    const hasCancelled = sourceParticipations.some(p => p.status === 'cancelado')
    if (hasCancelled) {
      return new Response(
        JSON.stringify({ error: 'Existem participantes cancelados na apresentação de origem. Reative-os primeiro para prosseguir.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Bloqueia se qualquer cliente da origem já estiver no destino (seja ativo ou cancelado)
    const clientIds = sourceParticipations.map(p => p.cliente_id)

    const { data: targetParticipations, error: targetPartsError } = await supabaseAdmin
      .from('participacoes')
      .select('cliente_id')
      .eq('apresentacao_id', targetId)
      .in('cliente_id', clientIds)

    if (targetPartsError) {
      return new Response(
        JSON.stringify({ error: 'Erro ao validar duplicidades no destino.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (targetParticipations && targetParticipations.length > 0) {
      return new Response(
        JSON.stringify({ error: 'Algum dos participantes já está vinculado à apresentação de destino.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 6. Valida se os campos do evento Google estão preenchidos para a de origem e de destino
    const googleEventId = sourcePresentation.google_event_id
    const googleCalendarId = sourcePresentation.google_calendar_id
    if (!googleEventId || !googleCalendarId) {
      return new Response(
        JSON.stringify({ error: 'A apresentação de origem não possui evento ou agenda do Google associados.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const targetEventId = targetPresentation.google_event_id
    const targetCalendarId = targetPresentation.google_calendar_id
    if (!targetEventId || !targetCalendarId) {
      return new Response(
        JSON.stringify({ error: 'A apresentação de destino não possui evento ou agenda do Google associados.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Confirma que origem, destino e integração ativa possuem o mesmo google_calendar_id
    if (integration.calendar_id !== googleCalendarId || integration.calendar_id !== targetCalendarId) {
      return new Response(
        JSON.stringify({ error: 'A agenda da integração Google não corresponde às agendas das apresentações.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 7. Renova o Access Token do Google Calendar
    const refreshResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: googleClientId,
        client_secret: googleClientSecret,
        refresh_token: integration.refresh_token,
        grant_type: 'refresh_token',
      })
    })

    if (!refreshResponse.ok) {
      const errDetails = await refreshResponse.text()
      console.error('Erro ao renovar token Google:', errDetails)
      return new Response(
        JSON.stringify({ error: 'Falha ao renovar credenciais da integração com o Google.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const refreshData = await refreshResponse.json()
    const accessToken = refreshData?.access_token

    if (!accessToken) {
      console.error('Token de acesso não retornado após a renovação.')
      return new Response(
        JSON.stringify({ error: 'Falha ao obter credenciais válidas do Google.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 8. Exclui o evento no Google Agenda (Origem)
    const deleteResponse = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(googleCalendarId)}/events/${encodeURIComponent(googleEventId)}`,
      {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        }
      }
    )

    // Trata respostas 404 e 410 como sucesso (evento já excluído)
    if (!deleteResponse.ok && deleteResponse.status !== 404 && deleteResponse.status !== 410) {
      const errDetails = await deleteResponse.text()
      console.error('Erro na exclusão do evento Google:', errDetails)
      return new Response(
        JSON.stringify({ error: 'Não foi possível excluir o evento correspondente no Google Agenda.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 9. Executa a transação atômica de mover participações e excluir apresentação via RPC
    const { data: movedCount, error: transactionError } = await supabaseAdmin
      .rpc('mover_participantes_e_excluir_apresentacao', {
        source_id: sourceId,
        target_id: targetId
      })

    if (transactionError || movedCount === null || movedCount === undefined) {
      console.error('Erro na transação de banco (RPC):', transactionError)
      return new Response(
        JSON.stringify({ error: 'Não foi possível mover os participantes e excluir a apresentação.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (err) {
    console.error('Erro não tratado na Edge Function:', err)
    return new Response(
      JSON.stringify({ error: 'Erro interno ao processar a operação.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
