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
          'items(id,status,summary,updated,recurringEventId,originalStartTime,hangoutLink,start,end,conferenceData),nextPageToken',
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

    const equal: Array<{
      presentationId: number
      googleEventId: string
      remoteUpdated: string | null
      googleRecurringEventId: string | null
      googleOriginalStartAt: string | null
    }> = []

    const changed: Array<{
      presentationId: number
      googleEventId: string
      remoteUpdated: string | null
      googleRecurringEventId: string | null
      googleOriginalStartAt: string | null
      diffFields: string[]
      remoteTitle: string
      remoteDate: string
      remoteTime: string
      remoteTimeEnd: string
      remoteMeetLink: string
    }> = []

    const googleOnly: Array<{
      googleEventId: string
      title: string
      date: string
      time: string
      timeEnd: string
      meetLink: string | null
      googleUpdatedAt: string | null
      googleRecurringEventId: string | null
      googleOriginalStartAt: string | null
    }> = []

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
        const remoteMeetLink = getMeetLink(remote) || ''

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
        if ((local.meet_link || '') !== remoteMeetLink) {
          diffFields.push('meetLink')
        }

        const basePayload = {
          presentationId: local.id,
          googleEventId: local.google_event_id,
          remoteUpdated: remote.updated || null,
          googleRecurringEventId: remote.recurringEventId || null,
          googleOriginalStartAt: remote.originalStartTime?.dateTime || null,
        }

        if (diffFields.length === 0) {
          equal.push(basePayload)
        } else {
          changed.push({
            ...basePayload,
            diffFields,
            remoteTitle: (remote.summary || '').trim(),
            remoteDate: remoteStart?.date || '',
            remoteTime: remoteStartStr,
            remoteTimeEnd: remoteEndStr,
            remoteMeetLink,
          })
        }
      }
    }

    // Identificar googleOnly (incluindo ocorrências recorrentes)
    for (const remote of activeGoogleEvents) {
      if (!googleMatchedIds.has(remote.id as string)) {
        const remoteStart = getGoogleDateTimeParts(remote.start?.dateTime)
        const remoteEnd = getGoogleDateTimeParts(remote.end?.dateTime)

        let googleRecurringEventId = remote.recurringEventId || null
        if (!googleRecurringEventId && remote.id && remote.originalStartTime) {
          const parts = remote.id.split('_')
          if (parts.length > 1) {
            const suffix = parts[parts.length - 1]
            const isTimestampSuffix = /^\d{8}$/.test(suffix) || /^\d{8}T\d{6}Z$/.test(suffix)
            if (isTimestampSuffix) {
              googleRecurringEventId = parts.slice(0, -1).join('_')
            }
          }
        }

        googleOnly.push({
          googleEventId: remote.id || '',
          title: remote.summary || 'Apresentação sem título',
          date: remoteStart?.date || '',
          time: remoteStart?.time || '',
          timeEnd: remoteEnd?.time || '',
          meetLink: getMeetLink(remote),
          googleUpdatedAt: remote.updated || null,
          googleRecurringEventId,
          googleOriginalStartAt: remote.originalStartTime?.dateTime || null,
        })
      }
    }

    // Identificar deletedOnGoogle: confirmar individualmente no Google antes de classificar
    const deletedWithoutParticipants: Array<{
      presentationId: number
      googleEventId: string
    }> = []

    const deletedPending: Array<{
      presentationId: number
      googleEventId: string
    }> = []

    const movedOutsidePeriod: Array<{
      presentationId: number
      googleEventId: string
      remoteUpdated: string | null
      remoteTitle: string
      remoteDate: string
      remoteTime: string
      remoteTimeEnd: string
      remoteMeetLink: string
      googleRecurringEventId: string | null
      googleOriginalStartAt: string | null
      diffFields?: string[]
    }> = []

    for (const local of localPresentations || []) {
      if (!local.google_event_id) continue
      if (localMatchedIds.has(local.google_event_id)) continue

      // Consulta individual no Google Calendar para confirmar situação do evento
      const eventUrl =
        `https://www.googleapis.com/calendar/v3/calendars/` +
        `${encodeURIComponent(calendarId)}/events/${encodeURIComponent(local.google_event_id)}`

      const eventResponse = await fetch(eventUrl, {
        headers: { Authorization: `Bearer ${googleAccessToken}` },
      })

      // 404 ou 410 = evento definitivamente não existe no Google
      let remoteEventData: GoogleCalendarEvent | null = null
      if (eventResponse.ok) {
        remoteEventData = (await eventResponse.json()) as GoogleCalendarEvent
      }

      const isConfirmedDeleted =
        eventResponse.status === 404 ||
        eventResponse.status === 410 ||
        (remoteEventData?.status === 'cancelled')



      if (!isConfirmedDeleted) {
        // Evento existe mas está fora do período — movedOutsidePeriod
        if (
          remoteEventData &&
          remoteEventData.start?.dateTime &&
          remoteEventData.end?.dateTime
        ) {
          const remoteStart = getGoogleDateTimeParts(remoteEventData.start.dateTime)
          const remoteEnd = getGoogleDateTimeParts(remoteEventData.end.dateTime)
          const remoteMeetLink = getMeetLink(remoteEventData) || ''



          // Evento atravessa a meia-noite — não atualizar, marcar como pendente
          if (remoteStart?.date !== remoteEnd?.date) {
            await supabaseAdmin
              .from('apresentacoes')
              .update({
                sync_status: 'pending',
                sync_error: 'A reunião atravessa a meia-noite. Ajuste o horário no Google Agenda.',
              })
              .eq('id', local.id)
            continue
          }

          const localStartStr = local.horario.slice(0, 5)
          const localEndStr = local.horario_fim.slice(0, 5)
          const remoteStartStr = remoteStart?.time || ''
          const remoteEndStr = remoteEnd?.time || ''

          const diffFields: string[] = []
          if (local.titulo.trim() !== (remoteEventData.summary || '').trim()) diffFields.push('title')
          if (local.data !== remoteStart?.date) diffFields.push('date')
          if (localStartStr !== remoteStartStr) diffFields.push('time')
          if (localEndStr !== remoteEndStr) diffFields.push('timeEnd')
          if ((local.meet_link || '') !== remoteMeetLink) diffFields.push('meetLink')

          movedOutsidePeriod.push({
            presentationId: local.id,
            googleEventId: local.google_event_id,
            remoteUpdated: remoteEventData.updated || null,
            remoteTitle: (remoteEventData.summary || '').trim(),
            remoteDate: remoteStart?.date || '',
            remoteTime: remoteStartStr,
            remoteTimeEnd: remoteEndStr,
            remoteMeetLink,
            diffFields,
            googleRecurringEventId: remoteEventData.recurringEventId || null,
            googleOriginalStartAt: remoteEventData.originalStartTime?.dateTime || null,
          })
        }
        continue
      }

      // Confirmado como excluído — verificar se tem participações
      const { data: participacoes } = await supabaseAdmin
        .from('participacoes')
        .select('id')
        .eq('apresentacao_id', local.id)
        .limit(1)

      if (!participacoes || participacoes.length === 0) {
        deletedWithoutParticipants.push({ presentationId: local.id, googleEventId: local.google_event_id })
      } else {
        deletedPending.push({ presentationId: local.id, googleEventId: local.google_event_id })
      }
    }

    const nowIso = new Date().toISOString()
    let equalUpdatedCount = 0
    let changedUpdatedCount = 0
    let changedConflictCount = 0
    let googleOnlyCreatedCount = 0
    let deletedWithoutParticipantsCount = 0
    let deletedPendingCount = 0
    let movedOutsidePeriodUpdatedCount = 0
    let movedOutsidePeriodConflictCount = 0
    const operationErrors: Array<{ type: string; id: string | number; message: string }> = []

    // Aplicar sincronização para EQUAL
    for (const item of equal) {
      const { error: updateError } = await supabaseAdmin
        .from('apresentacoes')
        .update({
          sync_status: 'synced',
          last_synced_at: nowIso,
          sync_error: null,
          google_event_updated_at: item.remoteUpdated,
          google_recurring_event_id: item.googleRecurringEventId,
          google_original_start_at: item.googleOriginalStartAt,
        })
        .eq('id', item.presentationId)

      if (!updateError) {
        equalUpdatedCount++
      } else {
        const errorMsg = updateError.message || 'Erro de atualização'
        operationErrors.push({
          type: 'update_equal',
          id: item.presentationId,
          message: errorMsg,
        })

        await supabaseAdmin
          .from('apresentacoes')
          .update({
            sync_status: 'error',
            sync_error: errorMsg.slice(0, 200),
          })
          .eq('id', item.presentationId)
      }
    }

    // Aplicar sincronização para CHANGED
    for (const item of changed) {
      const newDate = item.remoteDate as string
      const newTime = item.remoteTime as string
      const newTimeEnd = item.remoteTimeEnd as string

      // Verificar conflito de horário com outras apresentações no mesmo dia,
      // ignorando a própria apresentação sendo atualizada.
      const { data: conflicts } = await supabaseAdmin
        .from('apresentacoes')
        .select('id')
        .eq('data', newDate)
        .neq('id', item.presentationId)
        .lt('horario', `${newTimeEnd}:00`)
        .gt('horario_fim', `${newTime}:00`)

      if (conflicts && conflicts.length > 0) {
        // Conflito detectado — marcar como pendente sem alterar dados
        changedConflictCount++
        const conflictMsg = `Conflito de horário com outra apresentação em ${newDate}.`
        operationErrors.push({
          type: 'changed_conflict',
          id: item.presentationId,
          message: conflictMsg,
        })

        await supabaseAdmin
          .from('apresentacoes')
          .update({
            sync_status: 'pending',
            sync_error: conflictMsg,
          })
          .eq('id', item.presentationId)

        continue
      }

      // Sem conflito — aplicar dados remotos
      const { error: updateError } = await supabaseAdmin
        .from('apresentacoes')
        .update({
          titulo: item.remoteTitle,
          data: newDate,
          horario: `${newTime}:00`,
          horario_fim: `${newTimeEnd}:00`,
          meet_link: item.remoteMeetLink || null,
          google_event_updated_at: item.remoteUpdated,
          google_recurring_event_id: item.googleRecurringEventId,
          google_original_start_at: item.googleOriginalStartAt,
          sync_status: 'synced',
          last_synced_at: nowIso,
          sync_error: null,
        })
        .eq('id', item.presentationId)

      if (updateError) {
        const errorMsg = updateError.message || 'Erro ao atualizar apresentação'
        operationErrors.push({
          type: 'update_changed',
          id: item.presentationId,
          message: errorMsg,
        })

        await supabaseAdmin
          .from('apresentacoes')
          .update({
            sync_status: 'error',
            sync_error: errorMsg.slice(0, 200),
          })
          .eq('id', item.presentationId)

        continue
      }

      changedUpdatedCount++

      // Redefinir link_enviado nas participações se campos relevantes mudaram
      const diffFields = item.diffFields as string[]
      const linkRelevantFields = ['title', 'date', 'time', 'timeEnd', 'meetLink']
      const shouldResetLink = diffFields.some((f) => linkRelevantFields.includes(f))

      if (shouldResetLink) {
        await supabaseAdmin
          .from('participacoes')
          .update({ link_enviado: false })
          .eq('apresentacao_id', item.presentationId)
      }
    }

    // Aplicar sincronização para GOOGLEONLY (sem recorrência)
    for (const item of googleOnly) {
      const { error: insertError } = await supabaseAdmin
        .from('apresentacoes')
        .insert({
          titulo: item.title,
          data: item.date,
          horario: `${item.time}:00`,
          horario_fim: `${item.timeEnd}:00`,
          meet_link: item.meetLink,
          google_event_id: item.googleEventId,
          google_calendar_id: calendarId,
          google_event_updated_at: item.googleUpdatedAt,
          google_recurring_event_id: item.googleRecurringEventId,
          google_original_start_at: item.googleOriginalStartAt,
          sync_status: 'synced',
          last_synced_at: nowIso,
          sync_error: null,
          user_id: user.id,
          google_integracao_id: integration.google_integracao_id,
        })

      if (!insertError) {
        googleOnlyCreatedCount++
      } else {
        const errorMsg = insertError.message || 'Erro de inserção'
        operationErrors.push({
          type: 'insert_google_only',
          id: item.googleEventId,
          message: errorMsg,
        })
      }
    }

    // Aplicar exclusão para DELETED_WITHOUT_PARTICIPANTS
    for (const item of deletedWithoutParticipants) {
      const { error: deleteError } = await supabaseAdmin
        .from('apresentacoes')
        .delete()
        .eq('id', item.presentationId)

      if (!deleteError) {
        deletedWithoutParticipantsCount++
      } else {
        const errorMsg = deleteError.message || 'Erro ao excluir apresentação'
        operationErrors.push({
          type: 'delete_without_participants',
          id: item.presentationId,
          message: errorMsg,
        })
      }
    }

    // Marcar como excluído no Google para DELETED_PENDING
    for (const item of deletedPending) {
      const { error: updateError } = await supabaseAdmin
        .from('apresentacoes')
        .update({
          sync_status: 'google_deleted',
          last_synced_at: nowIso,
          sync_error: 'Evento excluído no Google Agenda',
        })
        .eq('id', item.presentationId)

      if (!updateError) {
        deletedPendingCount++
      } else {
        const errorMsg = updateError.message || 'Erro ao marcar exclusão pendente'
        operationErrors.push({
          type: 'update_deleted_pending',
          id: item.presentationId,
          message: errorMsg,
        })
      }
    }

    // Aplicar sincronização para MOVED_OUTSIDE_PERIOD
    for (const item of movedOutsidePeriod) {
      const newDate = item.remoteDate as string
      const newTime = item.remoteTime as string
      const newTimeEnd = item.remoteTimeEnd as string

      // Verificar conflito de horário (mesma lógica de changed)
      const { data: conflicts } = await supabaseAdmin
        .from('apresentacoes')
        .select('id')
        .eq('data', newDate)
        .neq('id', item.presentationId)
        .lt('horario', `${newTimeEnd}:00`)
        .gt('horario_fim', `${newTime}:00`)

      if (conflicts && conflicts.length > 0) {
        movedOutsidePeriodConflictCount++
        const conflictMsg = `Conflito de horário com outra apresentação em ${newDate}.`
        operationErrors.push({
          type: 'moved_conflict',
          id: item.presentationId,
          message: conflictMsg,
        })

        await supabaseAdmin
          .from('apresentacoes')
          .update({
            sync_status: 'pending',
            sync_error: conflictMsg,
          })
          .eq('id', item.presentationId)

        continue
      }

      // Sem conflito — aplicar dados remotos
      const { error: updateError } = await supabaseAdmin
        .from('apresentacoes')
        .update({
          titulo: item.remoteTitle,
          data: newDate,
          horario: `${newTime}:00`,
          horario_fim: `${newTimeEnd}:00`,
          meet_link: item.remoteMeetLink || null,
          google_event_updated_at: item.remoteUpdated,
          google_recurring_event_id: item.googleRecurringEventId,
          google_original_start_at: item.googleOriginalStartAt,
          sync_status: 'synced',
          last_synced_at: nowIso,
          sync_error: null,
        })
        .eq('id', item.presentationId)

      if (updateError) {
        const errorMsg = updateError.message || 'Erro ao atualizar apresentação movida'
        operationErrors.push({
          type: 'update_moved',
          id: item.presentationId,
          message: errorMsg,
        })

        await supabaseAdmin
          .from('apresentacoes')
          .update({
            sync_status: 'error',
            sync_error: errorMsg.slice(0, 200),
          })
          .eq('id', item.presentationId)

        continue
      }

      movedOutsidePeriodUpdatedCount++
    }

    return jsonResponse({
      success: operationErrors.length === 0,
      applied: {
        equalUpdated: equalUpdatedCount,
        changedUpdated: changedUpdatedCount,
        changedConflicts: changedConflictCount,
        googleOnlyCreated: googleOnlyCreatedCount,
        deletedWithoutParticipants: deletedWithoutParticipantsCount,
        deletedPending: deletedPendingCount,
        movedOutsidePeriodUpdated: movedOutsidePeriodUpdatedCount,
        movedOutsidePeriodConflicts: movedOutsidePeriodConflictCount,
      },
      summary: {
        totalEqual: equal.length,
        totalChanged: changed.length,
        totalGoogleOnlyWithoutRecurrence: googleOnly.length,
        totalDeletedWithoutParticipants: deletedWithoutParticipants.length,
        totalDeletedPending: deletedPending.length,
        totalMovedOutsidePeriod: movedOutsidePeriod.length,
      },
      operationErrors,
    })
  } catch (error) {
    console.error('Erro inesperado na sincronização:', error)
    return jsonResponse(
      { error: 'Não foi possível aplicar a sincronização.' },
      500,
    )
  }
})
