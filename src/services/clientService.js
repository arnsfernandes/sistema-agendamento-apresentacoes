import { supabase } from './supabaseClient'
import { getActiveIntegration } from './googleIntegrationService'

const CLIENT_FIELDS = 'id, nome, telefone, agencia'

const handleDbError = (error, action) => {
  throw new Error(`Falha ao ${action}: ${error.message}`)
}

export const findClientByPhone = async (telefone) => {
  const { userId, googleIntegracaoId } = await getActiveIntegration()
  if (!googleIntegracaoId) {
    return null
  }

  const { data, error } = await supabase
    .from('clientes')
    .select(CLIENT_FIELDS)
    .eq('telefone', telefone)
    .eq('user_id', userId)
    .eq('google_integracao_id', googleIntegracaoId)
    .maybeSingle()

  if (error) {
    handleDbError(error, 'buscar cliente por telefone')
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
    .select(CLIENT_FIELDS)
    .single()

  if (error) {
    handleDbError(error, 'cadastrar o cliente')
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
    .select(CLIENT_FIELDS)
    .single()

  if (error) {
    handleDbError(error, 'atualizar o cliente')
  }

  return data
}
