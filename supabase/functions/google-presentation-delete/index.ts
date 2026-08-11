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

    // Inicializa o cliente Supabase com a role do usuário para validação de sessão
    const supabaseClient = createClient(
      supabaseUrl,
      supabaseAnonKey,
      { global: { headers: { Authorization: authHeader } } }
    )

    // Valida se o usuário está autenticado
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser()
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Usuário não autenticado.' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Obtém o parâmetro presentationId e valida
    const { presentationId, deleteParticipants, deleteScope } = await req.json()
    const numericId = Number(presentationId)
    if (!Number.isInteger(numericId) || numericId <= 0) {
      return new Response(
        JSON.stringify({ error: 'O parâmetro presentationId deve ser um número inteiro positivo.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (deleteScope && deleteScope !== 'occurrence' && deleteScope !== 'series') {
      return new Response(
        JSON.stringify({ error: 'O parâmetro deleteScope deve ser "occurrence" ou "series".' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }


    // Inicializa o cliente Supabase Admin (bypassa RLS para as verificações necessárias)
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

    // 2. Busca a apresentação correspondente filtrando pelo contexto ativo
    const { data: presentation, error: presentationError } = await supabaseAdmin
      .from('apresentacoes')
      .select('*')
      .eq('id', numericId)
      .eq('user_id', user.id)
      .eq('google_integracao_id', integration.google_integracao_id)
      .single()

    if (presentationError || !presentation) {
      return new Response(
        JSON.stringify({ error: 'Apresentação não encontrada.' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (deleteScope === 'series') {
      const recurringId = presentation.google_recurring_event_id
      if (!recurringId) {
        return new Response(
          JSON.stringify({ error: 'Esta apresentação não faz parte de uma série recorrente.' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Busca todas as apresentações locais da série no contexto ativo
      const { data: seriesPresentations, error: seriesError } = await supabaseAdmin
        .from('apresentacoes')
        .select('id')
        .eq('google_recurring_event_id', recurringId)
        .eq('user_id', user.id)
        .eq('google_integracao_id', integration.google_integracao_id)

      if (seriesError || !seriesPresentations) {
        console.error('Erro ao buscar apresentações da série:', seriesError)
        return new Response(
          JSON.stringify({ error: 'Falha ao verificar as ocorrências da série.' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const seriesIds = seriesPresentations.map((p) => p.id)

      if (seriesIds.length > 0) {
        // Verifica se há participações vinculadas a essas apresentações
        const { count: participantCount, error: participationsError } = await supabaseAdmin
          .from('participacoes')
          .select('*', { count: 'exact', head: true })
          .in('apresentacao_id', seriesIds)

        if (participationsError) {
          console.error('Erro ao buscar participações da série:', participationsError)
          return new Response(
            JSON.stringify({ error: 'Erro ao verificar vínculos de participantes para a série.' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        if (participantCount && participantCount > 0) {
          return new Response(
            JSON.stringify({ error: 'Esta série possui participantes vinculados em suas ocorrências. É necessário mover ou excluir as participações de todas as ocorrências antes de excluir toda a série.' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
      }

    }

    // 2. Valida se a apresentação já começou (fuso America/Sao_Paulo)
    const timeToCheck = presentation.horario || '00:00'
    const parts = timeToCheck.split(':')
    const normalizedTime = parts.length === 2 ? `${timeToCheck}:00` : timeToCheck
    const meetingDateTimeStr = `${presentation.data}T${normalizedTime}`

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

    if (getSaoPauloDateTime() >= meetingDateTimeStr) {
      return new Response(
        JSON.stringify({ error: 'A apresentação já iniciou. Não é possível excluí-la.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 3. Valida se existe qualquer participação vinculada (inclusive cancelada)
    const { count, error: countError } = await supabaseAdmin
      .from('participacoes')
      .select('*', { count: 'exact', head: true })
      .eq('apresentacao_id', numericId)

    if (countError) {
      return new Response(
        JSON.stringify({ error: 'Erro ao verificar vínculos de participantes.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (count && count > 0 && !deleteParticipants) {
      return new Response(
        JSON.stringify({ error: 'Esta apresentação possui participantes. Resolva os participantes antes de excluir.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 4. Valida se os campos do evento Google estão preenchidos
    const googleEventId = deleteScope === 'series'
      ? presentation.google_recurring_event_id
      : presentation.google_event_id
    const googleCalendarId = presentation.google_calendar_id
    if (!googleEventId || !googleCalendarId) {
      return new Response(
        JSON.stringify({ error: 'A apresentação não possui evento ou agenda do Google associados.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 6. Confirma que a agenda da integração é a mesma da apresentação
    if (integration.calendar_id !== googleCalendarId) {
      return new Response(
        JSON.stringify({ error: 'A agenda da integração Google não corresponde à agenda da apresentação.' }),
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

    // 8. Exclui o evento no Google Agenda
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

    if (deleteScope === 'series') {
      const { error: dbDeleteError } = await supabaseAdmin
        .from('apresentacoes')
        .delete()
        .eq('google_recurring_event_id', googleEventId)
        .eq('user_id', user.id)
        .eq('google_integracao_id', integration.google_integracao_id)

      if (dbDeleteError) {
        console.error('Erro ao excluir apresentações da série no Supabase:', dbDeleteError)
        return new Response(
          JSON.stringify({ error: 'Falha crítica: A série foi excluída do Google Agenda, mas a remoção local no banco de dados falhou (pendente de reconciliação).' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      return new Response(
        JSON.stringify({ success: true, message: 'A série foi removida com sucesso do Google Agenda e do banco de dados local.' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 9. Exclui as participações vinculadas no Supabase (se solicitado)
    if (deleteParticipants) {
      const { error: participationsDeleteError } = await supabaseAdmin
        .from('participacoes')
        .delete()
        .eq('apresentacao_id', numericId)

      if (participationsDeleteError) {
        console.error('Erro ao excluir participações no Supabase:', participationsDeleteError)
        return new Response(
          JSON.stringify({ error: 'Falha ao excluir os vínculos de participantes da apresentação.' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    // 10. Exclui a apresentação no Supabase e confirma a remoção
    const { data: deletedRow, error: deleteError } = await supabaseAdmin
      .from('apresentacoes')
      .delete()
      .eq('id', numericId)
      .eq('user_id', user.id)
      .eq('google_integracao_id', integration.google_integracao_id)
      .select('id')
      .single()

    if (deleteError || !deletedRow) {
      console.error('Erro ao excluir no Supabase:', deleteError)
      return new Response(
        JSON.stringify({ error: 'Falha ao excluir o registro da apresentação no banco de dados.' }),
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
      JSON.stringify({ error: 'Erro interno ao processar a exclusão.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
