import { parseSaoPauloDateTime } from '../../_shared/dateUtils.ts'

export async function handleReminderTool(
  supabaseAdmin: any,
  userId: string,
  name: string,
  args: any,
  contextData: any
) {
  if (name === 'prepare_create_personal_reminder') {
    const { mensagem, data, horario } = args

    // Valida data/horário futuro no timezone America/Sao_Paulo
    const targetDate = parseSaoPauloDateTime(data, horario)
    if (targetDate <= new Date()) {
      return { error: 'Não é possível agendar um lembrete para uma data/horário que já passou.' }
    }

    const pendingAction = {
      type: 'create_personal_reminder',
      mensagem,
      disparar_em: targetDate.toISOString(),
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

    const dateParts = data.split('-')
    const formattedDate = `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}`
    return {
      status: 'pending_confirmation',
      message: `Ação de criar o lembrete pessoal "${mensagem}" para o dia ${formattedDate} às ${horario} salva como pendente. Aguardando confirmação.`
    }
  }

  if (name === 'confirm_create_personal_reminder') {
    const pendingAction = contextData?.pending_action

    if (!pendingAction || pendingAction.type !== 'create_personal_reminder') {
      return { error: 'Não há nenhuma ação de criar lembrete pessoal pendente ou a pendência expirou.' }
    }

    try {
      // Re-valida que o horário ainda está no futuro no momento da confirmação
      const targetDate = new Date(pendingAction.disparar_em)
      if (targetDate <= new Date()) {
        throw new Error('A data/horário do lembrete já passou.')
      }

      const { error: insertError } = await supabaseAdmin
        .from('lembretes_pessoais')
        .insert({
          user_id: userId,
          mensagem: pendingAction.mensagem,
          disparar_em: pendingAction.disparar_em
        })

      if (insertError) throw insertError

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
        message: 'Lembrete pessoal criado com sucesso.',
        mensagem: pendingAction.mensagem,
        disparar_em: pendingAction.disparar_em
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
        message: `Falha ao criar lembrete pessoal: ${err.message}`
      }
    }
  }

  if (name === 'cancel_create_personal_reminder') {
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
      message: 'Ação pendente de criar lembrete pessoal cancelada e removida com sucesso.'
    }
  }

  if (name === 'list_personal_reminders') {
    const { startDate, endDate } = args

    let query = supabaseAdmin
      .from('lembretes_pessoais')
      .select('id, mensagem, disparar_em')
      .eq('user_id', userId)
      .is('enviado_em', null)
      .gt('disparar_em', new Date().toISOString())
      .order('disparar_em', { ascending: true })

    if (startDate) {
      const startUtc = parseSaoPauloDateTime(startDate, '00:00').toISOString()
      query = query.gte('disparar_em', startUtc)
    }
    if (endDate) {
      const endUtc = parseSaoPauloDateTime(endDate, '23:59').toISOString()
      query = query.lte('disparar_em', endUtc)
    }

    const { data, error } = await query
    if (error) throw error

    return data || []
  }

  throw new Error(`Reminder handler: Unknown tool name "${name}"`)
}
