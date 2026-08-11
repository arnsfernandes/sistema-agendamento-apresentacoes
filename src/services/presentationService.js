import { supabase } from '../supabaseClient'

const getActiveIntegration = async () => {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Usuário não autenticado.')
  console.log('DIAGNOSTIC - user.id:', user.id)

  const { data, error } = await supabase
    .from('google_integracao')
    .select('id')
    .eq('user_id', user.id)
    .eq('ativo', true)
    .maybeSingle()

  console.log('DIAGNOSTIC - google_integracao data:', data, 'error:', error)

  if (error) {
    throw new Error(`Falha ao obter integração ativa: ${error.message}`)
  }

  return { userId: user.id, googleIntegracaoId: data?.id || null }
}

export const listPresentations = async () => {
  const { userId, googleIntegracaoId } = await getActiveIntegration()
  console.log('DIAGNOSTIC - google_integracao_id:', googleIntegracaoId)
  if (!googleIntegracaoId) {
    return []
  }

  const { data, error } = await supabase
    .from('apresentacoes')
    .select(`
      id,
      data,
      horario,
      horario_fim,
      titulo,
      meet_link,
      google_event_id,
      google_calendar_id,
      sync_status,
      sync_error,
      google_event_updated_at,
      google_recurring_event_id,
      participacoes (
        id,
        status,
        observacao,
        cliente_id,
        link_enviado,
        clientes (
          id,
          nome,
          telefone,
          agencia
        )
      )
    `)
    .eq('user_id', userId)
    .eq('google_integracao_id', googleIntegracaoId)
    .order('data', { ascending: true })
    .order('horario', { ascending: true })

  console.log('DIAGNOSTIC - apresentacoes query result:', data, 'error:', error)

  if (error) {
    throw new Error(`Falha ao carregar as apresentações: ${error.message}`)
  }

  return data.map(item => ({
    id: item.id,
    date: item.data,
    time: item.horario,
    timeEnd: item.horario_fim,
    title: item.titulo,
    meetLink: item.meet_link,
    googleEventId: item.google_event_id,
    googleCalendarId: item.google_calendar_id,
    googleEventUpdatedAt: item.google_event_updated_at,
    googleRecurringEventId: item.google_recurring_event_id,
    syncStatus: item.sync_status,
    syncError: item.sync_error,
    participantsList: (item.participacoes || []).map(part => ({
      id: part.id,
      clienteId: part.cliente_id,
      nome: part.clientes?.nome || '',
      telefone: part.clientes?.telefone || '',
      agencia: part.clientes?.agencia || '',
      observacao: part.observacao || '',
      statusAtivo: part.status === 'ativo',
      linkEnviado: part.link_enviado
    }))
  }))
}
