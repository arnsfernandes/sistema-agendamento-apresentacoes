import { useState, useEffect, useCallback } from 'react'
import {
  listClients,
  createClient,
  updateClient,
  deleteClientLogical,
  findClientByPhone
} from '../services/clientService'

export default function useClients(user, activeTab) {
  const [clients, setClients] = useState([])
  const userId = user?.id

  const loadClients = useCallback(async () => {
    try {
      const data = await listClients()
      setClients(data)
    } catch (err) {
      console.error('Erro ao carregar clientes:', err)
    }
  }, [])

  useEffect(() => {
    if (activeTab === 'clientes' && userId) {
      loadClients()
    }
  }, [activeTab, userId, loadClients])

  const handleAddDirectClient = useCallback(async (clientData) => {
    const existing = await findClientByPhone(clientData.telefone)
    if (existing) {
      throw new Error('Já existe um cliente cadastrado com este telefone.')
    }
    await createClient(clientData)
    await loadClients()
  }, [loadClients])

  const handleUpdateDirectClient = useCallback(async (clientId, clientData) => {
    await updateClient(clientId, clientData)
    await loadClients()
  }, [loadClients])

  const handleDeleteDirectClient = useCallback(async (clientId) => {
    await deleteClientLogical(clientId)
    await loadClients()
  }, [loadClients])

  return {
    clients,
    loadClients,
    handleAddDirectClient,
    handleUpdateDirectClient,
    handleDeleteDirectClient
  }
}
