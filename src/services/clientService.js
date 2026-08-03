import { supabase } from '../supabaseClient'

export const findClientByPhone = async (telefone) => {
  const { data, error } = await supabase
    .from('clientes')
    .select('id, nome, telefone, agencia')
    .eq('telefone', telefone)
    .maybeSingle()

  if (error) {
    throw new Error(`Falha ao buscar cliente por telefone: ${error.message}`)
  }

  return data
}

export const createClient = async ({ nome, telefone, agencia }) => {
  const { data, error } = await supabase
    .from('clientes')
    .insert([{ nome, telefone, agencia }])
    .select('id, nome, telefone, agencia')
    .single()

  if (error) {
    throw new Error(`Falha ao cadastrar o cliente: ${error.message}`)
  }

  return data
}

export const updateClient = async (clienteId, { nome, telefone, agencia }) => {
  const { data, error } = await supabase
    .from('clientes')
    .update({ nome, telefone, agencia })
    .eq('id', clienteId)
    .select('id, nome, telefone, agencia')
    .single()

  if (error) {
    throw new Error(`Falha ao atualizar o cliente: ${error.message}`)
  }

  return data
}
