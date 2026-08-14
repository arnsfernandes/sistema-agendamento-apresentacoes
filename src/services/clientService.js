import { supabase } from './supabaseClient'
import { getActiveIntegration } from './googleIntegrationService'

const CLIENT_FIELDS = 'id, nome, telefone, agencia, excluido'

const handleDbError = (error, action) => {
  throw new Error(`Falha ao ${action}: ${error.message}`)
}

export const listClients = async () => {
  const { userId, googleIntegracaoId } = await getActiveIntegration()
  if (!googleIntegracaoId) {
    return []
  }

  const { data, error } = await supabase
    .from('clientes')
    .select(CLIENT_FIELDS)
    .eq('user_id', userId)
    .eq('google_integracao_id', googleIntegracaoId)
    .eq('excluido', false)
    .order('nome', { ascending: true })

  if (error) {
    handleDbError(error, 'listar os clientes')
  }

  return data || []
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

export const deleteClientLogical = async (clientId) => {
  const { userId, googleIntegracaoId } = await getActiveIntegration()
  if (!googleIntegracaoId) {
    throw new Error('Não é possível excluir o cliente sem uma conta Google ativa conectada.')
  }

  const { data, error } = await supabase
    .from('clientes')
    .update({ excluido: true })
    .eq('id', clientId)
    .eq('user_id', userId)
    .eq('google_integracao_id', googleIntegracaoId)
    .select(CLIENT_FIELDS)
    .single()

  if (error) {
    handleDbError(error, 'excluir logicamente o cliente')
  }

  return data
}
