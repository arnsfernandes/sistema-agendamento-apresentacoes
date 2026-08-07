import { createClient } from 'npm:@supabase/supabase-js@2'

const TIME_ZONE = 'America/Sao_Paulo'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
}

type GoogleEvent = {
  id?: string
  etag?: string
  status?: string
  summary?: string
  updated?: string
  hangoutLink?: string
  start?: {
    date?: string
    dateTime?: string
    timeZone?: string
  }
  end?: {
    date?: string
    dateTime?: string
    timeZone?: string
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

const normalizeTime = (value: unknown) => {
  if (typeof value !== 'string') return null

  const match = value.trim().match(/^(\d{2}):(\d{2})$/)

  if (!match) return null

  const hour = Number(match[1])
  const minute = Number(match[2])

  if (
    hour < 0 ||
    hour > 23 ||
    minute < 0 ||
    minute > 59
  ) {
    return null
  }

  return `${match[1]}:${match[2]}`
}

const isValidDate = (value: unknown) => {
  if (
    typeof value !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}$/.test(value)
  ) {
    return false
  }

  const [year, month, day] = value
    .split('-')
    .map(Number)

  const date = new Date(
    Date.UTC(year, month - 1, day),
  )

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  )
}

const getTomorrow = (dateValue: string) => {
  const [year, month, day] = dateValue
    .split('-')
    .map(Number)

  const date = new Date(
    Date.UTC(year, month - 1, day),
  )

  date.setUTCDate(date.getUTCDate() + 1)

  return date.toISOString().slice(0, 10)
}

const getSaoPauloNow = () => {
  const parts = new Intl.DateTimeFormat(
    'en-CA',
    {
      timeZone: TIME_ZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    },
  ).formatToParts(new Date())

  const values = Object.fromEntries(
    parts.map((part) => [
      part.type,
      part.value,
    ]),
  )

  return {
    date:
      `${values.year}-${values.month}-${values.day}`,
    time: `${values.hour}:${values.minute}`,
  }
}

const getGoogleDateTimeParts = (
  dateTime: string | undefined,
) => {
  if (!dateTime) return null

  const parsedDate = new Date(dateTime)

  if (Number.isNaN(parsedDate.getTime())) {
    return null
  }

  const parts = new Intl.DateTimeFormat(
    'en-CA',
    {
      timeZone: TIME_ZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    },
  ).formatToParts(parsedDate)

  const values = Object.fromEntries(
    parts.map((part) => [
      part.type,
      part.value,
    ]),
  )

  return {
    date:
      `${values.year}-${values.month}-${values.day}`,
    time: `${values.hour}:${values.minute}`,
  }
}

const hasRelevantGoogleChanges = (
  presentation: {
    titulo: string
    data: string
    horario: string
    horario_fim: string
    meet_link: string | null
  },
  googleEvent: GoogleEvent,
) => {
  const googleStart =
    getGoogleDateTimeParts(
      googleEvent.start?.dateTime,
    )

  const googleEnd =
    getGoogleDateTimeParts(
      googleEvent.end?.dateTime,
    )

  if (!googleStart || !googleEnd) {
    return true
  }

  const storedTitle =
    presentation.titulo.trim()

  const googleTitle =
    (googleEvent.summary || '').trim()

  const storedStart =
    presentation.horario.slice(0, 5)

  const storedEnd =
    presentation.horario_fim.slice(0, 5)

  const storedMeetLink =
    presentation.meet_link || ''

  const googleMeetLink =
    googleEvent.hangoutLink || ''

  return (
    storedTitle !== googleTitle ||
    presentation.data !== googleStart.date ||
    storedStart !== googleStart.time ||
    presentation.data !== googleEnd.date ||
    storedEnd !== googleEnd.time ||
    storedMeetLink !== googleMeetLink
  )
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsHeaders,
    })
  }

  if (req.method !== 'POST') {
    return jsonResponse(
      { error: 'Método não permitido.' },
      405,
    )
  }

  try {
    const authorization =
      req.headers.get('Authorization')

    if (
      !authorization?.startsWith('Bearer ')
    ) {
      return jsonResponse(
        { error: 'Usuário não autenticado.' },
        401,
      )
    }

    const accessToken =
      authorization.replace('Bearer ', '')

    const supabaseUrl =
      Deno.env.get('SUPABASE_URL')
    const anonKey =
      Deno.env.get('SUPABASE_ANON_KEY')
    const serviceRoleKey =
      Deno.env.get(
        'SUPABASE_SERVICE_ROLE_KEY',
      )
    const googleClientId =
      Deno.env.get('GOOGLE_CLIENT_ID')
    const googleClientSecret =
      Deno.env.get('GOOGLE_CLIENT_SECRET')

    if (
      !supabaseUrl ||
      !anonKey ||
      !serviceRoleKey ||
      !googleClientId ||
      !googleClientSecret
    ) {
      throw new Error(
        'Configuração incompleta.',
      )
    }

    const supabaseUser = createClient(
      supabaseUrl,
      anonKey,
    )

    const {
      data: { user },
      error: userError,
    } = await supabaseUser.auth.getUser(
      accessToken,
    )

    if (userError || !user) {
      return jsonResponse(
        {
          error:
            'Sessão inválida ou expirada.',
        },
        401,
      )
    }

    let body: Record<string, unknown>

    try {
      body = await req.json()
    } catch {
      return jsonResponse(
        {
          error:
            'Os dados enviados são inválidos.',
        },
        400,
      )
    }

    const presentationId =
      typeof body.presentationId === 'number'
        ? body.presentationId
        : Number(body.presentationId)

    const title =
      typeof body.title === 'string'
        ? body.title.trim()
        : ''

    const date =
      typeof body.date === 'string'
        ? body.date.trim()
        : ''

    const startTime = normalizeTime(
      body.startTime,
    )

    const endTime = normalizeTime(
      body.endTime,
    )

    const etag =
      typeof body.etag === 'string'
        ? body.etag
        : null

    if (
      !Number.isInteger(presentationId) ||
      presentationId <= 0
    ) {
      return jsonResponse(
        {
          error:
            'Apresentação inválida.',
        },
        400,
      )
    }

    if (!title) {
      return jsonResponse(
        {
          error:
            'Informe o título da apresentação.',
        },
        400,
      )
    }

    if (title.length > 80) {
      return jsonResponse(
        {
          error:
            'O título deve ter no máximo 80 caracteres.',
        },
        400,
      )
    }

    if (!isValidDate(date)) {
      return jsonResponse(
        {
          error:
            'Informe uma data válida.',
        },
        400,
      )
    }

    if (!startTime || !endTime) {
      return jsonResponse(
        {
          error:
            'Informe horários válidos de início e término.',
        },
        400,
      )
    }

    if (endTime <= startTime) {
      return jsonResponse(
        {
          error:
            'O horário final deve ser posterior ao horário inicial.',
        },
        400,
      )
    }

    const supabaseAdmin = createClient(
      supabaseUrl,
      serviceRoleKey,
    )

    const {
      data: presentation,
      error: presentationError,
    } = await supabaseAdmin
      .from('apresentacoes')
      .select(`
        id,
        titulo,
        data,
        horario,
        horario_fim,
        meet_link,
        google_event_id,
        google_calendar_id,
        google_event_updated_at
      `)
      .eq('id', presentationId)
      .single()

    if (
      presentationError ||
      !presentation
    ) {
      return jsonResponse(
        {
          error:
            'Apresentação não encontrada.',
        },
        404,
      )
    }

    if (
      !presentation.google_event_id ||
      !presentation.google_calendar_id
    ) {
      return jsonResponse(
        {
          error:
            'A apresentação não possui vínculo válido com o Google Agenda.',
        },
        409,
      )
    }

    const now = getSaoPauloNow()

    const currentStart =
      presentation.horario.slice(0, 5)

    const presentationAlreadyStarted =
      presentation.data < now.date ||
      (
        presentation.data === now.date &&
        currentStart <= now.time
      )

    if (presentationAlreadyStarted) {
      return jsonResponse(
        {
          error:
            'Apresentações passadas ou em andamento não podem ser editadas.',
        },
        409,
      )
    }

    if (
      date < now.date ||
      (
        date === now.date &&
        startTime <= now.time
      )
    ) {
      return jsonResponse(
        {
          error:
            'Não é possível mover a apresentação para um horário que já passou.',
        },
        400,
      )
    }

    const {
      data: integrationData,
      error: integrationError,
    } = await supabaseAdmin.rpc(
      'obter_google_refresh_token',
    )

    if (integrationError) {
      console.error(integrationError)

      throw new Error(
        'Não foi possível consultar a integração com o Google.',
      )
    }

    const integration = integrationData?.[0]

    if (!integration?.refresh_token) {
      return jsonResponse(
        {
          error:
            'Nenhuma conta Google está conectada.',
        },
        400,
      )
    }

    if (!integration.calendar_id) {
      return jsonResponse(
        {
          error:
            'Nenhuma agenda Google está selecionada.',
        },
        400,
      )
    }

    if (
      integration.calendar_id !==
      presentation.google_calendar_id
    ) {
      return jsonResponse(
        {
          error:
            'A apresentação pertence a outra agenda Google.',
        },
        409,
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
          client_id: googleClientId,
          client_secret:
            googleClientSecret,
          refresh_token:
            integration.refresh_token,
          grant_type: 'refresh_token',
        }),
      },
    )

    const tokenData =
      await tokenResponse.json()

    if (
      !tokenResponse.ok ||
      !tokenData.access_token
    ) {
      console.error(
        'Falha ao renovar acesso Google:',
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

    const googleAccessToken =
      tokenData.access_token

    const calendarId =
      presentation.google_calendar_id

    const eventId =
      presentation.google_event_id

    const eventUrl =
      `https://www.googleapis.com/calendar/v3/calendars/${
        encodeURIComponent(calendarId)
      }/events/${encodeURIComponent(eventId)}`

    const currentEventResponse =
      await fetch(eventUrl, {
        headers: {
          Authorization:
            `Bearer ${googleAccessToken}`,
        },
      })

    if (
      currentEventResponse.status === 404 ||
      currentEventResponse.status === 410
    ) {
      return jsonResponse(
        {
          error:
            'O evento não existe mais no Google Agenda.',
        },
        409,
      )
    }

    const currentEvent: GoogleEvent =
      await currentEventResponse.json()

    if (!currentEventResponse.ok) {
      console.error(
        'Falha ao consultar evento Google:',
        currentEvent,
      )

      return jsonResponse(
        {
          error:
            'Não foi possível consultar o evento no Google Agenda.',
        },
        400,
      )
    }

    let isConflict = false
    if (etag) {
      // Se etag foi enviado, o conflito ocorre se o etag do Google mudou
      isConflict = currentEvent.etag !== etag
    } else {
      // Caso contrário, usa a verificação clássica de campos locais vs remotos
      isConflict = hasRelevantGoogleChanges(
        presentation,
        currentEvent,
      )
    }

    if (isConflict) {
      return jsonResponse(
        {
          error:
            'Os dados desta apresentação foram alterados diretamente no Google Agenda. Atualize o sistema antes de editar.',
        },
        409,
      )
    }

    const {
      data: localConflicts,
      error: localConflictError,
    } = await supabaseAdmin
      .from('apresentacoes')
      .select(`
        id,
        titulo,
        horario,
        horario_fim,
        google_calendar_id
      `)
      .eq('data', date)
      .neq('id', presentationId)
      .lt('horario', endTime)
      .gt('horario_fim', startTime)

    if (localConflictError) {
      console.error(localConflictError)

      throw new Error(
        'Não foi possível validar os horários no sistema.',
      )
    }

    const relevantLocalConflicts =
      (localConflicts || []).filter(
        (item) =>
          !item.google_calendar_id ||
          item.google_calendar_id ===
            calendarId,
      )

    if (
      relevantLocalConflicts.length > 0
    ) {
      return jsonResponse(
        {
          error:
            'Já existe outra apresentação nesse intervalo.',
        },
        409,
      )
    }

    const nextDate = getTomorrow(date)

    const googleEventsUrl = new URL(
      `https://www.googleapis.com/calendar/v3/calendars/${
        encodeURIComponent(calendarId)
      }/events`,
    )

    googleEventsUrl.searchParams.set(
      'timeMin',
      `${date}T00:00:00-03:00`,
    )
    googleEventsUrl.searchParams.set(
      'timeMax',
      `${nextDate}T00:00:00-03:00`,
    )
    googleEventsUrl.searchParams.set(
      'singleEvents',
      'true',
    )
    googleEventsUrl.searchParams.set(
      'showDeleted',
      'false',
    )
    googleEventsUrl.searchParams.set(
      'maxResults',
      '2500',
    )

    const googleEventsResponse =
      await fetch(googleEventsUrl, {
        headers: {
          Authorization:
            `Bearer ${googleAccessToken}`,
        },
      })

    const googleEventsData =
      await googleEventsResponse.json()

    if (!googleEventsResponse.ok) {
      console.error(
        'Falha ao validar conflitos Google:',
        googleEventsData,
      )

      return jsonResponse(
        {
          error:
            'Não foi possível validar os horários no Google Agenda.',
        },
        400,
      )
    }

    const requestedStart = new Date(
      `${date}T${startTime}:00-03:00`,
    ).getTime()

    const requestedEnd = new Date(
      `${date}T${endTime}:00-03:00`,
    ).getTime()

    const googleEvents: GoogleEvent[] =
      googleEventsData.items || []

    for (const event of googleEvents) {
      if (
        event.id === eventId ||
        event.status === 'cancelled' ||
        !event.start?.dateTime ||
        !event.end?.dateTime
      ) {
        continue
      }

      const eventStart = new Date(
        event.start.dateTime,
      ).getTime()

      const eventEnd = new Date(
        event.end.dateTime,
      ).getTime()

      if (
        Number.isNaN(eventStart) ||
        Number.isNaN(eventEnd)
      ) {
        continue
      }

      const overlaps =
        eventStart < requestedEnd &&
        eventEnd > requestedStart

      if (overlaps) {
        return jsonResponse(
          {
            error:
              'Já existe outro evento nesse intervalo no Google Agenda.',
          },
          409,
        )
      }
    }

    const previousGoogleValues = {
      summary:
        currentEvent.summary ||
        presentation.titulo,
      start: currentEvent.start,
      end: currentEvent.end,
    }

    const updateResponse = await fetch(
      eventUrl,
      {
        method: 'PATCH',
        headers: {
          Authorization:
            `Bearer ${googleAccessToken}`,
          'Content-Type':
            'application/json',
          ...(currentEvent.etag
            ? {
                'If-Match':
                  currentEvent.etag,
              }
            : {}),
        },
        body: JSON.stringify({
          summary: title,
          start: {
            dateTime:
              `${date}T${startTime}:00`,
            timeZone: TIME_ZONE,
          },
          end: {
            dateTime:
              `${date}T${endTime}:00`,
            timeZone: TIME_ZONE,
          },
        }),
      },
    )

    if (updateResponse.status === 412) {
      return jsonResponse(
        {
          error:
            'A apresentação foi alterada por outra pessoa. Atualize o sistema e tente novamente.',
        },
        409,
      )
    }

    const updatedEvent: GoogleEvent =
      await updateResponse.json()

    if (!updateResponse.ok) {
      console.error(
        'Falha ao atualizar evento Google:',
        updatedEvent,
      )

      return jsonResponse(
        {
          error:
            'Não foi possível atualizar a apresentação no Google Agenda.',
        },
        400,
      )
    }

    const {
      data: savedPresentation,
      error: saveError,
    } = await supabaseAdmin
      .from('apresentacoes')
      .update({
        titulo: title,
        data: date,
        horario: startTime,
        horario_fim: endTime,
        meet_link:
          updatedEvent.hangoutLink ||
          presentation.meet_link,
        google_event_updated_at:
          updatedEvent.updated || null,
        ...(etag ? {
          sync_status: 'synced',
          sync_error: null,
          last_synced_at: new Date().toISOString(),
        } : {}),
      })
      .eq('id', presentationId)
      .select(`
        id,
        titulo,
        data,
        horario,
        horario_fim,
        meet_link,
        google_event_id,
        google_calendar_id,
        google_event_updated_at
      `)
      .single()

    if (saveError || !savedPresentation) {
      console.error(
        'Falha ao atualizar apresentação local:',
        saveError,
      )

      const rollbackResponse = await fetch(
        eventUrl,
        {
          method: 'PATCH',
          headers: {
            Authorization:
              `Bearer ${googleAccessToken}`,
            'Content-Type':
              'application/json',
            ...(updatedEvent.etag
              ? {
                  'If-Match':
                    updatedEvent.etag,
                }
              : {}),
          },
          body: JSON.stringify(
            previousGoogleValues,
          ),
        },
      )

      if (!rollbackResponse.ok) {
        const rollbackBody =
          await rollbackResponse.text()

        console.error(
          'Falha crítica no rollback Google:',
          rollbackBody,
        )

        return jsonResponse(
          {
            error:
              'A apresentação foi alterada no Google, mas o sistema não conseguiu salvar nem desfazer a alteração. Atualize a agenda antes de continuar.',
          },
          500,
        )
      }

      return jsonResponse(
        {
          error:
            'A alteração não pôde ser salva no sistema. O evento no Google foi restaurado.',
        },
        500,
      )
    }

    return jsonResponse({
      success: true,
      presentation: {
        id: savedPresentation.id,
        title: savedPresentation.titulo,
        date: savedPresentation.data,
        time:
          savedPresentation.horario.slice(
            0,
            5,
          ),
        timeEnd:
          savedPresentation.horario_fim.slice(
            0,
            5,
          ),
        meetLink:
          savedPresentation.meet_link,
        googleEventId:
          savedPresentation.google_event_id,
        googleCalendarId:
          savedPresentation.google_calendar_id,
        googleEventUpdatedAt:
          savedPresentation.google_event_updated_at,
      },
    })
  } catch (error) {
    console.error(error)

    return jsonResponse(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Não foi possível editar a apresentação.',
      },
      500,
    )
  }
})