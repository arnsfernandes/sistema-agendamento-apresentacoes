import { backendCreateClient, BusinessRuleError } from '../../_shared/scheduling.ts'
import { TIME_ZONE } from '../../_shared/dateUtils.ts'

export async function handleClientTool(
  supabaseAdmin: any,
  userId: string,
  googleIntegracaoId: number,
  name: string,
  args: any,
  contextData: any
) {
  if (name === 'find_client') {
    const { query } = args
    const { data, error } = await supabaseAdmin
      .from('clientes')
      .select('id, nome, telefone, agencia')
      .eq('user_id', userId)
      .eq('google_integracao_id', googleIntegracaoId)
      .or(`nome.ilike.%${query}%,telefone.like.%${query}%`)

    if (error) throw error
    return data || []
  }

  if (name === 'prepare_create_client') {
    const { nome, telefone, agencia } = args

    // Save pending client creation action
    const pendingAction = {
      type: 'create_client',
      nome,
      telefone,
      agencia: agencia || '',
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
      message: `Ação de cadastrar novo cliente "${nome}" com telefone "${telefone}" salva como pendente. Aguardando confirmação do usuário.`
    }
  }

  if (name === 'confirm_create_client') {
    const pendingAction = contextData?.pending_action

    if (!pendingAction || pendingAction.type !== 'create_client') {
      return { error: 'Não há nenhuma ação de cadastro de cliente pendente ou a pendência expirou.' }
    }

    try {
      const client = await backendCreateClient(
        supabaseAdmin,
        userId,
        googleIntegracaoId,
        {
          nome: pendingAction.nome,
          telefone: pendingAction.telefone,
          agencia: pendingAction.agencia
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
        message: 'Cliente cadastrado com sucesso.',
        client
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
        message: `Falha ao cadastrar cliente: ${err.message}`
      }
    }
  }

  if (name === 'cancel_create_client') {
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
      message: 'Ação pendente de cadastro de cliente cancelada e removida com sucesso.'
    }
  }

  if (name === 'prepare_delete_client') {
    const { clientId } = args

    // 1. Fetch client and validate user/integration ownership
    const { data: client, error: clientErr } = await supabaseAdmin
      .from('clientes')
      .select('id, nome, excluido')
      .eq('id', clientId)
      .eq('user_id', userId)
      .eq('google_integracao_id', googleIntegracaoId)
      .maybeSingle()

    if (clientErr) throw clientErr
    if (!client || client.excluido) {
      return { error: 'Cliente não encontrado ou já inativo.' }
    }

    // 2. Check for active participations in future presentations (data >= hoje em America/Sao_Paulo)
    const todaySaoPaulo = new Date().toLocaleDateString('sv', { timeZone: TIME_ZONE })

    const { data: futureParticipations, error: partErr } = await supabaseAdmin
      .from('participacoes')
      .select(`
        id,
        apresentacoes!inner (
          id,
          titulo,
          data
        )
      `)
      .eq('cliente_id', clientId)
      .eq('status', 'ativo')
      .gte('apresentacoes.data', todaySaoPaulo)
      .eq('apresentacoes.user_id', userId)
      .eq('apresentacoes.google_integracao_id', googleIntegracaoId)

    if (partErr) throw partErr
    if (futureParticipations && futureParticipations.length > 0) {
      const meetingsList = futureParticipations.map(p => {
        const dateParts = p.apresentacoes?.data.split('-')
        const formattedDate = dateParts ? `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}` : p.apresentacoes?.data
        return `"${p.apresentacoes?.titulo}" em ${formattedDate}`
      }).join(', ')
      return { error: `Este cliente possui reuniões futuras (${meetingsList}). Remova-o dessas reuniões antes de excluir.` }
    }

    // 3. Save pending action
    const pendingAction = {
      type: 'delete_client',
      clientId,
      clientName: client.nome,
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
      message: `Ação de excluir o cliente "${client.nome}" salva como pendente. Confirma a exclusão?`
    }
  }

  if (name === 'confirm_delete_client') {
    const pendingAction = contextData?.pending_action

    if (!pendingAction || pendingAction.type !== 'delete_client') {
      return { error: 'Não há nenhuma ação de excluir cliente pendente ou a pendência expirou.' }
    }

    const { clientId, clientName } = pendingAction

    try {
      // 1. Re-validate the client belongs to user + integration and is not already excluded
      const { data: client, error: clientErr } = await supabaseAdmin
        .from('clientes')
        .select('id, nome, excluido')
        .eq('id', clientId)
        .eq('user_id', userId)
        .eq('google_integracao_id', googleIntegracaoId)
        .maybeSingle()

      if (clientErr) throw clientErr
      if (!client || client.excluido) {
        return { error: 'Cliente não encontrado ou já inativo.' }
      }

      // 2. Re-validate no active future meetings (data >= hoje)
      const todaySaoPaulo = new Date().toLocaleDateString('sv', { timeZone: TIME_ZONE })

      const { data: futureParticipations, error: partErr } = await supabaseAdmin
        .from('participacoes')
        .select(`
          id,
          apresentacoes!inner (
            id,
            titulo,
            data
          )
        `)
        .eq('cliente_id', clientId)
        .eq('status', 'ativo')
        .gte('apresentacoes.data', todaySaoPaulo)
        .eq('apresentacoes.user_id', userId)
        .eq('apresentacoes.google_integracao_id', googleIntegracaoId)

      if (partErr) throw partErr
      if (futureParticipations && futureParticipations.length > 0) {
        const meetingsList = futureParticipations.map(p => {
          const dateParts = p.apresentacoes?.data.split('-')
          const formattedDate = dateParts ? `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}` : p.apresentacoes?.data
          return `"${p.apresentacoes?.titulo}" em ${formattedDate}`
        }).join(', ')
        return { error: `Este cliente possui reuniões futuras (${meetingsList}). Remova-o dessas reuniões antes de excluir.` }
      }

      // 3. Perform logical deletion (excluido = true)
      const { error: deleteError } = await supabaseAdmin
        .from('clientes')
        .update({ excluido: true })
        .eq('id', clientId)

      if (deleteError) throw deleteError

      // 4. Clear pending action
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
        message: `Cliente "${clientName}" inativado com sucesso.`,
        clientId
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
        message: `Falha ao inativar cliente: ${err.message}`
      }
    }
  }

  if (name === 'cancel_delete_client') {
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
      message: 'Ação pendente de excluir cliente cancelada e removida com sucesso.'
    }
  }

  if (name === 'prepare_update_client') {
    const { clientId, nome, telefone, agencia } = args

    const { data: client, error: clientErr } = await supabaseAdmin
      .from('clientes')
      .select('id, nome, telefone, agencia, excluido')
      .eq('id', clientId)
      .eq('user_id', userId)
      .eq('google_integracao_id', googleIntegracaoId)
      .maybeSingle()

    if (clientErr) throw clientErr
    if (!client || client.excluido) {
      return { error: 'Cliente não encontrado ou inativo.' }
    }

    let cleanTel = client.telefone
    if (telefone !== undefined) {
      cleanTel = telefone.replace(/\D/g, '')
      if (cleanTel.length !== 10 && cleanTel.length !== 11) {
        return { error: 'Telefone deve conter 10 ou 11 dígitos.' }
      }
      if (cleanTel !== client.telefone) {
        const { data: existing, error: findError } = await supabaseAdmin
          .from('clientes')
          .select('id')
          .eq('telefone', cleanTel)
          .eq('user_id', userId)
          .eq('google_integracao_id', googleIntegracaoId)
          .maybeSingle()

        if (findError) throw findError
        if (existing) {
          return { error: 'Já existe um cliente cadastrado com este telefone.' }
        }
      }
    }

    const newNome = nome !== undefined ? nome.trim() : client.nome
    const newTelefone = cleanTel
    const newAgencia = agencia !== undefined ? agencia.trim() : client.agencia

    if (newNome === client.nome && newTelefone === client.telefone && newAgencia === client.agencia) {
      return { error: 'Nenhuma alteração informada em relação aos dados atuais.' }
    }

    const pendingAction = {
      type: 'update_client',
      clientId,
      oldData: {
        nome: client.nome,
        telefone: client.telefone,
        agencia: client.agencia
      },
      newData: {
        nome: newNome,
        telefone: newTelefone,
        agencia: newAgencia
      },
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

    // Resumo mostrando apenas os campos que realmente serão alterados
    const changes: string[] = []
    if (newNome !== client.nome) changes.push(`Nome: de "${client.nome}" para "${newNome}"`)
    if (newTelefone !== client.telefone) changes.push(`Telefone: de "${client.telefone}" para "${newTelefone}"`)
    if (newAgencia !== client.agencia) changes.push(`Agência: de "${client.agencia || '(vazio)'}" para "${newAgencia || '(vazio)'}"`)

    return {
      status: 'pending_confirmation',
      message: `Ação de atualizar dados cadastrais do cliente "${client.nome}" salva como pendente. Alterações agendadas:\n- ${changes.join('\n- ')}\n\nConfirma as alterações?`
    }
  }

  if (name === 'confirm_update_client') {
    const pendingAction = contextData?.pending_action

    if (!pendingAction || pendingAction.type !== 'update_client') {
      return { error: 'Não há nenhuma ação de atualizar cliente pendente ou a pendência expirou.' }
    }

    try {
      // Revalida duplicidade de telefone na confirmação se foi alterado
      if (pendingAction.newData.telefone !== pendingAction.oldData.telefone) {
        const { data: existing, error: findError } = await supabaseAdmin
          .from('clientes')
          .select('id')
          .eq('telefone', pendingAction.newData.telefone)
          .eq('user_id', userId)
          .eq('google_integracao_id', googleIntegracaoId)
          .maybeSingle()

        if (findError) throw findError
        if (existing) {
          throw new Error('Já existe outro cliente cadastrado com este telefone.')
        }
      }

      const { error: updateError } = await supabaseAdmin
        .from('clientes')
        .update({
          nome: pendingAction.newData.nome,
          telefone: pendingAction.newData.telefone,
          agencia: pendingAction.newData.agencia
        })
        .eq('id', pendingAction.clientId)
        .eq('user_id', userId)
        .eq('google_integracao_id', googleIntegracaoId)

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
        message: 'Cadastro do cliente atualizado com sucesso.',
        client: pendingAction.newData
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
        message: `Falha ao atualizar o cadastro do cliente: ${err.message}`
      }
    }
  }

  if (name === 'cancel_update_client') {
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
      message: 'Ação pendente de atualizar cliente cancelada e removida com sucesso.'
    }
  }

  throw new Error(`Client handler: Unknown tool name "${name}"`)
}
