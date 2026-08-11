import { supabase } from '../supabaseClient'

export const getActiveIntegration = async () => {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Usuário não autenticado.')

  const { data, error } = await supabase
    .from('google_integracao')
    .select('id')
    .eq('user_id', user.id)
    .eq('ativo', true)
    .maybeSingle()

  if (error) {
    throw new Error(`Falha ao obter integração ativa: ${error.message}`)
  }

  return { userId: user.id, googleIntegracaoId: data?.id || null }
}
