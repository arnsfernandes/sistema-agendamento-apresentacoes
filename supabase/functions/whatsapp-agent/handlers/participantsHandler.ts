import { scheduleParticipant, rescheduleParticipant, cancelParticipant, reactivateParticipant, BusinessRuleError } from '../../_shared/scheduling.ts'

export async function handleParticipantTool(
  supabaseAdmin: any,
  userId: string,
  googleIntegracaoId: number,
  name: string,
  args: any,
  contextData: any
) {
  if (name === 'list_participants') {
    const presentation_id = args.presentation_id
    const status = args.status || 'ativo'
    // Verify presentation belongs to this user
    const { data: pres } = await supabaseAdmin
      .from('apresentacoes')
      .select('id')
      .eq('id', presentation_id)
      .eq('user_id', userId)
      .maybeSingle()

    if (!pres) {
      return { error: 'Reunião não encontrada ou não pertence ao usuário.' }
    }

    const { data, error } = await supabaseAdmin
      .from('participacoes')
      .select('id, status, link_enviado, observacao, clientes(nome, telefone)')
      .eq('apresentacao_id', presentation_id)
      .eq('status', status)

    if (error) throw error
    return data || []
  }

  if (name === 'prepare_schedule_participant') {
    const { client_id, presentation_id } = args

    // Verify client exists
    const { data: client } = await supabaseAdmin
      .from('clientes')
      .select('id, nome, telefone')
      .eq('id', client_id)
      .eq('user_id', userId)
      .maybeSingle()

    // Verify presentation exists
    const { data: presentation } = await supabaseAdmin
      .from('apresentacoes')
      .select('id, titulo, data, horario')
      .eq('id', presentation_id)
      .eq('user_id', userId)
      .maybeSingle()

    if (!client || !presentation) {
      return { error: 'Cliente ou reunião não encontrados no banco de dados.' }
    }

    // Save pending action in context
    const pendingAction = {
      type: 'schedule_participant',
      client_id,
      presentation_id,
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

    const start = presentation.horario ? presentation.horario.slice(0, 5) : '00:00'
    const dateParts = presentation.data.split('-')
    const formattedDate = `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}`
    return {
      status: 'pending_confirmation',
      message: `Ação de agendar "${client.nome}" na reunião "${presentation.titulo}" (${formattedDate} às ${start}) salva como pendente. Aguardando confirmação.`
    }
  }

  if (name === 'confirm_schedule_participant') {
    const pendingAction = contextData?.pending_action

    if (!pendingAction || pendingAction.type !== 'schedule_participant') {
      return { error: 'Não há nenhuma ação de agendamento pendente ou a pendência expirou.' }
    }

    try {
      const participation = await scheduleParticipant(
        supabaseAdmin,
        userId,
        googleIntegracaoId,
        {
          client_id: pendingAction.client_id,
          presentation_id: pendingAction.presentation_id
        }
      )

      // Clear pending action on success
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
        message: 'Agendamento efetivado com sucesso.',
        participation
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

      if (err.name === 'BusinessRuleError' || err instanceof BusinessRuleError) {
        return {
          status: 'error',
          code: err.code,
          message: `Falha de validação: ${err.message}`,
          details: err.details
        }
      }

      return {
        status: 'error',
        message: `Falha ao agendar participante: ${err.message}`
      }
    }
  }

  if (name === 'cancel_schedule_participant') {
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
      message: 'Ação pendente de agendamento de participante cancelada e removida com sucesso.'
    }
  }

  if (name === 'prepare_reschedule_participant') {
    const { participant_id, from_presentation_id, to_presentation_id } = args

    // Validate ownership/existence of source participation
    const { data: sourcePart } = await supabaseAdmin
      .from('participacoes')
      .select('id, apresentacao_id, clientes(nome)')
      .eq('id', participant_id)
      .eq('apresentacao_id', from_presentation_id)
      .maybeSingle()

    // Validate ownership/existence of presentations
    const { data: fromPres } = await supabaseAdmin
      .from('apresentacoes')
      .select('id, user_id, titulo, data, horario')
      .eq('id', from_presentation_id)
      .eq('user_id', userId)
      .maybeSingle()

    const { data: toPres } = await supabaseAdmin
      .from('apresentacoes')
      .select('id, user_id, titulo, data, horario')
      .eq('id', to_presentation_id)
      .eq('user_id', userId)
      .maybeSingle()

    if (!sourcePart || !fromPres || !toPres) {
      return { error: 'Reunião ou participação de origem/destino não encontradas no banco.' }
    }

    const pendingAction = {
      type: 'reschedule_participant',
      participant_id,
      from_presentation_id,
      to_presentation_id,
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

    const startTo = toPres.horario ? toPres.horario.slice(0, 5) : '00:00'
    const dateParts = toPres.data.split('-')
    const formattedToDate = `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}`
    return {
      status: 'pending_confirmation',
      message: `Ação de remarcar "${sourcePart.clientes?.nome}" de "${fromPres.titulo}" para "${toPres.titulo}" (${formattedToDate} às ${startTo}) salva como pendente. Aguardando confirmação.`
    }
  }

  if (name === 'confirm_reschedule_participant') {
    const pendingAction = contextData?.pending_action

    if (!pendingAction || pendingAction.type !== 'reschedule_participant') {
      return { error: 'Não há nenhuma ação de remarcação pendente ou a pendência expirou.' }
    }

    try {
      const participation = await rescheduleParticipant(
        supabaseAdmin,
        userId,
        googleIntegracaoId,
        {
          participant_id: pendingAction.participant_id,
          from_presentation_id: pendingAction.from_presentation_id,
          to_presentation_id: pendingAction.to_presentation_id
        }
      )

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
        message: 'Remarcação efetivada com sucesso.',
        participation
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

      if (err.name === 'BusinessRuleError' || err instanceof BusinessRuleError) {
        return {
          status: 'error',
          code: err.code,
          message: `Falha de validação: ${err.message}`,
          details: err.details
        }
      }

      return {
        status: 'error',
        message: `Falha ao remarcar participante: ${err.message}`
      }
    }
  }

  if (name === 'cancel_reschedule_participant') {
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
      message: 'Ação pendente de remarcação de participante cancelada e removida com sucesso.'
    }
  }

  if (name === 'prepare_cancel_participant') {
    const { participant_id, presentation_id } = args

    // Validate ownership/existence of presentation and participation
    const { data: pres } = await supabaseAdmin
      .from('apresentacoes')
      .select('id, titulo')
      .eq('id', presentation_id)
      .eq('user_id', userId)
      .maybeSingle()

    const { data: part } = await supabaseAdmin
      .from('participacoes')
      .select('id, apresentacao_id, clientes(nome)')
      .eq('id', participant_id)
      .eq('apresentacao_id', presentation_id)
      .maybeSingle()

    if (!pres || !part) {
      return { error: 'Participação ou reunião comercial não encontradas.' }
    }

    const pendingAction = {
      type: 'cancel_participant',
      participant_id,
      presentation_id,
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
      message: `Ação de cancelar a participação de "${part.clientes?.nome}" na reunião "${pres.titulo}" salva como pendente. Aguardando confirmação.`
    }
  }

  if (name === 'confirm_cancel_participant') {
    const pendingAction = contextData?.pending_action

    if (!pendingAction || pendingAction.type !== 'cancel_participant') {
      return { error: 'Não há nenhuma ação de cancelamento de participação pendente ou a pendência expirou.' }
    }

    try {
      const participation = await cancelParticipant(
        supabaseAdmin,
        userId,
        googleIntegracaoId,
        {
          participant_id: pendingAction.participant_id,
          presentation_id: pendingAction.presentation_id
        }
      )

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
        message: 'Cancelamento de participação efetivado com sucesso.',
        participation
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

      if (err.name === 'BusinessRuleError' || err instanceof BusinessRuleError) {
        return {
          status: 'error',
          code: err.code,
          message: `Falha de validação: ${err.message}`,
          details: err.details
        }
      }

      return {
        status: 'error',
        message: `Falha ao cancelar participação: ${err.message}`
      }
    }
  }

  if (name === 'cancel_cancel_participant') {
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
      message: 'Ação pendente de cancelamento de participação cancelada e removida com sucesso.'
    }
  }

  if (name === 'prepare_reactivate_participant') {
    const { participant_id, presentation_id } = args

    // Validate ownership/existence
    const { data: pres } = await supabaseAdmin
      .from('apresentacoes')
      .select('id, titulo')
      .eq('id', presentation_id)
      .eq('user_id', userId)
      .maybeSingle()

    const { data: part } = await supabaseAdmin
      .from('participacoes')
      .select('id, apresentacao_id, clientes(nome)')
      .eq('id', participant_id)
      .eq('apresentacao_id', presentation_id)
      .maybeSingle()

    if (!pres || !part) {
      return { error: 'Participação ou reunião comercial não encontradas.' }
    }

    const pendingAction = {
      type: 'reactivate_participant',
      participant_id,
      presentation_id,
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
      message: `Ação de reativar a participação de "${part.clientes?.nome}" na reunião "${pres.titulo}" salva como pendente. Aguardando confirmação.`
    }
  }

  if (name === 'confirm_reactivate_participant') {
    const pendingAction = contextData?.pending_action

    if (!pendingAction || pendingAction.type !== 'reactivate_participant') {
      return { error: 'Não há nenhuma ação de reativação pendente ou a pendência expirou.' }
    }

    try {
      const participation = await reactivateParticipant(
        supabaseAdmin,
        userId,
        googleIntegracaoId,
        {
          participant_id: pendingAction.participant_id,
          presentation_id: pendingAction.presentation_id
        }
      )

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
        message: 'Reativação de participação efetivada com sucesso.',
        participation
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

      if (err.name === 'BusinessRuleError' || err instanceof BusinessRuleError) {
        return {
          status: 'error',
          code: err.code,
          message: `Falha de validação: ${err.message}`,
          details: err.details
        }
      }

      return {
        status: 'error',
        message: `Falha ao reativar participação: ${err.message}`
      }
    }
  }

  if (name === 'cancel_reactivate_participant') {
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
      message: 'Ação pendente de reativação de participação cancelada e removida com sucesso.'
    }
  }

  if (name === 'prepare_update_participant_link_status') {
    const { participantId, status } = args

    // Valida que o participante pertence a uma reunião do usuário e à integração Google ativa
    const { data: part, error: partError } = await supabaseAdmin
      .from('participacoes')
      .select('id, status, link_enviado, apresentacoes!inner(titulo, data, horario, user_id, google_integracao_id), clientes(nome)')
      .eq('id', participantId)
      .eq('apresentacoes.user_id', userId)
      .eq('apresentacoes.google_integracao_id', googleIntegracaoId)
      .maybeSingle()

    if (partError || !part) {
      return { error: 'Participante não encontrado ou você não tem permissão para gerenciar esta participação nesta integração ativa.' }
    }

    const pendingAction = {
      type: 'update_participant_link_status',
      participantId,
      status,
      clientName: part.clientes?.nome || 'Participante',
      presentationTitle: part.apresentacoes?.titulo || 'Reunião',
      presentationDate: part.apresentacoes?.data || '',
      presentationTime: part.apresentacoes?.horario || '',
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

    const statusLabel = status ? 'enviado' : 'pendente (não enviado)'
    return {
      status: 'pending_confirmation',
      message: `Ação de marcar o link do participante "${pendingAction.clientName}" na reunião "${pendingAction.presentationTitle}" como "${statusLabel}" salva como pendente. Aguardando confirmação.`
    }
  }

  if (name === 'confirm_update_participant_link_status') {
    const pendingAction = contextData?.pending_action

    if (!pendingAction || pendingAction.type !== 'update_participant_link_status') {
      return { error: 'Não há nenhuma ação de atualizar status do link de participante pendente ou a pendência expirou.' }
    }

    try {
      // Re-valida que o participante pertence a uma reunião do usuário e à integração Google ativa
      const { data: part, error: partError } = await supabaseAdmin
        .from('participacoes')
        .select('id, apresentacoes!inner(user_id, google_integracao_id)')
        .eq('id', pendingAction.participantId)
        .eq('apresentacoes.user_id', userId)
        .eq('apresentacoes.google_integracao_id', googleIntegracaoId)
        .maybeSingle()

      if (partError || !part) {
        throw new Error('Permissão negada ou participação inexistente.')
      }

      // Atualiza a coluna no banco
      const { error: updateError } = await supabaseAdmin
        .from('participacoes')
        .update({ link_enviado: pendingAction.status })
        .eq('id', pendingAction.participantId)

      if (updateError) throw updateError

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
        message: `Status de envio do link do participante "${pendingAction.clientName}" atualizado com sucesso para: ${pendingAction.status ? 'enviado' : 'pendente'}.`,
        participantId: pendingAction.participantId,
        linkEnviado: pendingAction.status
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
        message: `Falha ao atualizar status do link do participante: ${err.message}`
      }
    }
  }

  if (name === 'cancel_update_participant_link_status') {
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
      message: 'Ação pendente de atualizar status do link de participante cancelada e removida com sucesso.'
    }
  }

  if (name === 'prepare_update_participation_observation') {
    const { participationId, observacao } = args

    // Fetch the participation and join with apresentacoes to validate user ownership
    const { data: part, error: partErr } = await supabaseAdmin
      .from('participacoes')
      .select(`
        id,
        observacao,
        status,
        apresentacoes!inner (
          id,
          titulo,
          data,
          horario,
          user_id,
          google_integracao_id
        ),
        clientes!inner (
          nome
        )
      `)
      .eq('id', participationId)
      .eq('apresentacoes.user_id', userId)
      .eq('apresentacoes.google_integracao_id', googleIntegracaoId)
      .maybeSingle()

    if (partErr) throw partErr
    if (!part) {
      return { error: 'Participação não encontrada ou sem acesso.' }
    }

    if (part.status === 'cancelado') {
      return { error: 'Não é possível alterar a observação de uma participação cancelada.' }
    }

    const cleanObs = observacao !== undefined ? (observacao || '').trim() : ''

    if (cleanObs === (part.observacao || '')) {
      return { error: 'A observação fornecida já é igual à observação atual.' }
    }

    const pendingAction = {
      type: 'update_participation_observation',
      participationId,
      clientName: part.clientes?.nome || 'Cliente',
      presentationTitle: part.apresentacoes?.titulo || 'Reunião',
      oldObservacao: part.observacao || '',
      newObservacao: cleanObs,
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

    const oldObsText = part.observacao ? `"${part.observacao}"` : '(vazio)'
    return {
      status: 'pending_confirmation',
      message: `Ação de atualizar a observação de "${part.clientes?.nome}" na reunião "${part.apresentacoes?.titulo}" salva como pendente. Alteração: de ${oldObsText} para ${cleanObs ? `"${cleanObs}"` : '(vazio)'}. Confirma?`
    }
  }

  if (name === 'confirm_update_participation_observation') {
    const pendingAction = contextData?.pending_action

    if (!pendingAction || pendingAction.type !== 'update_participation_observation') {
      return { error: 'Não há nenhuma ação de atualizar observação pendente ou a pendência expirou.' }
    }

    try {
      const { error: updateError } = await supabaseAdmin
        .from('participacoes')
        .update({ observacao: pendingAction.newObservacao || '' })
        .eq('id', pendingAction.participationId)

      if (updateError) throw updateError

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
        message: 'Observação da participação atualizada com sucesso.',
        observacao: pendingAction.newObservacao
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
        message: `Falha ao atualizar a observação da participação: ${err.message}`
      }
    }
  }

  if (name === 'cancel_update_participation_observation') {
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
      message: 'Ação pendente de atualizar a observação do participante cancelada e removida com sucesso.'
    }
  }

  throw new Error(`Participant handler: Unknown tool name "${name}"`)
}
