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
  recurrence?: string[]
  transparency?: string
  recurringEventId?: string
}

const getSaoPauloISO = (dateStr: string, timeStr = '00:00:00'): string => {
  const dummy = new Date(`${dateStr}T${timeStr}Z`)
  const spStr = dummy.toLocaleString('sv', { timeZone: 'America/Sao_Paulo' }).replace(' ', 'T')
  const spDummy = new Date(spStr + 'Z')
  const offsetMs = dummy.getTime() - spDummy.getTime()
  return new Date(dummy.getTime() + offsetMs).toISOString()
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

const formatDateToSp = (dateSource: Date | string | number): string => {
  const d = new Date(dateSource)
  if (Number.isNaN(d.getTime())) return ''
  const spParts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(d)
  const values = Object.fromEntries(spParts.map(p => [p.type, p.value]))
  return `${values.year}-${values.month}-${values.day}`
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

    const editScope =
      typeof body.editScope === 'string'
        ? body.editScope
        : 'occurrence'

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
        google_recurring_event_id,
        google_original_start_at,
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

    let eventId = presentation.google_event_id

    if (editScope === 'series') {
      if (!presentation.google_recurring_event_id) {
        return jsonResponse(
          {
            error:
              'Esta ocorrência não faz parte de uma série recorrente.',
          },
          400,
        )
      }
      eventId = presentation.google_recurring_event_id
    }

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

    let futureExceptions: GoogleEvent[] = []
    if (editScope === 'series') {
      const listUrl = new URL(
        `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`
      )
      listUrl.searchParams.set('singleEvents', 'false')
      listUrl.searchParams.set('showDeleted', 'true')
      
      const listResponse = await fetch(listUrl, {
        headers: {
          Authorization: `Bearer ${googleAccessToken}`,
        }
      })
      
      // Define a data de referência/corte (preferindo a data original da ocorrência no fuso de SP)
      let referenceDate = presentation.data
      if (presentation.google_original_start_at) {
        const origDateStr = formatDateToSp(presentation.google_original_start_at)
        if (origDateStr) {
          referenceDate = origDateStr
        }
      }

      if (listResponse.ok) {
        const listData = await listResponse.json()
        const items = listData.items || []
        
        // Calcula a data de corte local às 00:00:00 no fuso de São Paulo de forma dinâmica
        const cutoffLocalStr = `${referenceDate}T00:00:00`
        const dummyCutoff = new Date(cutoffLocalStr + 'Z')
        const spCutoffStr = dummyCutoff.toLocaleString('sv', { timeZone: 'America/Sao_Paulo' }).replace(' ', 'T')
        const spCutoffDummy = new Date(spCutoffStr + 'Z')
        const spCutoffOffsetMs = dummyCutoff.getTime() - spCutoffDummy.getTime()
        const cutoffDate = new Date(dummyCutoff.getTime() + spCutoffOffsetMs)

        futureExceptions = items.filter((item: any) => 
          item.recurringEventId === presentation.google_recurring_event_id &&
          item.originalStartTime?.dateTime &&
          new Date(item.originalStartTime.dateTime).getTime() >= cutoffDate.getTime()
        )
      }

      // Busca as ocorrências locais futuras da série antiga que exigem preservação
      const { data: localMatches } = await supabaseAdmin
        .from('apresentacoes')
        .select(`
          id,
          titulo,
          data,
          horario,
          horario_fim,
          meet_link,
          google_event_id,
          google_original_start_at,
          participacoes (
            id
          )
        `)
        .eq('google_recurring_event_id', presentation.google_recurring_event_id)
        .gte('data', referenceDate)

      const relevantLocalOccurrences = (localMatches || []).filter((loc: any) => {
        const hasParticipants = loc.participacoes && loc.participacoes.length > 0
        
        const isExceptionReal = futureExceptions.some((ext: any) => 
          (ext.id && ext.id === loc.google_event_id) || 
          (ext.originalStartTime?.dateTime && loc.google_original_start_at && 
           new Date(ext.originalStartTime.dateTime).getTime() === new Date(loc.google_original_start_at).getTime())
        )
        
        return hasParticipants || isExceptionReal
      })

      // Preserva os valores antigos locais para rollback se houver falha parcial
      const oldLocalValues = relevantLocalOccurrences.map((loc: any) => ({
        id: loc.id,
        google_event_id: loc.google_event_id,
        google_recurring_event_id: presentation.google_recurring_event_id,
        google_original_start_at: loc.google_original_start_at,
        titulo: loc.titulo,
        data: loc.data,
        horario: loc.horario,
        horario_fim: loc.horario_fim,
        meet_link: loc.meet_link
      }))

      const updatedLocalIds: number[] = []

      let newSeriesEvent: any
      let meetLink: string | null = null
      let performGoogleRollback: () => Promise<{ success: boolean }>
      let newOldRrule = ''
      let newSeriesRecurrence: string[] = []
      let newSeriesBody: any = null

      let masterStartObj: Date
      if (currentEvent.start?.dateTime) {
        masterStartObj = new Date(currentEvent.start.dateTime)
      } else if (currentEvent.start?.date) {
        masterStartObj = new Date(`${currentEvent.start.date}T00:00:00-03:00`)
      } else {
        masterStartObj = new Date(0)
      }

      const isEntireSeriesFuture = masterStartObj.getTime() > Date.now()

      let windowStartDate = referenceDate

      if (isEntireSeriesFuture) {
        windowStartDate = (currentEvent.start?.dateTime || currentEvent.start?.date || '').slice(0, 10)
      } else {
        const instancesUrl = new URL(
          `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(presentation.google_recurring_event_id!)}/instances`
        )
        const nowIso = new Date().toISOString()
        instancesUrl.searchParams.set('timeMin', nowIso)
        instancesUrl.searchParams.set('maxResults', '1')

        const instancesResponse = await fetch(instancesUrl, {
          headers: {
            Authorization: `Bearer ${googleAccessToken}`,
          }
        })
        if (instancesResponse.ok) {
          const instancesData = await instancesResponse.json()
          const firstInstance = instancesData.items?.[0]
          if (firstInstance) {
            windowStartDate = (firstInstance.start?.dateTime || firstInstance.start?.date || '').slice(0, 10)
          }
        }
      }

      let untilDateStr: string | null = null
      const rrule = currentEvent.recurrence?.[0] || ''
      const untilMatch = rrule.match(/UNTIL=(\d{8}(T\d{6}Z)?)/i)
      if (untilMatch) {
        const rawUntil = untilMatch[1]
        untilDateStr = `${rawUntil.slice(0, 4)}-${rawUntil.slice(4, 6)}-${rawUntil.slice(6, 8)}`
      }

      const windowStartObj = new Date(`${windowStartDate}T00:00:00`)
      const maxEndDateObj = new Date(windowStartObj)
      maxEndDateObj.setMonth(maxEndDateObj.getMonth() + 3)

      const y = maxEndDateObj.getFullYear()
      const m = String(maxEndDateObj.getMonth() + 1).padStart(2, '0')
      const d = String(maxEndDateObj.getDate()).padStart(2, '0')
      const maxEndDateStr = `${y}-${m}-${d}`

      const windowEndDate = (untilDateStr && untilDateStr < maxEndDateStr) ? untilDateStr : maxEndDateStr

      // Converte windowStartDate e windowEndDate para ISO strings usando o fuso de São Paulo de forma dinâmica
      const timeMin = getSaoPauloISO(windowStartDate, '00:00:00')
      const timeMax = getSaoPauloISO(windowEndDate, '23:59:59')

      const windowInstancesUrl = new URL(
        `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(presentation.google_recurring_event_id!)}/instances`
      )
      windowInstancesUrl.searchParams.set('timeMin', timeMin)
      windowInstancesUrl.searchParams.set('timeMax', timeMax)
      windowInstancesUrl.searchParams.set('maxResults', '2500')

      const windowInstancesResponse = await fetch(windowInstancesUrl, {
        headers: {
          Authorization: `Bearer ${googleAccessToken}`,
        }
      })

      if (!windowInstancesResponse.ok) {
        console.error('Falha ao buscar instâncias da série para validação:', await windowInstancesResponse.text())
        return jsonResponse({ error: 'Não foi possível validar os horários das ocorrências da série no Google Agenda.' }, 400)
      }

      const windowInstancesData = await windowInstancesResponse.json()
      const seriesInstances: GoogleEvent[] = windowInstancesData.items || []

      const affectedInstances = seriesInstances
        .filter((instance) => {
          const instDate = (instance.start?.dateTime || instance.start?.date || '').slice(0, 10)
          return instDate >= windowStartDate
        })
        .map((instance) => {
          const instDate = (instance.start?.dateTime || instance.start?.date || '').slice(0, 10)
          return {
            date: instDate,
            startTime,
            endTime,
            googleEventId: instance.id
          }
        })

      const seriesLocalConflicts: string[] = []

      const { data: dbConflicts, error: dbConflictsError } = await supabaseAdmin
        .from('apresentacoes')
        .select('id, data, horario, horario_fim, google_event_id, google_recurring_event_id')
        .gte('data', windowStartDate)
        .lte('data', windowEndDate)
        .neq('sync_status', 'google_deleted')

      if (dbConflictsError) {
        console.error('Falha ao buscar conflitos locais da série:', dbConflictsError)
        return jsonResponse({ error: 'Não foi possível validar os horários locais das apresentações.' }, 500)
      }

      const recurringId = presentation.google_recurring_event_id

      for (const item of affectedInstances) {
        const hasConflict = (dbConflicts || []).some((conflict) => {
          if (conflict.google_event_id === item.googleEventId) return false
          if (recurringId && conflict.google_recurring_event_id === recurringId) return false
          
          const conflictStart = (conflict.horario || '').slice(0, 5)
          const conflictEnd = (conflict.horario_fim || '').slice(0, 5)
          
          const sameDate = conflict.data === item.date
          const overlap = conflictStart < item.endTime && conflictEnd > item.startTime
          return sameDate && overlap
        })

        if (hasConflict && !seriesLocalConflicts.includes(item.date)) {
          seriesLocalConflicts.push(item.date)
        }
      }

      const googleConflictsUrl = new URL(
        `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`
      )
      googleConflictsUrl.searchParams.set('timeMin', timeMin)
      googleConflictsUrl.searchParams.set('timeMax', timeMax)
      googleConflictsUrl.searchParams.set('singleEvents', 'true')
      googleConflictsUrl.searchParams.set('showDeleted', 'false')
      googleConflictsUrl.searchParams.set('maxResults', '2500')

      const googleConflictsResponse = await fetch(googleConflictsUrl, {
        headers: {
          Authorization: `Bearer ${googleAccessToken}`,
        }
      })

      if (!googleConflictsResponse.ok) {
        console.error('Falha ao buscar eventos do Google para validação de conflitos:', await googleConflictsResponse.text())
        return jsonResponse({ error: 'Não foi possível validar os horários das ocorrências no Google Agenda.' }, 400)
      }

      const googleConflictsData = await googleConflictsResponse.json()
      const externalEvents: GoogleEvent[] = googleConflictsData.items || []

      const seriesGoogleConflicts: string[] = []

      for (const item of affectedInstances) {
        const requestedStart = new Date(getSaoPauloISO(item.date, `${item.startTime}:00`)).getTime()
        const requestedEnd = new Date(getSaoPauloISO(item.date, `${item.endTime}:00`)).getTime()

        const hasConflict = externalEvents.some((event) => {
          if (event.status === 'cancelled') return false
          if (event.transparency === 'transparent') return false
          if (event.id === item.googleEventId) return false
          if (recurringId && event.recurringEventId === recurringId) return false

          if (!event.start?.dateTime || !event.end?.dateTime) return false

          const eventStart = new Date(event.start.dateTime).getTime()
          const eventEnd = new Date(event.end.dateTime).getTime()

          if (Number.isNaN(eventStart) || Number.isNaN(eventEnd)) return false

          return eventStart < requestedEnd && eventEnd > requestedStart
        })

        if (hasConflict && !seriesGoogleConflicts.includes(item.date)) {
          seriesGoogleConflicts.push(item.date)
        }
      }
      const allConflicts = Array.from(new Set([...seriesLocalConflicts, ...seriesGoogleConflicts])).sort()

      if (allConflicts.length > 0) {
        const formattedDates = allConflicts.map(d => {
          const [year, month, day] = d.split('-')
          return `${day}/${month}/${year}`
        }).join(', ')

        return jsonResponse(
          {
            error: `Não foi possível atualizar a série. Conflito de horário detectado nas seguintes datas: ${formattedDates}.`,
            conflictingDates: allConflicts
          },
          400
        )
      }

      if (isEntireSeriesFuture) {
        const originalStartDate = (currentEvent.start?.dateTime || currentEvent.start?.date || '').slice(0, 10)

        // Atualiza diretamente o evento mestre no Google Agenda (sem split)
        const patchMasterResponse = await fetch(eventUrl, {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${googleAccessToken}`,
            'Content-Type': 'application/json',
            ...(currentEvent.etag ? { 'If-Match': currentEvent.etag } : {})
          },
          body: JSON.stringify({
            summary: title,
            start: {
              dateTime: `${originalStartDate}T${startTime}:00`,
              timeZone: TIME_ZONE,
            },
            end: {
              dateTime: `${originalStartDate}T${endTime}:00`,
              timeZone: TIME_ZONE,
            }
          })
        })

        if (!patchMasterResponse.ok) {
          const errData = await patchMasterResponse.json().catch(() => ({}))
          console.error('Falha ao atualizar evento mestre no Google:', errData)
          return jsonResponse({ error: 'Não foi possível atualizar a série no Google Agenda.' }, 400)
        }

        newSeriesEvent = await patchMasterResponse.json()
        meetLink = newSeriesEvent.hangoutLink

        return jsonResponse(
          {
            success: true,
            message: 'Série atualizada com sucesso no Google.',
            splitDetails: {
              oldSeriesId: presentation.google_recurring_event_id,
              newSeriesId: newSeriesEvent.id,
              newSeriesMeetLink: meetLink,
              newSeriesTitle: title
            }
          },
          200
        )
      } else {
        // Calcula o dia anterior à ocorrência de corte para o UNTIL da série antiga
        const [cYear, cMonth, cDay] = referenceDate.split('-').map(Number)
        const cutoffDateObj = new Date(Date.UTC(cYear, cMonth - 1, cDay))
        cutoffDateObj.setUTCDate(cutoffDateObj.getUTCDate() - 1)
        
        const dayBeforeStr = `${cutoffDateObj.getUTCFullYear()}-${String(cutoffDateObj.getUTCMonth() + 1).padStart(2, '0')}-${String(cutoffDateObj.getUTCDate()).padStart(2, '0')}`
        const endLocalStr = `${dayBeforeStr}T23:59:59`
        const dummy = new Date(endLocalStr + 'Z')
        const spStr = dummy.toLocaleString('sv', { timeZone: 'America/Sao_Paulo' }).replace(' ', 'T')
        const spDummy = new Date(spStr + 'Z')
        const spOffsetMs = dummy.getTime() - spDummy.getTime()
        const untilDate = new Date(dummy.getTime() + spOffsetMs)
        const untilFormatted = untilDate.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'

        let oldRrule = currentEvent.recurrence?.[0] || 'RRULE:FREQ=WEEKLY'
        oldRrule = oldRrule.replace(/;?UNTIL=[^;]*/gi, '').replace(/;?COUNT=[^;]*/gi, '')
        newOldRrule = `${oldRrule};UNTIL=${untilFormatted}`

        newSeriesRecurrence = currentEvent.recurrence || ['RRULE:FREQ=WEEKLY']

        // Monta as informações estruturadas da nova série em memória
        newSeriesBody = {
          summary: title,
          start: {
            dateTime: `${referenceDate}T${startTime}:00`,
            timeZone: TIME_ZONE,
          },
          end: {
            dateTime: `${referenceDate}T${endTime}:00`,
            timeZone: TIME_ZONE,
          },
          recurrence: newSeriesRecurrence,
          conferenceData: {
            createRequest: {
              requestId: crypto.randomUUID(),
              conferenceSolutionKey: {
                type: 'hangoutsMeet',
              },
            },
          },
        }

        // Executa o PATCH no evento-pai da série antiga para encurtá-la
        const patchOldResponse = await fetch(eventUrl, {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${googleAccessToken}`,
            'Content-Type': 'application/json',
            ...(currentEvent.etag ? { 'If-Match': currentEvent.etag } : {})
          },
          body: JSON.stringify({
            recurrence: [newOldRrule]
          })
        })

        if (!patchOldResponse.ok) {
          const errData = await patchOldResponse.json().catch(() => ({}))
          console.error('Falha ao encurtar série antiga no Google:', errData)
          return jsonResponse(
            {
              error: 'Não foi possível encerrar a série antiga no Google Agenda.'
            },
            400
          )
        }

        const patchedEvent = await patchOldResponse.json()
        const latestOldEtag = patchedEvent.etag

        // Cria a nova série de reuniões no Google Agenda
        const createEventUrl = new URL(
          `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`
        )
        createEventUrl.searchParams.set('conferenceDataVersion', '1')

        const createNewResponse = await fetch(createEventUrl, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${googleAccessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(newSeriesBody)
        })

        newSeriesEvent = await createNewResponse.json()
        meetLink = newSeriesEvent.hangoutLink

        if (!createNewResponse.ok || !meetLink) {
          console.error('Falha ao criar nova série no Google ou Meet ausente:', newSeriesEvent)
          
          // Executa o rollback: restaura a recorrência original da série antiga
          const rollbackResponse = await fetch(eventUrl, {
            method: 'PATCH',
            headers: {
              Authorization: `Bearer ${googleAccessToken}`,
              'Content-Type': 'application/json',
              ...(latestOldEtag ? { 'If-Match': latestOldEtag } : {})
            },
            body: JSON.stringify({
              recurrence: currentEvent.recurrence || []
            })
          })

          if (!rollbackResponse.ok) {
            const rollbackErr = await rollbackResponse.json().catch(() => ({}))
            console.error('Falha crítica: Rollback da série antiga falhou no Google Agenda:', rollbackErr)
            return jsonResponse(
              {
                error: 'Falha crítica: A criação da nova série falhou e não foi possível restaurar a série original (pendente de reconciliação).'
              },
              500
            )
          }

          return jsonResponse(
            {
              error: 'Não foi possível criar a nova série com Meet link no Google Agenda.'
            },
            400
          )
        }

        // Função auxiliar local para rollback do split no Google Agenda
        performGoogleRollback = async (): Promise<{ success: boolean }> => {
          const deleteNewSeriesUrl = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(newSeriesEvent.id)}`
          const deleteNewSeriesResponse = await fetch(deleteNewSeriesUrl, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${googleAccessToken}` }
          })

          const rollbackResponse = await fetch(eventUrl, {
            method: 'PATCH',
            headers: {
              Authorization: `Bearer ${googleAccessToken}`,
              'Content-Type': 'application/json',
              ...(latestOldEtag ? { 'If-Match': latestOldEtag } : {})
            },
            body: JSON.stringify({
              recurrence: currentEvent.recurrence || []
            })
          })

          return { success: deleteNewSeriesResponse.ok && rollbackResponse.ok }
        }
      }

      // Prepara o mapeamento das ocorrências locais relevantes para a nova série
      const migrationMapping = relevantLocalOccurrences.map((loc: any) => {
        let logicalDate = loc.data
        if (loc.google_original_start_at) {
          const origDateStr = formatDateToSp(loc.google_original_start_at)
          if (origDateStr) {
            logicalDate = origDateStr
          }
        }
        const isException = futureExceptions.some((ext: any) => 
          (ext.id && ext.id === loc.google_event_id) || 
          (ext.originalStartTime?.dateTime && loc.google_original_start_at && 
           new Date(ext.originalStartTime.dateTime).getTime() === new Date(loc.google_original_start_at).getTime())
        )

        return {
          localPresentationId: loc.id,
          logicalDate,
          newSeriesId: newSeriesEvent.id,
          googleEventId: loc.google_event_id,
          newGoogleEventId: null as string | null,
          newOriginalStartAt: null as string | null,
          isException,
          titulo: loc.titulo,
          data: loc.data,
          horario: loc.horario,
          horario_fim: loc.horario_fim,
          meet_link: loc.meet_link
        }
      })

      // Se houver ocorrências locais relevantes, localiza suas correspondentes na nova série no Google
      if (migrationMapping.length > 0) {
        const dates = migrationMapping.map(m => m.logicalDate).sort()
        const minDate = dates[0]
        const maxDate = dates[dates.length - 1]

        const minLocalStr = `${minDate}T00:00:00`
        const minDummy = new Date(minLocalStr + 'Z')
        const minSpStr = minDummy.toLocaleString('sv', { timeZone: 'America/Sao_Paulo' }).replace(' ', 'T')
        const minSpDummy = new Date(minSpStr + 'Z')
        const minOffsetMs = minDummy.getTime() - minSpDummy.getTime()
        const minDateObj = new Date(minDummy.getTime() + minOffsetMs)
        const timeMin = minDateObj.toISOString()

        const tomorrowMaxDate = getTomorrow(maxDate)
        const maxLocalStr = `${tomorrowMaxDate}T00:00:00`
        const maxDummy = new Date(maxLocalStr + 'Z')
        const maxSpStr = maxDummy.toLocaleString('sv', { timeZone: 'America/Sao_Paulo' }).replace(' ', 'T')
        const maxSpDummy = new Date(maxSpStr + 'Z')
        const maxOffsetMs = maxDummy.getTime() - maxSpDummy.getTime()
        const maxDateObj = new Date(maxDummy.getTime() + maxOffsetMs)
        const timeMax = maxDateObj.toISOString()

        const instancesUrl = new URL(
          `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(newSeriesEvent.id)}/instances`
        )
        instancesUrl.searchParams.set('timeMin', timeMin)
        instancesUrl.searchParams.set('timeMax', timeMax)
        instancesUrl.searchParams.set('singleEvents', 'true')

        const instancesResponse = await fetch(instancesUrl, {
          headers: { Authorization: `Bearer ${googleAccessToken}` }
        })

        if (!instancesResponse.ok) {
          console.error('Falha ao obter instâncias da nova série:', await instancesResponse.text())
          
          const rollbackResult = await performGoogleRollback()
          if (!rollbackResult.success) {
            return jsonResponse(
              {
                error: 'Falha crítica: A criação da nova série falhou e não foi possível restaurar a série original (pendente de reconciliação).'
              },
              500
            )
          }

          return jsonResponse({ error: 'Não foi possível consultar as ocorrências da nova série no Google Agenda.' }, 400)
        }

        const instancesData = await instancesResponse.json()
        const instances = instancesData.items || []

        for (const m of migrationMapping) {
          const matchedInstance = instances.find((inst: any) => {
            const instTime = inst.originalStartTime?.dateTime || inst.start?.dateTime
            if (!instTime) return false
            const instLogicalDate = formatDateToSp(instTime)
            if (!instLogicalDate) return false

            return instLogicalDate === m.logicalDate
          })

          if (!matchedInstance) {
            console.error(`Ocorrência lógica ${m.logicalDate} não localizada na nova série.`)
            
            const rollbackResult = await performGoogleRollback()
            if (!rollbackResult.success) {
              return jsonResponse(
                {
                  error: 'Falha crítica: A criação da nova série falhou e não foi possível restaurar a série original (pendente de reconciliação).'
                },
                500
              )
            }

          }

          m.newGoogleEventId = matchedInstance.id
          m.newOriginalStartAt = matchedInstance.originalStartTime?.dateTime || matchedInstance.start?.dateTime || null
        }

        // Recria no Google Calendar as exceções identificadas da nova série
        for (const m of migrationMapping) {
          if (m.isException) {
            const normStart = `${m.horario.slice(0, 5)}:00`
            const normEnd = `${m.horario_fim.slice(0, 5)}:00`

            const instanceUrl = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(m.newGoogleEventId as string)}`
            const patchInstanceResponse = await fetch(instanceUrl, {
              method: 'PATCH',
              headers: {
                Authorization: `Bearer ${googleAccessToken}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                summary: m.titulo,
                start: {
                  dateTime: `${m.data}T${normStart}`,
                  timeZone: TIME_ZONE
                },
                end: {
                  dateTime: `${m.data}T${normEnd}`,
                  timeZone: TIME_ZONE
                }
              })
            })

            if (!patchInstanceResponse.ok) {
              console.error(`Falha ao recriar exceção da nova série no Google para data ${m.logicalDate}:`, await patchInstanceResponse.text())
              
              const rollbackResult = await performGoogleRollback()
              if (!rollbackResult.success) {
                return jsonResponse(
                  {
                    error: 'Falha crítica: A recriação das exceções falhou e o rollback no Google Agenda também falhou (pendente de reconciliação).'
                  },
                  500
                )
              }

              return jsonResponse({ error: `Não foi possível recriar a exceção na nova série para a data ${m.logicalDate}.` }, 400)
            }
          }
        }



        // Atualiza as apresentações locais para apontar para a nova série e novas ocorrências
        for (const m of migrationMapping) {
          const updatePayload: Record<string, any> = {
            google_event_id: m.newGoogleEventId,
            google_recurring_event_id: newSeriesEvent.id,
            google_original_start_at: m.newOriginalStartAt,
            meet_link: meetLink
          }

          if (!m.isException) {
            updatePayload.titulo = title
            updatePayload.horario = startTime
            updatePayload.horario_fim = endTime
          }

          const { error: updateErr } = await supabaseAdmin
            .from('apresentacoes')
            .update(updatePayload)
            .eq('id', m.localPresentationId)

          if (updateErr) {
            console.error(`Falha ao atualizar apresentação local ${m.localPresentationId} no split:`, updateErr)
            
            let isLocalRollbackSuccess = true
            // Reverte as alterações locais já realizadas
            for (const oldVal of oldLocalValues) {
              if (updatedLocalIds.includes(oldVal.id)) {
                const { error: rollbackErr } = await supabaseAdmin
                  .from('apresentacoes')
                  .update({
                    google_event_id: oldVal.google_event_id,
                    google_recurring_event_id: oldVal.google_recurring_event_id,
                    google_original_start_at: oldVal.google_original_start_at,
                    titulo: oldVal.titulo,
                    data: oldVal.data,
                    horario: oldVal.horario,
                    horario_fim: oldVal.horario_fim,
                    meet_link: oldVal.meet_link
                  })
                  .eq('id', oldVal.id)

                if (rollbackErr) {
                  console.error(`Falha crítica ao reverter apresentação local ${oldVal.id}:`, rollbackErr)
                  isLocalRollbackSuccess = false
                }
              }
            }

            const rollbackResult = await performGoogleRollback()

            if (!rollbackResult.success || !isLocalRollbackSuccess) {
              return jsonResponse(
                {
                  error: 'Falha crítica: A atualização local falhou e o rollback (local ou no Google Agenda) falhou (pendente de reconciliação).'
                },
                500
              )
            }

            return jsonResponse({ error: `Não foi possível atualizar a apresentação local vinculada à data ${m.logicalDate}.` }, 400)
          }

          updatedLocalIds.push(m.localPresentationId)
        }
      }

      // Remove as ocorrências locais normais da série antiga que ficaram de fora do migrationMapping
      const localIdsToDelete = (localMatches || [])
        .filter((loc: any) => !relevantLocalOccurrences.some((r: any) => r.id === loc.id))
        .map((loc: any) => loc.id)

      if (localIdsToDelete.length > 0) {
        const { error: deleteErr } = await supabaseAdmin
          .from('apresentacoes')
          .delete()
          .in('id', localIdsToDelete)

        if (deleteErr) {
          console.error('Falha ao remover ocorrências locais normais obsoletas:', deleteErr)

          let isLocalRollbackSuccess = true
          // Reverte as alterações locais já realizadas
          for (const oldVal of oldLocalValues) {
            if (updatedLocalIds.includes(oldVal.id)) {
              const { error: rollbackErr } = await supabaseAdmin
                .from('apresentacoes')
                .update({
                  google_event_id: oldVal.google_event_id,
                  google_recurring_event_id: oldVal.google_recurring_event_id,
                  google_original_start_at: oldVal.google_original_start_at,
                  titulo: oldVal.titulo,
                  data: oldVal.data,
                  horario: oldVal.horario,
                  horario_fim: oldVal.horario_fim,
                  meet_link: oldVal.meet_link
                })
                .eq('id', oldVal.id)

              if (rollbackErr) {
                console.error(`Falha crítica ao reverter apresentação local ${oldVal.id}:`, rollbackErr)
                isLocalRollbackSuccess = false
              }
            }
          }

          const rollbackResult = await performGoogleRollback()

          if (!rollbackResult.success || !isLocalRollbackSuccess) {
            return jsonResponse(
              {
                error: 'Falha crítica: A atualização local falhou e o rollback (local ou no Google Agenda) falhou (pendente de reconciliação).'
              },
              500
            )
          }

          return jsonResponse({ error: 'Não foi possível concluir a divisão da série devido à falha na remoção das ocorrências locais obsoletas.' }, 400)
        }
      }

      return jsonResponse(
        {
          success: true,
          message: 'Série dividida com sucesso no Google.',
          splitDetails: {
            oldSeriesId: presentation.google_recurring_event_id,
            oldSeriesNewRrule: newOldRrule,
            newSeriesId: newSeriesEvent.id,
            newSeriesMeetLink: meetLink,
            newSeriesStartDate: referenceDate,
            newSeriesStartTime: startTime,
            newSeriesEndTime: endTime,
            newSeriesTitle: title,
            newSeriesRecurrence: newSeriesRecurrence,
            newSeriesBody: newSeriesBody,
            futureExceptionsCount: futureExceptions.length,
            localPreservedCount: relevantLocalOccurrences.length,
            migrationMappingCount: migrationMapping.length,
            resolvedMappingCount: migrationMapping.filter(m => m.newGoogleEventId).length
          }
        },
        200
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