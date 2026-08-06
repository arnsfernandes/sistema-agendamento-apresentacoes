import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
}

const jsonResponse = (
  body: Record<string, unknown>,
  status = 200,
) =>
  Response.json(body, {
    status,
    headers: corsHeaders,
  })

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return jsonResponse(
      { error: 'Método não permitido.' },
      405,
    )
  }

  try {
    const authorization = req.headers.get('Authorization')

    if (!authorization?.startsWith('Bearer ')) {
      return jsonResponse(
        { error: 'Usuário não autenticado.' },
        401,
      )
    }

    const accessToken = authorization.replace('Bearer ', '')

    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')
    const serviceRoleKey = Deno.env.get(
      'SUPABASE_SERVICE_ROLE_KEY',
    )
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
      return jsonResponse(
        { error: 'Sessão inválida ou expirada.' },
        401,
      )
    }

    let requestBody: { calendarId?: string }

    try {
      requestBody = await req.json()
    } catch {
      return jsonResponse(
        { error: 'Dados da solicitação inválidos.' },
        400,
      )
    }

    const calendarId = requestBody.calendarId?.trim()

    if (!calendarId) {
      return jsonResponse(
        { error: 'Selecione uma agenda.' },
        400,
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
      console.error(
        'Erro ao consultar integração:',
        integrationError,
      )

      throw new Error(
        'Não foi possível consultar a integração.',
      )
    }

    const integration = integrationData?.[0]

    if (!integration?.refresh_token) {
      return jsonResponse(
        { error: 'Nenhuma conta Google está conectada.' },
        400,
      )
    }

    if (integration.responsavel_user_id !== user.id) {
      return jsonResponse(
        {
          error:
            'Somente o responsável pode selecionar a agenda.',
        },
        403,
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

      return jsonResponse(
        {
          error:
            'A conexão com o Google expirou ou foi revogada.',
        },
        401,
      )
    }

    const calendarResponse = await fetch(
      `https://www.googleapis.com/calendar/v3/users/me/calendarList/${encodeURIComponent(calendarId)}`,
      {
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
        },
      },
    )

    const calendarData = await calendarResponse.json()

    if (!calendarResponse.ok) {
      console.error(
        'Erro ao validar agenda:',
        calendarData,
      )

      return jsonResponse(
        {
          error:
            'A agenda selecionada não foi encontrada.',
        },
        400,
      )
    }

    const allowedRoles = ['owner', 'writer']

    if (!allowedRoles.includes(calendarData.accessRole)) {
      return jsonResponse(
        {
          error:
            'A agenda selecionada não permite criar ou editar eventos.',
        },
        400,
      )
    }

    const calendarName =
      calendarData.summaryOverride ||
      calendarData.summary ||
      'Agenda sem nome'

    const { error: saveError } =
      await supabaseAdmin.rpc(
        'salvar_agenda_google',
        {
          p_user_id: user.id,
          p_calendar_id: calendarData.id,
          p_calendar_name: calendarName,
        },
      )

    if (saveError) {
      console.error(
        'Erro ao salvar agenda:',
        saveError,
      )

      return jsonResponse(
        {
          error:
            'Não foi possível salvar a agenda selecionada.',
        },
        500,
      )
    }

    return jsonResponse({
      success: true,
      calendar: {
        id: calendarData.id,
        name: calendarName,
        primary: Boolean(calendarData.primary),
        accessRole: calendarData.accessRole,
      },
    })
  } catch (error) {
    console.error(error)

    return jsonResponse(
      {
        error:
          'Não foi possível selecionar a agenda.',
      },
      500,
    )
  }
})