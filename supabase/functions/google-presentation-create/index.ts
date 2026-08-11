import { createClient } from 'npm:@supabase/supabase-js@2'

const TIME_ZONE = 'America/Sao_Paulo'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
}

type GoogleEvent = {
  id?: string
  status?: string
  summary?: string
  updated?: string
  hangoutLink?: string
  start?: {
    date?: string
    dateTime?: string
  }
  end?: {
    date?: string
    dateTime?: string
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

const getMeetLink = (event: GoogleEvent) => {
  if (event.hangoutLink) {
    return event.hangoutLink
  }

  return event.conferenceData?.entryPoints?.find(
    (entryPoint) =>
      entryPoint.entryPointType === 'video',
  )?.uri
}

const wait = (milliseconds: number) =>
  new Promise((resolve) =>
    setTimeout(resolve, milliseconds),
  )

const deleteGoogleEvent = async ({
  calendarId,
  eventId,
  accessToken,
}: {
  calendarId: string
  eventId: string
  accessToken: string
}) => {
  const response = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${
      encodeURIComponent(calendarId)
    }/events/${encodeURIComponent(eventId)}`,
    {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  )

  if (
    !response.ok &&
    response.status !== 404 &&
    response.status !== 410
  ) {
    const body = await response.text()

    console.error(
      'Falha ao desfazer evento no Google:',
      body,
    )
  }
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

  let createdGoogleEventId: string | null = null
  let googleAccessToken: string | null = null
  let activeCalendarId: string | null = null

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

    let requestBody: Record<string, unknown>

    try {
      requestBody = await req.json()
    } catch {
      return jsonResponse(
        {
          error:
            'Os dados enviados são inválidos.',
        },
        400,
      )
    }

    const title =
      typeof requestBody.title === 'string'
        ? requestBody.title.trim()
        : ''

    const date =
      typeof requestBody.date === 'string'
        ? requestBody.date.trim()
        : ''

    const startTime = normalizeTime(
      requestBody.startTime,
    )

    const endTime = normalizeTime(
      requestBody.endTime,
    )

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

    const isRecurring = !!requestBody.isRecurring
    const recurringDays = Array.isArray(requestBody.recurringDays) ? requestBody.recurringDays : []
    const recurrenceEndOption = typeof requestBody.recurrenceEndOption === 'string' ? requestBody.recurrenceEndOption : 'never'
    const recurrenceEndDate = typeof requestBody.recurrenceEndDate === 'string' ? requestBody.recurrenceEndDate.trim() : ''

    if (endTime <= startTime) {
      return jsonResponse(
        {
          error:
            'O horário final deve ser posterior ao horário inicial.',
        },
        400,
      )
    }

    if (isRecurring) {
      if (recurringDays.length === 0) {
        return jsonResponse(
          {
            error: 'Selecione pelo menos um dia da semana para a recorrência.',
          },
          400,
        )
      }
      if (recurrenceEndOption === 'date') {
        if (!recurrenceEndDate || !isValidDate(recurrenceEndDate)) {
          return jsonResponse(
            {
              error: 'Informe uma data de término de recorrência válida.',
            },
            400,
          )
        }
        if (recurrenceEndDate <= date) {
          return jsonResponse(
            {
              error: 'A data de término da recorrência deve ser posterior à data inicial.',
            },
            400,
          )
        }
      }
    }

    const now = getSaoPauloNow()

    if (
      date < now.date ||
      (date === now.date &&
        startTime <= now.time)
    ) {
      return jsonResponse(
        {
          error:
            'Não é possível criar uma apresentação em um horário que já passou.',
        },
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
      { p_user_id: user.id }
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

    activeCalendarId =
      integration.calendar_id

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
        'Falha ao renovar token Google:',
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

    googleAccessToken =
      tokenData.access_token

    /*
     * Validação local:
     * considera registros antigos sem calendar_id
     * e registros pertencentes à agenda ativa.
     */
    const {
      data: localPresentations,
      error: localConflictError,
    } = await supabaseAdmin
      .from('apresentacoes')
      .select(`
        id,
        titulo,
        data,
        horario,
        horario_fim,
        google_calendar_id
      `)
      .eq('data', date)
      .lt('horario', endTime)
      .gt('horario_fim', startTime)

    if (localConflictError) {
      console.error(localConflictError)

      throw new Error(
        'Não foi possível validar os horários no sistema.',
      )
    }

    const relevantLocalPresentations =
      (localPresentations || []).filter(
        (presentation) =>
          !presentation.google_calendar_id ||
          presentation.google_calendar_id ===
            activeCalendarId,
      )

    const localDuplicate =
      relevantLocalPresentations.find(
        (presentation) =>
          presentation.titulo.trim()
            .toLocaleLowerCase('pt-BR') ===
            title.toLocaleLowerCase('pt-BR') &&
          presentation.horario.slice(0, 5) ===
            startTime &&
          presentation.horario_fim.slice(0, 5) ===
            endTime,
      )

    if (localDuplicate) {
      return jsonResponse(
        {
          error:
            'Já existe uma apresentação igual nesse horário.',
        },
        409,
      )
    }

    if (
      relevantLocalPresentations.length > 0
    ) {
      return jsonResponse(
        {
          error:
            'Já existe outra apresentação nesse intervalo.',
        },
        409,
      )
    }

    /*
     * Validação direta no Google Agenda.
     */
    const nextDate = getTomorrow(date)

    const googleEventsUrl = new URL(
      `https://www.googleapis.com/calendar/v3/calendars/${
        encodeURIComponent(activeCalendarId)
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
        'Falha ao consultar eventos Google:',
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

      if (!overlaps) {
        continue
      }

      const isExactDuplicate =
        (event.summary || '')
          .trim()
          .toLocaleLowerCase('pt-BR') ===
          title.toLocaleLowerCase('pt-BR') &&
        eventStart === requestedStart &&
        eventEnd === requestedEnd

      return jsonResponse(
        {
          error: isExactDuplicate
            ? 'Já existe uma apresentação igual nesse horário no Google Agenda.'
            : 'Já existe outro evento nesse intervalo no Google Agenda.',
        },
        409,
      )
    }

    /*
     * Criação do evento e solicitação do Meet.
     */
    const createEventUrl = new URL(
      `https://www.googleapis.com/calendar/v3/calendars/${
        encodeURIComponent(activeCalendarId)
      }/events`,
    )

    createEventUrl.searchParams.set(
      'conferenceDataVersion',
      '1',
    )

    const rfcToJsDayMap: Record<string, number> = {
      SU: 0, MO: 1, TU: 2, WE: 3, TH: 4, FR: 5, SA: 6
    }

    let effectiveDate = date
    if (isRecurring && recurringDays.length > 0) {
      const [year, month, day] = date.split('-').map(Number)
      const startJsDate = new Date(Date.UTC(year, month - 1, day))
      const startDayIndex = startJsDate.getUTCDay()
      const targetIndices = recurringDays.map(d => rfcToJsDayMap[d]).filter(v => v !== undefined)
      
      let minDiff = 7
      for (const targetIdx of targetIndices) {
        let diff = targetIdx - startDayIndex
        if (diff < 0) {
          diff += 7
        }
        if (diff < minDiff) {
          minDiff = diff
        }
      }
      if (minDiff > 0 && minDiff < 7) {
        startJsDate.setUTCDate(startJsDate.getUTCDate() + minDiff)
        const y = startJsDate.getUTCFullYear()
        const m = String(startJsDate.getUTCMonth() + 1).padStart(2, '0')
        const d = String(startJsDate.getUTCDate()).padStart(2, '0')
        effectiveDate = `${y}-${m}-${d}`
      }
    }

    const rruleParts = [`FREQ=WEEKLY`]
    if (recurringDays && recurringDays.length > 0) {
      rruleParts.push(`BYDAY=${recurringDays.join(',')}`)
    }
    if (recurrenceEndOption === 'date' && recurrenceEndDate) {
      const endLocalStr = `${recurrenceEndDate}T23:59:59`
      const dummy = new Date(endLocalStr + 'Z')
      const spStr = dummy.toLocaleString('sv', { timeZone: 'America/Sao_Paulo' }).replace(' ', 'T')
      const spDummy = new Date(spStr + 'Z')
      const spOffsetMs = dummy.getTime() - spDummy.getTime()
      const localDate = new Date(dummy.getTime() + spOffsetMs)
      if (!Number.isNaN(localDate.getTime())) {
        const untilFormatted = localDate.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
        rruleParts.push(`UNTIL=${untilFormatted}`)
      }
    }
    const recurrenceRule = `RRULE:${rruleParts.join(';')}`

    const createEventResponse =
      await fetch(createEventUrl, {
        method: 'POST',
        headers: {
          Authorization:
            `Bearer ${googleAccessToken}`,
          'Content-Type':
            'application/json',
        },
        body: JSON.stringify({
          summary: title,
          start: {
            dateTime:
              `${effectiveDate}T${startTime}:00`,
            timeZone: TIME_ZONE,
          },
          end: {
            dateTime:
              `${effectiveDate}T${endTime}:00`,
            timeZone: TIME_ZONE,
          },
          conferenceData: {
            createRequest: {
              requestId:
                crypto.randomUUID(),
              conferenceSolutionKey: {
                type: 'hangoutsMeet',
              },
            },
          },
          ...(isRecurring ? { recurrence: [recurrenceRule] } : {}),
        }),
      })

    let createdEvent: GoogleEvent =
      await createEventResponse.json()

    if (
      !createEventResponse.ok ||
      !createdEvent.id
    ) {
      console.error(
        'Falha ao criar evento Google:',
        createdEvent,
      )

      return jsonResponse(
        {
          error:
            'Não foi possível criar a apresentação no Google Agenda.',
        },
        400,
      )
    }

    createdGoogleEventId =
      createdEvent.id

    let meetLink =
      getMeetLink(createdEvent)

    /*
     * A geração do Meet pode terminar alguns
     * instantes depois da criação do evento.
     */
    for (
      let attempt = 0;
      !meetLink && attempt < 4;
      attempt += 1
    ) {
      await wait(750)

      const eventResponse = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${
          encodeURIComponent(activeCalendarId)
        }/events/${
          encodeURIComponent(
            createdGoogleEventId,
          )
        }`,
        {
          headers: {
            Authorization:
              `Bearer ${googleAccessToken}`,
          },
        },
      )

      if (!eventResponse.ok) {
        continue
      }

      createdEvent =
        await eventResponse.json()

      meetLink =
        getMeetLink(createdEvent)
    }

    if (!meetLink) {
      await deleteGoogleEvent({
        calendarId: activeCalendarId,
        eventId: createdGoogleEventId,
        accessToken: googleAccessToken,
      })

      createdGoogleEventId = null

      return jsonResponse(
        {
          error:
            'O Google não gerou o link do Meet. A apresentação não foi criada.',
        },
        400,
      )
    }

    if (isRecurring) {
      createdGoogleEventId = null

      return jsonResponse(
        {
          success: true,
          presentation: {
            id: null,
            title: title,
            date: date,
            time: startTime,
            timeEnd: endTime,
            meetLink: meetLink,
            googleEventId: createdEvent.id,
            googleCalendarId: activeCalendarId,
            googleEventUpdatedAt: createdEvent.updated || null,
            participantsList: [],
          },
        },
        201,
      )
    }

    /*
     * Persistência local.
     */
    const {
      data: savedPresentation,
      error: saveError,
    } = await supabaseAdmin
      .from('apresentacoes')
      .insert({
        titulo: title,
        data: date,
        horario: startTime,
        horario_fim: endTime,
        meet_link: meetLink,
        google_event_id:
          createdGoogleEventId,
        google_calendar_id:
          activeCalendarId,
        google_event_updated_at:
          createdEvent.updated || null,
        user_id: user.id,
        google_integracao_id: integration.google_integracao_id,
      })
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
        'Falha ao salvar apresentação:',
        saveError,
      )

      await deleteGoogleEvent({
        calendarId: activeCalendarId,
        eventId: createdGoogleEventId,
        accessToken: googleAccessToken,
      })

      createdGoogleEventId = null

      return jsonResponse(
        {
          error:
            'A apresentação não pôde ser salva no sistema. O evento criado no Google foi removido.',
        },
        500,
      )
    }

    createdGoogleEventId = null

    return jsonResponse(
      {
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
          participantsList: [],
        },
      },
      201,
    )
  } catch (error) {
    console.error(error)

    /*
     * Proteção adicional caso uma falha inesperada
     * aconteça depois da criação no Google.
     */
    if (
      createdGoogleEventId &&
      googleAccessToken &&
      activeCalendarId
    ) {
      await deleteGoogleEvent({
        calendarId: activeCalendarId,
        eventId: createdGoogleEventId,
        accessToken: googleAccessToken,
      })
    }

    return jsonResponse(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Não foi possível criar a apresentação.',
      },
      500,
    )
  }
})