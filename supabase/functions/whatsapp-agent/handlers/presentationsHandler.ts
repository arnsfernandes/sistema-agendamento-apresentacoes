import { parseSaoPauloDateTime } from '../../_shared/dateUtils.ts'

export async function handlePresentationTool(
  supabaseAdmin: any,
  userId: string,
  googleIntegracaoId: number,
  name: string,
  args: any,
  contextData: any
) {
  if (name === 'list_presentations') {
    let { start_date, end_date } = args
    if (start_date.includes('T')) start_date = start_date.split('T')[0]
    if (end_date.includes('T')) end_date = end_date.split('T')[0]

    // Pré-sincroniza do Google Agenda para o Supabase
    try {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')
      const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
      if (supabaseUrl && serviceRoleKey) {
        const syncResponse = await fetch(`${supabaseUrl}/functions/v1/google-calendar-sync-apply`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${serviceRoleKey}`,
            'x-user-id': userId
          },
          body: JSON.stringify({
            startDate: start_date,
            endDate: end_date
          })
        })
        if (!syncResponse.ok) {
          console.warn(`Pré-sincronização list_presentations retornou status ${syncResponse.status}`)
        }
      }
    } catch (syncErr) {
      console.error('Erro ao pré-sincronizar list_presentations:', syncErr)
    }

    const { data, error } = await supabaseAdmin
      .from('apresentacoes')
      .select('id, titulo, data, horario, horario_fim')
      .eq('user_id', userId)
      .eq('google_integracao_id', googleIntegracaoId)
      .gte('data', start_date)
      .lte('data', end_date)
      .order('data', { ascending: true })
      .order('horario', { ascending: true })

    if (error) throw error
    return data || []
  }

  if (name === 'get_presentation_details') {
    const { presentation_id } = args
    const { data, error } = await supabaseAdmin
      .from('apresentacoes')
      .select('id, titulo, data, horario, horario_fim, meet_link')
      .eq('id', presentation_id)
      .eq('user_id', userId)
      .eq('google_integracao_id', googleIntegracaoId)
      .maybeSingle()

    if (error) throw error
    return data || { error: 'Reunião não encontrada ou não pertence ao usuário.' }
  }

  if (name === 'prepare_create_presentation') {
    const { title, date, startTime, endTime, isRecurring, recurringDays, recurrenceEndOption, recurrenceEndDate } = args

    const pendingAction = {
      type: 'create_presentation',
      title,
      date,
      startTime,
      endTime,
      isRecurring: !!isRecurring,
      recurringDays: Array.isArray(recurringDays) ? recurringDays : [],
      recurrenceEndOption: recurrenceEndOption || 'never',
      recurrenceEndDate: recurrenceEndDate || '',
      timestamp: new Date().toISOString()
    }

    const { error: saveError } = await supabaseAdmin
      .from('whatsapp_agent_context')
      .upsert({
        user_id: userId,
        pending_action: pendingAction,
        previous_response_id: contextData?.previous_response_id || null,
        updated_at: new Date().toISOString()
      })

    if (saveError) throw saveError

    let summary = `Ação de criar reunião comercial "${title}" no dia ${date} das ${startTime} às ${endTime}`
    if (isRecurring) {
      const daysLabel = recurringDays?.join(', ') || ''
      const endLabel = recurrenceEndOption === 'date' && recurrenceEndDate ? ` até ${recurrenceEndDate}` : ' sem data de término'
      summary += ` [Recorrência semanal às ${daysLabel}${endLabel}]`
    }

    return {
      status: 'pending_confirmation',
      message: `${summary} salva como pendente. Aguardando confirmação do usuário.`
    }
  }

  if (name === 'confirm_create_presentation') {
    const pendingAction = contextData?.pending_action

    if (!pendingAction || pendingAction.type !== 'create_presentation') {
      return { error: 'Não há nenhuma ação de criação de reunião pendente ou a pendência expirou.' }
    }

    try {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')
      const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

      const response = await fetch(`${supabaseUrl}/functions/v1/google-presentation-create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${serviceRoleKey}`,
          'x-user-id': userId
        },
        body: JSON.stringify({
          title: pendingAction.title,
          date: pendingAction.date,
          startTime: pendingAction.startTime,
          endTime: pendingAction.endTime,
          isRecurring: pendingAction.isRecurring,
          recurringDays: pendingAction.recurringDays,
          recurrenceEndOption: pendingAction.recurrenceEndOption,
          recurrenceEndDate: pendingAction.recurrenceEndDate
        })
      })

      const responseData = await response.json()

      if (!response.ok || responseData.error) {
        throw new Error(responseData.error || 'Erro desconhecido ao criar apresentação no Google.')
      }
      // Se for recorrente, dispara a sincronização inicial das primeiras ocorrências do mês de início
      if (pendingAction.isRecurring) {
        try {
          const presentationDateObj = new Date(pendingAction.date + 'T00:00:00')
          const y = presentationDateObj.getFullYear()
          const m = presentationDateObj.getMonth()
          const startDate = `${y}-${String(m + 1).padStart(2, '0')}-01`
          const next = new Date(y, m + 1, 1)
          const endDate = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}-01`

          await fetch(`${supabaseUrl}/functions/v1/google-calendar-sync-apply`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${serviceRoleKey}`,
              'x-user-id': userId
            },
            body: JSON.stringify({ startDate, endDate })
          })
        } catch (syncErr) {
          console.error('Erro ao rodar sincronização automática pós-criação da recorrência:', syncErr)
        }
      }

      await supabaseAdmin
        .from('whatsapp_agent_context')
        .upsert({
          user_id: userId,
          pending_action: null,
          previous_response_id: contextData?.previous_response_id || null,
          updated_at: new Date().toISOString()
        })

      return {
        status: 'success',
        message: 'Reunião comercial criada com sucesso.',
        presentation: responseData.presentation
      }
    } catch (err: any) {
      await supabaseAdmin
        .from('whatsapp_agent_context')
        .upsert({
          user_id: userId,
          pending_action: null,
          previous_response_id: contextData?.previous_response_id || null,
          updated_at: new Date().toISOString()
        })

      return {
        status: 'error',
        message: `Falha ao criar reunião: ${err.message}`
      }
    }
  }

  if (name === 'cancel_create_presentation') {
    await supabaseAdmin
      .from('whatsapp_agent_context')
      .upsert({
        user_id: userId,
        pending_action: null,
        previous_response_id: contextData?.previous_response_id || null,
        updated_at: new Date().toISOString()
      })

    return {
      status: 'canceled',
      message: 'Ação pendente de criação de reunião cancelada e removida com sucesso.'
    }
  }

  if (name === 'prepare_update_presentation') {
    const { presentationId, title, date, startTime, endTime, editScope } = args

    // Fetch original presentation to get fallback values and etag
    const { data: original, error: fetchErr } = await supabaseAdmin
      .from('apresentacoes')
      .select('titulo, data, horario, horario_fim, google_event_updated_at')
      .eq('id', presentationId)
      .single()

    if (fetchErr || !original) {
      return { error: 'Reunião comercial não encontrada.' }
    }

    const pendingAction = {
      type: 'update_presentation',
      presentationId,
      title: (title && typeof title === 'string' && title.trim()) ? title.trim() : original.titulo,
      date: (date && typeof date === 'string' && date.trim()) ? date.trim() : original.data,
      startTime: (startTime && typeof startTime === 'string' && startTime.trim()) ? startTime.trim() : original.horario.slice(0, 5),
      endTime: (endTime && typeof endTime === 'string' && endTime.trim()) ? endTime.trim() : original.horario_fim.slice(0, 5),
      etag: null,
      editScope: editScope || 'occurrence',
      timestamp: new Date().toISOString()
    }

    const { error: saveError } = await supabaseAdmin
      .from('whatsapp_agent_context')
      .upsert({
        user_id: userId,
        pending_action: pendingAction,
        previous_response_id: contextData?.previous_response_id || null,
        updated_at: new Date().toISOString()
      })

    if (saveError) throw saveError

    return {
      status: 'pending_confirmation',
      message: `Ação de editar reunião comercial de ID ${presentationId} salva como pendente. Aguardando confirmação.`
    }
  }

  if (name === 'confirm_update_presentation') {
    const pendingAction = contextData?.pending_action

    if (!pendingAction || pendingAction.type !== 'update_presentation') {
      return { error: 'Não há nenhuma ação de edição de reunião pendente ou a pendência expirou.' }
    }

    try {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')
      const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

      const response = await fetch(`${supabaseUrl}/functions/v1/google-presentation-update`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${serviceRoleKey}`,
          'x-user-id': userId
        },
        body: JSON.stringify({
          presentationId: pendingAction.presentationId,
          title: pendingAction.title,
          date: pendingAction.date,
          startTime: pendingAction.startTime,
          endTime: pendingAction.endTime,
          etag: pendingAction.etag,
          editScope: pendingAction.editScope
        })
      })

      const responseData = await response.json()

      if (!response.ok || responseData.error) {
        throw new Error(responseData.error || 'Erro desconhecido ao atualizar apresentação no Google.')
      }

      await supabaseAdmin
        .from('whatsapp_agent_context')
        .upsert({
          user_id: userId,
          pending_action: null,
          previous_response_id: contextData?.previous_response_id || null,
          updated_at: new Date().toISOString()
        })

      return {
        status: 'success',
        message: 'Reunião comercial atualizada com sucesso.',
        presentation: responseData.presentation
      }
    } catch (err: any) {
      await supabaseAdmin
        .from('whatsapp_agent_context')
        .upsert({
          user_id: userId,
          pending_action: null,
          previous_response_id: contextData?.previous_response_id || null,
          updated_at: new Date().toISOString()
        })

      return {
        status: 'error',
        message: `Falha ao editar reunião: ${err.message}`
      }
    }
  }

  if (name === 'cancel_update_presentation') {
    await supabaseAdmin
      .from('whatsapp_agent_context')
      .upsert({
        user_id: userId,
        pending_action: null,
        previous_response_id: contextData?.previous_response_id || null,
        updated_at: new Date().toISOString()
      })

    return {
      status: 'canceled',
      message: 'Ação pendente de edição de reunião cancelada e removida com sucesso.'
    }
  }

  if (name === 'prepare_delete_presentation') {
    const { presentationId, deleteParticipants, deleteScope } = args

    // Fetch original presentation to get details for confirmation message
    const { data: original, error: fetchErr } = await supabaseAdmin
      .from('apresentacoes')
      .select('titulo, data, horario')
      .eq('id', presentationId)
      .single()

    if (fetchErr || !original) {
      return { error: 'Reunião comercial não encontrada.' }
    }

    const pendingAction = {
      type: 'delete_presentation',
      presentationId,
      deleteParticipants: !!deleteParticipants,
      deleteScope: deleteScope || 'occurrence',
      title: original.titulo,
      date: original.data,
      startTime: original.horario.slice(0, 5),
      timestamp: new Date().toISOString()
    }

    const { error: saveError } = await supabaseAdmin
      .from('whatsapp_agent_context')
      .upsert({
        user_id: userId,
        pending_action: pendingAction,
        previous_response_id: contextData?.previous_response_id || null,
        updated_at: new Date().toISOString()
      })

    if (saveError) throw saveError

    return {
      status: 'pending_confirmation',
      message: `Ação de excluir a reunião comercial de ID ${presentationId} salva como pendente. Aguardando confirmação.`
    }
  }

  if (name === 'confirm_delete_presentation') {
    const pendingAction = contextData?.pending_action

    if (!pendingAction || pendingAction.type !== 'delete_presentation') {
      return { error: 'Não há nenhuma ação de exclusão de reunião pendente ou a pendência expirou.' }
    }

    try {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')
      const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

      const response = await fetch(`${supabaseUrl}/functions/v1/google-presentation-delete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${serviceRoleKey}`,
          'x-user-id': userId
        },
        body: JSON.stringify({
          presentationId: pendingAction.presentationId,
          deleteParticipants: pendingAction.deleteParticipants,
          deleteScope: pendingAction.deleteScope
        })
      })

      const rawText = await response.text()
      console.log('google-presentation-delete response status:', response.status, 'body:', rawText)

      let responseData: any = {}
      try {
        responseData = JSON.parse(rawText)
      } catch (jsonErr) {
        throw new Error(`Status ${response.status}: Resposta não-JSON do servidor de exclusão: ${rawText.slice(0, 100)}`)
      }

      if (!response.ok || responseData.error) {
        throw new Error(responseData.error || `Status ${response.status}: Erro ao excluir apresentação.`)
      }

      await supabaseAdmin
        .from('whatsapp_agent_context')
        .upsert({
          user_id: userId,
          pending_action: null,
          previous_response_id: contextData?.previous_response_id || null,
          updated_at: new Date().toISOString()
        })

      return {
        status: 'success',
        message: 'Reunião comercial excluída com sucesso.',
        presentationId: pendingAction.presentationId
      }
    } catch (err: any) {
      await supabaseAdmin
        .from('whatsapp_agent_context')
        .upsert({
          user_id: userId,
          pending_action: null,
          previous_response_id: contextData?.previous_response_id || null,
          updated_at: new Date().toISOString()
        })

      return {
        status: 'error',
        message: `Falha ao excluir reunião: ${err.message}`
      }
    }
  }

  if (name === 'cancel_delete_presentation') {
    await supabaseAdmin
      .from('whatsapp_agent_context')
      .upsert({
        user_id: userId,
        pending_action: null,
        previous_response_id: contextData?.previous_response_id || null,
        updated_at: new Date().toISOString()
      })

    return {
      status: 'canceled',
      message: 'Ação pendente de exclusão de reunião cancelada e removida com sucesso.'
    }
  }

  if (name === 'prepare_move_and_delete_presentation') {
    const { sourcePresentationId, targetPresentationId } = args

    // Fetch original source and target presentations
    const { data: source, error: sourceErr } = await supabaseAdmin
      .from('apresentacoes')
      .select('titulo, data, horario')
      .eq('id', sourcePresentationId)
      .single()

    const { data: target, error: targetErr } = await supabaseAdmin
      .from('apresentacoes')
      .select('titulo, data, horario')
      .eq('id', targetPresentationId)
      .single()

    if (sourceErr || !source || targetErr || !target) {
      return { error: 'Reunião comercial de origem ou de destino não encontrada.' }
    }

    const pendingAction = {
      type: 'move_and_delete_presentation',
      sourcePresentationId,
      targetPresentationId,
      sourceTitle: source.titulo,
      sourceDate: source.data,
      sourceStartTime: source.horario.slice(0, 5),
      targetTitle: target.titulo,
      targetDate: target.data,
      targetStartTime: target.horario.slice(0, 5),
      timestamp: new Date().toISOString()
    }

    const { error: saveError } = await supabaseAdmin
      .from('whatsapp_agent_context')
      .upsert({
        user_id: userId,
        pending_action: pendingAction,
        previous_response_id: contextData?.previous_response_id || null,
        updated_at: new Date().toISOString()
      })

    if (saveError) throw saveError

    return {
      status: 'pending_confirmation',
      message: `Ação de mover participantes da reunião ID ${sourcePresentationId} para reunião ID ${targetPresentationId} e excluir a origem salva como pendente. Aguardando confirmação.`
    }
  }

  if (name === 'confirm_move_and_delete_presentation') {
    const pendingAction = contextData?.pending_action

    if (!pendingAction || pendingAction.type !== 'move_and_delete_presentation') {
      return { error: 'Não há nenhuma ação de mover participantes pendente ou a pendência expirou.' }
    }

    try {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')
      const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

      const response = await fetch(`${supabaseUrl}/functions/v1/google-presentation-move-and-delete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${serviceRoleKey}`,
          'x-user-id': userId
        },
        body: JSON.stringify({
          sourcePresentationId: pendingAction.sourcePresentationId,
          targetPresentationId: pendingAction.targetPresentationId
        })
      })

      const responseData = await response.json()

      if (!response.ok || responseData.error) {
        throw new Error(responseData.error || 'Erro desconhecido ao mover participantes e excluir apresentação de origem.')
      }

      await supabaseAdmin
        .from('whatsapp_agent_context')
        .upsert({
          user_id: userId,
          pending_action: null,
          previous_response_id: contextData?.previous_response_id || null,
          updated_at: new Date().toISOString()
        })

      return {
        status: 'success',
        message: 'Participantes movidos e reunião de origem excluída com sucesso.',
        sourcePresentationId: pendingAction.sourcePresentationId,
        targetPresentationId: pendingAction.targetPresentationId
      }
    } catch (err: any) {
      await supabaseAdmin
        .from('whatsapp_agent_context')
        .upsert({
          user_id: userId,
          pending_action: null,
          previous_response_id: contextData?.previous_response_id || null,
          updated_at: new Date().toISOString()
        })

      return {
        status: 'error',
        message: `Falha ao mover participantes e excluir: ${err.message}`
      }
    }
  }

  if (name === 'cancel_move_and_delete_presentation') {
    await supabaseAdmin
      .from('whatsapp_agent_context')
      .upsert({
        user_id: userId,
        pending_action: null,
        previous_response_id: contextData?.previous_response_id || null,
        updated_at: new Date().toISOString()
      })

    return {
      status: 'canceled',
      message: 'Ação pendente de mover participantes e excluir cancelada e removida com sucesso.'
    }
  }

  throw new Error(`Presentation handler: Unknown tool name "${name}"`)
}
