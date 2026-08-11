import { supabase } from '../supabaseClient'

const getActiveIntegration = async () => {
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

export const findClientByPhone = async (telefone) => {
  const { userId, googleIntegracaoId } = await getActiveIntegration()
  if (!googleIntegracaoId) {
    return null
  }

  const { data, error } = await supabase
    .from('clientes')
    .select('id, nome, telefone, agencia')
    .eq('telefone', telefone)
    .eq('user_id', userId)
    .eq('google_integracao_id', googleIntegracaoId)
    .maybeSingle()

  if (error) {
    throw new Error(`Falha ao buscar cliente por telefone: ${error.message}`)
  }

  return data
}

export const createClient = async ({ nome, telefone, agencia }) => {
  const { userId, googleIntegracaoId } = await getActiveIntegration()
  if (!googleIntegracaoId) {
    throw new Error('Não é possível cadastrar cliente sem uma conta Google ativa conectada.')
  }

  const { data, error } = await supabase
    .from('clientes')
    .insert([{ nome, telefone, agencia, user_id: userId, google_integracao_id: googleIntegracaoId }])
    .select('id, nome, telefone, agencia')
    .single()

  if (error) {
    throw new Error(`Falha ao cadastrar o cliente: ${error.message}`)
  }

  return data
}

export const updateClient = async (clienteId, { nome, telefone, agencia }) => {
  const { userId, googleIntegracaoId } = await getActiveIntegration()
  if (!googleIntegracaoId) {
    throw new Error('Não é possível atualizar cliente sem uma conta Google ativa conectada.')
  }

  const { data, error } = await supabase
    .from('clientes')
    .update({ nome, telefone, agencia })
    .eq('id', clienteId)
    .eq('user_id', userId)
    .eq('google_integracao_id', googleIntegracaoId)
    .select('id, nome, telefone, agencia')
    .single()

  if (error) {
    throw new Error(`Falha ao atualizar o cliente: ${error.message}`)
  }

  return data
}
