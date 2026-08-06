import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authorization = req.headers.get('Authorization')

    if (!authorization?.startsWith('Bearer ')) {
      return Response.json(
        { error: 'Usuário não autenticado.' },
        { status: 401, headers: corsHeaders },
      )
    }

    const accessToken = authorization.replace('Bearer ', '')

    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const clientId = Deno.env.get('GOOGLE_CLIENT_ID')
    const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET')

    if (
      !supabaseUrl ||
      !anonKey ||
      !serviceRoleKey ||
      !clientId ||
      !clientSecret
    ) {
      throw new Error('Configuração incompleta.')
    }

    const supabaseUser = createClient(supabaseUrl, anonKey)

    const {
      data: { user },
      error: userError,
    } = await supabaseUser.auth.getUser(accessToken)

    if (userError || !user) {
      return Response.json(
        { error: 'Sessão inválida ou expirada.' },
        { status: 401, headers: corsHeaders },
      )
    }

    const supabaseAdmin = createClient(
      supabaseUrl,
      serviceRoleKey,
    )

    const {
      data: integrationData,
      error: integrationError,
    } = await supabaseAdmin.rpc(
      'obter_google_refresh_token',
    )

    if (integrationError) {
      console.error(integrationError)

      throw new Error(
        'Não foi possível consultar a integração.',
      )
    }

    const integration = integrationData?.[0]

    if (!integration?.refresh_token) {
      return Response.json(
        { error: 'Nenhuma conta Google está conectada.' },
        { status: 400, headers: corsHeaders },
      )
    }

    const tokenResponse = await fetch(
      'https://oauth2.googleapis.com/token',
      {
        method: 'POST',
        headers: {
          'Content-Type':
            'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          refresh_token: integration.refresh_token,
          grant_type: 'refresh_token',
        }),
      },
    )

    const tokenData = await tokenResponse.json()

    if (!tokenResponse.ok || !tokenData.access_token) {
      console.error(
        'Erro ao renovar acesso Google:',
        tokenData,
      )

      return Response.json(
        {
          error:
            'A conexão com o Google expirou ou foi revogada.',
        },
        { status: 401, headers: corsHeaders },
      )
    }

    const calendarsResponse = await fetch(
      'https://www.googleapis.com/calendar/v3/users/me/calendarList',
      {
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
        },
      },
    )

    const calendarsData = await calendarsResponse.json()

    if (!calendarsResponse.ok) {
      console.error(
        'Erro ao listar agendas:',
        calendarsData,
      )

      return Response.json(
        { error: 'Não foi possível listar as agendas.' },
        { status: 400, headers: corsHeaders },
      )
    }

    const calendars = (calendarsData.items || []).map(
      (calendar: Record<string, unknown>) => ({
        id: calendar.id,
        name:
          calendar.summaryOverride ||
          calendar.summary ||
          'Agenda sem nome',
        primary: Boolean(calendar.primary),
        accessRole: calendar.accessRole,
      }),
    )

    return Response.json(
      {
        googleEmail: integration.google_email,
        selectedCalendarId: integration.calendar_id,
        selectedCalendarName: integration.calendar_name,
        isResponsible:
          integration.responsavel_user_id === user.id,
        calendars,
      },
      { headers: corsHeaders },
    )
  } catch (error) {
    console.error(error)

    return Response.json(
      {
        error:
          'Não foi possível consultar as agendas.',
      },
      {
        status: 500,
        headers: corsHeaders,
      },
    )
  }
})