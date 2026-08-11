import { createClient } from 'npm:@supabase/supabase-js@2'

const TIME_ZONE = 'America/Sao_Paulo'

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

const getGoogleDateTimeParts = (dateTime: string | undefined) => {
  if (!dateTime) return null
  const parsed = new Date(dateTime)
  if (Number.isNaN(parsed.getTime())) return null

  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(parsed)

  const values = Object.fromEntries(parts.map((p) => [p.type, p.value]))
  return {
    date: `${values.year}-${values.month}-${values.day}`,
    time: `${values.hour}:${values.minute}`,
  }
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

    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey)

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
        { error: 'Informe startDate e endDate no formato YYYY-MM-DD.' },
        400,
      )
    }

    if (startDate >= endDate) {
      return jsonResponse(
        { error: 'endDate deve ser posterior a startDate.' },
        400,
      )
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey)

    const {
      data: integrationData,
      error: integrationError,
    } = await supabaseAdmin.rpc('obter_google_refresh_token', { p_user_id: user.id })

    const integration = integrationData?.[0]

    if (
      integrationError ||
      !integration?.refresh_token ||
      !integration?.calendar_id
    ) {
      return jsonResponse(
        { error: 'A integração com o Google Agenda não está disponível.' },
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
      return jsonResponse(
        { error: 'Não foi possível acessar o Google Agenda. Reconecte a conta.' },
        502,
      )
    }

    const googleAccessToken = tokenData.access_token as string
    const calendarId = integration.calendar_id as string

    // 1. Listar eventos no Google
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
          'items(id,status,summary,updated,recurringEventId,hangoutLink,start,end,conferenceData),nextPageToken',
      })

      if (pageToken) {
        params.set('pageToken', pageToken)
      }

      const eventsUrl =
        `https://www.googleapis.com/calendar/v3/calendars/` +
        `${encodeURIComponent(calendarId)}/events?${params.toString()}`

      const eventsResponse = await fetch(eventsUrl, {
        headers: { Authorization: `Bearer ${googleAccessToken}` },
      })

      const eventsData =
        (await eventsResponse.json()) as GoogleEventsResponse

      if (!eventsResponse.ok) {
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

    // Filtra eventos excluídos ou de dia inteiro
    const activeGoogleEvents = googleEvents.filter(
      (e) =>
        e.status !== 'cancelled' &&
        e.id &&
        e.start?.dateTime &&
        e.end?.dateTime,
    )

    // 2. Listar apresentações locais no mesmo período
    const { data: localPresentations, error: localError } =
      await supabaseAdmin
        .from('apresentacoes')
        .select('*')
        .eq('google_calendar_id', calendarId)
        .eq('user_id', user.id)
        .eq('google_integracao_id', integration.google_integracao_id)
        .gte('data', startDate)
        .lt('data', endDate)

    if (localError) {
      throw localError
    }

    const equal: Record<string, unknown>[] = []
    const changed: Record<string, unknown>[] = []
    const googleOnly: Record<string, unknown>[] = []
    const deletedOnGoogle: Record<string, unknown>[] = []
    const movedOutsidePeriod: Record<string, unknown>[] = []
    const verificationErrors: Record<string, unknown>[] = []

    const localMatchedIds = new Set<string>()
    const googleMatchedIds = new Set<string>()

    // Comparar locais vs Google mapeados
    for (const local of localPresentations || []) {
      if (!local.google_event_id) continue

      const remote = activeGoogleEvents.find(
        (e) => e.id === local.google_event_id,
      )

      if (remote) {
        localMatchedIds.add(local.google_event_id)
        googleMatchedIds.add(remote.id as string)

        const remoteStart = getGoogleDateTimeParts(remote.start?.dateTime)
        const remoteEnd = getGoogleDateTimeParts(remote.end?.dateTime)

        const localStartStr = local.horario.slice(0, 5)
        const localEndStr = local.horario_fim.slice(0, 5)
        const remoteStartStr = remoteStart?.time || ''
        const remoteEndStr = remoteEnd?.time || ''
        const diffFields: string[] = []

        if (local.titulo.trim() !== (remote.summary || '').trim()) {
          diffFields.push('title')
        }
        if (local.data !== remoteStart?.date) {
          diffFields.push('date')
        }
        if (localStartStr !== remoteStartStr) {
          diffFields.push('time')
        }
        if (localEndStr !== remoteEndStr) {
          diffFields.push('timeEnd')
        }
        if ((local.meet_link || '') !== (getMeetLink(remote) || '')) {
          diffFields.push('meetLink')
        }

        const dataPayload = {
          presentationId: local.id,
          googleEventId: local.google_event_id,
          local: {
            title: local.titulo,
            date: local.data,
            time: localStartStr,
            timeEnd: localEndStr,
            meetLink: local.meet_link,
            googleUpdatedAt: local.google_event_updated_at,
          },
          remote: {
            title: remote.summary || '',
            date: remoteStart?.date || '',
            time: remoteStartStr,
            timeEnd: remoteEndStr,
            meetLink: getMeetLink(remote),
            googleUpdatedAt: remote.updated || null,
          },
        }

        if (diffFields.length > 0) {
          changed.push({
            ...dataPayload,
            diffFields,
          })
        } else {
          equal.push(dataPayload)
        }
      }
    }

    // Identificar googleOnly
    for (const remote of activeGoogleEvents) {
      if (!googleMatchedIds.has(remote.id as string)) {
        const remoteStart = getGoogleDateTimeParts(remote.start?.dateTime)
        const remoteEnd = getGoogleDateTimeParts(remote.end?.dateTime)

        googleOnly.push({
          googleEventId: remote.id,
          recurringEventId: remote.recurringEventId ?? null,
          title: remote.summary || 'Apresentação sem título',
          date: remoteStart?.date || '',
          time: remoteStart?.time || '',
          timeEnd: remoteEnd?.time || '',
          meetLink: getMeetLink(remote),
          googleUpdatedAt: remote.updated || null,
        })
      }
    }

    // Verificar locais não pareados no período (que podem ter sido excluídos ou movidos no Google)
    for (const local of localPresentations || []) {
      if (!local.google_event_id || localMatchedIds.has(local.google_event_id)) {
        continue
      }

      // Consulta individual no Google Calendar
      const eventUrl =
        `https://www.googleapis.com/calendar/v3/calendars/` +
        `${encodeURIComponent(calendarId)}/events/${encodeURIComponent(
          local.google_event_id,
        )}`

      const eventResponse = await fetch(eventUrl, {
        headers: { Authorization: `Bearer ${googleAccessToken}` },
      })

      const payload = {
        presentationId: local.id,
        googleEventId: local.google_event_id,
        title: local.titulo,
        date: local.data,
        time: local.horario.slice(0, 5),
      }

      if (eventResponse.status === 404 || eventResponse.status === 410) {
        deletedOnGoogle.push(payload)
        continue
      }

      const remoteEvent = (await eventResponse.json()) as GoogleCalendarEvent

      if (!eventResponse.ok) {
        verificationErrors.push({
          ...payload,
          errorMessage: remoteEvent.error?.message || 'Erro ao consultar o Google.',
        });
        continue
      }

      if (remoteEvent.status === 'cancelled') {
        deletedOnGoogle.push(payload)
      } else {
        const remoteStart = getGoogleDateTimeParts(remoteEvent.start?.dateTime)
        if (remoteStart) {
          movedOutsidePeriod.push({
            ...payload,
            newDate: remoteStart.date,
            newTime: remoteStart.time,
          })
        } else {
          verificationErrors.push({
            ...payload,
            errorMessage: 'Dados de data inválidos no evento retornado.',
          })
        }
      }
    }

    const summary = {
      equal: equal.length,
      changed: changed.length,
      googleOnly: googleOnly.length,
      deletedOnGoogle: deletedOnGoogle.length,
      movedOutsidePeriod: movedOutsidePeriod.length,
      verificationErrors: verificationErrors.length,
      total:
        equal.length +
        changed.length +
        googleOnly.length +
        deletedOnGoogle.length +
        movedOutsidePeriod.length +
        verificationErrors.length,
    }

    return jsonResponse({
      summary,
      equal,
      changed,
      googleOnly,
      deletedOnGoogle,
      movedOutsidePeriod,
      verificationErrors,
    })
  } catch (error) {
    console.error('Erro inesperado na prévia de sincronização:', error)
    return jsonResponse(
      { error: 'Não foi possível gerar a prévia de sincronização.' },
      500,
    )
  }
})
