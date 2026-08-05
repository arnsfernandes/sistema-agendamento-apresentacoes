import { supabase } from '../supabaseClient'

export const listPresentations = async () => {
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
      google_event_updated_at,
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
    .order('data', { ascending: true })
    .order('horario', { ascending: true })

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
