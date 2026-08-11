import { createClient } from 'npm:@supabase/supabase-js@2'

const TIME_ZONE = 'America/Sao_Paulo'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
}

type GoogleCalendarEvent = {
  id?: string
  etag?: string
  status?: string
  summary?: string
  updated?: string
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

const jsonResponse = (
  body: Record<string, unknown>,
  status = 200,
) =>
  Response.json(body, {
    status,
    headers: corsHeaders,
  })

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
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const googleClientId = Deno.env.get('GOOGLE_CLIENT_ID')
    const googleClientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET')

    if (
      !supabaseUrl ||
      !anonKey ||
      !serviceRoleKey ||
      !googleClientId ||
      !googleClientSecret
    ) {
      return jsonResponse({ error: 'Configuração interna incompleta.' }, 500)
    }

    const authorization = req.headers.get('Authorization')
    if (!authorization?.startsWith('Bearer ')) {
      return jsonResponse({ error: 'Usuário não autenticado.' }, 401)
    }

    const accessToken = authorization.slice('Bearer '.length)
    const supabaseUser = createClient(supabaseUrl, anonKey)

    const {
      data: { user },
      error: userError,
    } = await supabaseUser.auth.getUser(accessToken)

    if (userError || !user) {
      return jsonResponse({ error: 'Sessão inválida ou expirada.' }, 401)
    }

    const body = await req.json().catch(() => null)
    const presentationId =
      typeof body?.presentationId === 'number'
        ? body.presentationId
        : Number(body?.presentationId)

    if (!Number.isInteger(presentationId) || presentationId <= 0) {
      return jsonResponse({ error: 'Informe um presentationId válido.' }, 400)
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey)

    // 1. Obter refresh token do Google
    const { data: integrationData, error: integrationError } = await supabaseAdmin.rpc(
      'obter_google_refresh_token',
      { p_user_id: user.id }
    )

    const integration = integrationData?.[0]
    if (integrationError || !integration?.refresh_token) {
      return jsonResponse({ error: 'A integração com o Google Agenda não está disponível.' }, 409)
    }

    // 2. Buscar dados locais da apresentação filtrando pelo contexto ativo
    const { data: presentation, error: presentationError } = await supabaseAdmin
      .from('apresentacoes')
      .select('id, titulo, google_event_id, google_calendar_id')
      .eq('id', presentationId)
      .eq('user_id', user.id)
      .eq('google_integracao_id', integration.google_integracao_id)
      .single()

    if (presentationError || !presentation) {
      return jsonResponse({ error: 'Apresentação não encontrada.' }, 404)
    }

    if (!presentation.google_event_id || !presentation.google_calendar_id) {
      return jsonResponse({ error: 'A apresentação não possui vínculo com o Google Agenda.' }, 409)
    }



    // Gerar token de acesso
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
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
    })

    const tokenData = await tokenResponse.json()
    if (!tokenResponse.ok || !tokenData?.access_token) {
      return jsonResponse({ error: 'Não foi possível acessar o Google Agenda. Reconecte a conta.' }, 502)
    }

    const googleAccessToken = tokenData.access_token as string
    const calendarId = presentation.google_calendar_id as string
    const eventId = presentation.google_event_id as string

    // Consultar evento no Google Calendar
    const eventUrl = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(
      calendarId,
    )}/events/${encodeURIComponent(eventId)}`

    const eventResponse = await fetch(eventUrl, {
      headers: { Authorization: `Bearer ${googleAccessToken}` },
    })

    if (eventResponse.status === 404 || eventResponse.status === 410) {
      return jsonResponse({ error: 'O evento não existe mais no Google Agenda.' }, 404)
    }

    const eventData = (await eventResponse.json()) as GoogleCalendarEvent
    if (!eventResponse.ok) {
      return jsonResponse({ error: 'Não foi possível consultar o evento no Google Agenda.' }, 502)
    }

    if (!eventData.start?.dateTime || !eventData.end?.dateTime) {
      return jsonResponse({ error: 'O evento não possui horário válido para ser corrigido pelo sistema.' }, 422)
    }

    const startParts = getGoogleDateTimeParts(eventData.start.dateTime)
    const endParts = getGoogleDateTimeParts(eventData.end.dateTime)

    return jsonResponse({
      success: true,
      event: {
        id: presentation.id,
        title: eventData.summary || presentation.titulo,
        date: startParts?.date || '',
        time: startParts?.time || '',
        timeEnd: endParts?.time || '',
        meetLink: getMeetLink(eventData),
        googleEventId: eventId,
        googleCalendarId: calendarId,
        etag: eventData.etag || null,
      },
    })
  } catch (error) {
    console.error('Erro ao consultar evento remoto:', error)
    return jsonResponse({ error: 'Erro interno ao processar a consulta.' }, 500)
  }
})
