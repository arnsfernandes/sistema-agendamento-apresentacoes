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
    const { presentationId } = await req.json()
    const numericId = Number(presentationId)
    if (!Number.isInteger(numericId) || numericId <= 0) {
      return new Response(
        JSON.stringify({ error: 'O parâmetro presentationId deve ser um número inteiro positivo.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Inicializa o cliente Supabase Admin
    const supabaseAdmin = createClient(
      supabaseUrl,
      supabaseServiceRoleKey
    )

    // 1. Busca a apresentação correspondente
    const { data: presentation, error: presentationError } = await supabaseAdmin
      .from('apresentacoes')
      .select('*')
      .eq('id', numericId)
      .single()

    if (presentationError || !presentation) {
      return new Response(
        JSON.stringify({ error: 'Apresentação não encontrada.' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 2. Se já existir Meet, retorna o link atual imediatamente
    if (presentation.meet_link) {
      return new Response(
        JSON.stringify({ meetLink: presentation.meet_link }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 3. Valida se os campos do evento Google estão preenchidos
    const googleEventId = presentation.google_event_id
    const googleCalendarId = presentation.google_calendar_id
    if (!googleEventId || !googleCalendarId) {
      return new Response(
        JSON.stringify({ error: 'A apresentação não possui evento ou agenda do Google associados.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 4. Obtém a integração Google por RPC
    const {
      data: integrationData,
      error: integrationError,
    } = await supabaseAdmin.rpc(
      'obter_google_refresh_token',
    )

    const integration = integrationData?.[0]

    if (integrationError || !integration || !integration.refresh_token || !integration.calendar_id) {
      return new Response(
        JSON.stringify({ error: 'Integração ou agenda do Google não configurada.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 5. Confirma que a agenda da integração é a mesma da apresentação
    if (integration.calendar_id !== googleCalendarId) {
      return new Response(
        JSON.stringify({ error: 'A agenda da integração Google não corresponde à agenda da apresentação.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 6. Renova o Access Token do Google Calendar
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

    // 7. Adiciona o Google Meet no evento do Google Calendar
    const patchResponse = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(googleCalendarId)}/events/${encodeURIComponent(googleEventId)}?conferenceDataVersion=1`,
      {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          conferenceData: {
            createRequest: {
              requestId: crypto.randomUUID(),
              conferenceSolutionKey: {
                type: 'hangoutsMeet',
              },
            },
          },
        }),
      }
    )

    if (!patchResponse.ok) {
      const errDetails = await patchResponse.text()
      console.error('Erro ao gerar conferência Google Meet:', errDetails)
      return new Response(
        JSON.stringify({ error: 'Não foi possível gerar a conferência Google Meet no evento.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const updatedEvent = await patchResponse.json()
    const meetLink = updatedEvent.hangoutLink || updatedEvent.conferenceData?.entryPoints?.[0]?.uri

    if (!meetLink) {
      return new Response(
        JSON.stringify({ error: 'O Google Agenda não retornou um link de conferência válido.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 8. Salva o novo meet_link no Supabase
    const { error: updateError } = await supabaseAdmin
      .from('apresentacoes')
      .update({ meet_link: meetLink })
      .eq('id', numericId)

    if (updateError) {
      console.error('Erro ao atualizar meet_link no Supabase:', updateError)
      return new Response(
        JSON.stringify({ error: 'Falha ao salvar o novo link do Meet no sistema.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 9. Retorna o link com sucesso
    return new Response(
      JSON.stringify({ meetLink }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (err) {
    console.error('Erro não tratado na Edge Function:', err)
    return new Response(
      JSON.stringify({ error: 'Ocorreu um erro interno inesperado.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
