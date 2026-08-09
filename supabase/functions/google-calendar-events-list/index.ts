import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const jsonResponse = (
  body: Record<string, unknown>,
  status = 200,
): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  })

const isValidDate = (value: unknown): value is string =>
  typeof value === 'string' &&
  /^\d{4}-\d{2}-\d{2}$/.test(value) &&
  !Number.isNaN(Date.parse(`${value}T00:00:00-03:00`))

type GoogleCalendarEvent = {
  id?: string
  status?: string
  summary?: string
  updated?: string
  recurringEventId?: string
  originalStartTime?: {
    dateTime?: string
    date?: string
  }
  hangoutLink?: string
  start?: {
    dateTime?: string
    date?: string
  }
  end?: {
    dateTime?: string
    date?: string
  }
  conferenceData?: {
    entryPoints?: Array<{
      entryPointType?: string
      uri?: string
    }>
  }
}

type GoogleEventsResponse = {
  items?: GoogleCalendarEvent[]
  nextPageToken?: string
  error?: {
    message?: string
  }
}

const getMeetLink = (event: GoogleCalendarEvent): string | null => {
  if (event.hangoutLink) {
    return event.hangoutLink
  }

  const videoEntryPoint = event.conferenceData?.entryPoints?.find(
    (entryPoint) => entryPoint.entryPointType === 'video',
  )

  return videoEntryPoint?.uri ?? null
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Método não permitido.' }, 405)
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')
    const supabaseServiceRoleKey = Deno.env.get(
      'SUPABASE_SERVICE_ROLE_KEY',
    )
    const googleClientId = Deno.env.get('GOOGLE_CLIENT_ID')
    const googleClientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET')

    if (
      !supabaseUrl ||
      !supabaseAnonKey ||
      !supabaseServiceRoleKey ||
      !googleClientId ||
      !googleClientSecret
    ) {
      return jsonResponse(
        { error: 'Configuração interna incompleta.' },
        500,
      )
    }

    const authorization = req.headers.get('Authorization')

    if (!authorization?.startsWith('Bearer ')) {
      return jsonResponse({ error: 'Usuário não autenticado.' }, 401)
    }

    const userAccessToken = authorization.slice('Bearer '.length)

    const supabaseUser = createClient(
      supabaseUrl,
      supabaseAnonKey,
    )

    const {
      data: { user },
      error: userError,
    } = await supabaseUser.auth.getUser(userAccessToken)

    if (userError || !user) {
      return jsonResponse({ error: 'Usuário não autenticado.' }, 401)
    }

    const body = await req.json().catch(() => null)
    const startDate = body?.startDate
    const endDate = body?.endDate

    if (!isValidDate(startDate) || !isValidDate(endDate)) {
      return jsonResponse(
        {
          error:
            'Informe startDate e endDate no formato YYYY-MM-DD.',
        },
        400,
      )
    }

    if (startDate >= endDate) {
      return jsonResponse(
        { error: 'endDate deve ser posterior a startDate.' },
        400,
      )
    }

    const supabaseAdmin = createClient(
      supabaseUrl,
      supabaseServiceRoleKey,
    )

    const {
      data: integrationData,
      error: integrationError,
    } = await supabaseAdmin.rpc('obter_google_refresh_token')

    const integration = integrationData?.[0]

    if (
      integrationError ||
      !integration?.refresh_token ||
      !integration?.calendar_id
    ) {
      return jsonResponse(
        {
          error:
            'A integração com o Google Agenda não está disponível.',
        },
        409,
      )
    }

    const tokenResponse = await fetch(
      'https://oauth2.googleapis.com/token',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: googleClientId,
          client_secret: googleClientSecret,
          refresh_token: integration.refresh_token,
          grant_type: 'refresh_token',
        }),
      },
    )

    const tokenData = await tokenResponse.json()

    if (!tokenResponse.ok || !tokenData?.access_token) {
      console.error(
        'Falha ao renovar token do Google:',
        tokenResponse.status,
        tokenData,
      )

      return jsonResponse(
        {
          error:
            'Não foi possível acessar o Google Agenda. Reconecte a conta.',
        },
        502,
      )
    }

    const googleAccessToken = tokenData.access_token as string
    const calendarId = integration.calendar_id as string

    const timeMin = `${startDate}T00:00:00-03:00`
    const timeMax = `${endDate}T00:00:00-03:00`

    const googleEvents: GoogleCalendarEvent[] = []
    let pageToken: string | undefined

    do {
      const params = new URLSearchParams({
        timeMin,
        timeMax,
        singleEvents: 'true',
        showDeleted: 'false',
        orderBy: 'startTime',
        maxResults: '2500',
        timeZone: 'America/Sao_Paulo',
        fields:
          'items(id,status,summary,updated,recurringEventId,originalStartTime,hangoutLink,start,end,conferenceData),nextPageToken',
      })

      if (pageToken) {
        params.set('pageToken', pageToken)
      }

      const eventsUrl =
        `https://www.googleapis.com/calendar/v3/calendars/` +
        `${encodeURIComponent(calendarId)}/events?${params.toString()}`

      const eventsResponse = await fetch(eventsUrl, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${googleAccessToken}`,
        },
      })

      const eventsData =
        (await eventsResponse.json()) as GoogleEventsResponse

      if (!eventsResponse.ok) {
        console.error(
          'Falha ao listar eventos do Google:',
          eventsResponse.status,
          eventsData,
        )

        return jsonResponse(
          {
            error:
              eventsData.error?.message ||
              'Não foi possível consultar os eventos do Google Agenda.',
          },
          502,
        )
      }

      googleEvents.push(...(eventsData.items ?? []))
      pageToken = eventsData.nextPageToken
    } while (pageToken)

    const events = googleEvents
      .filter((event) => {
        if (event.status === 'cancelled') return false
        if (!event.id) return false

        if (!event.start?.dateTime || !event.end?.dateTime) {
          return false
        }

        return true
      })
      .map((event) => ({
        googleEventId: event.id as string,
        googleRecurringEventId: event.recurringEventId ?? null,
        googleOriginalStartAt: event.originalStartTime?.dateTime ?? null,
        title: event.summary?.trim() || 'Apresentação sem título',
        startDateTime: event.start?.dateTime as string,
        endDateTime: event.end?.dateTime as string,
        meetLink: getMeetLink(event),
        googleUpdatedAt: event.updated ?? null,
      }))

    return jsonResponse({
      calendarId,
      startDate,
      endDate,
      events,
      total: events.length,
    })
  } catch (error) {
    console.error('Erro inesperado ao listar eventos:', error)

    return jsonResponse(
      {
        error:
          'Não foi possível consultar os eventos do Google Agenda.',
      },
      500,
    )
  }
})
