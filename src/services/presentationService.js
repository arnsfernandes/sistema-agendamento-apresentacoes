import { supabase } from '../supabaseClient'

export const listPresentations = async () => {
  const { data, error } = await supabase
    .from('apresentacoes')
    .select('id, data, horario, titulo, meet_link')
    .order('data', { ascending: true })
    .order('horario', { ascending: true })

  if (error) {
    throw new Error(`Falha ao carregar as apresentações: ${error.message}`)
  }

  return data.map(item => ({
    id: item.id,
    date: item.data,
    time: item.horario,
    title: item.titulo,
    meetLink: item.meet_link,
    participantsList: []
  }))
}
