import { useState, useCallback } from 'react'

export default function useParticipantModals() {
  const [editingParticipant, setEditingParticipant] = useState(null)
  const [reschedulingParticipant, setReschedulingParticipant] = useState(null)
  const [showAddParticipantModal, setShowAddParticipantModal] = useState(false)

  const openAddParticipant = useCallback(() => {
    setShowAddParticipantModal(true)
  }, [])

  const closeAddParticipant = useCallback(() => {
    setShowAddParticipantModal(false)
    setEditingParticipant(null)
  }, [])

  const openEditParticipant = useCallback((participant) => {
    setEditingParticipant(participant)
    setShowAddParticipantModal(true)
  }, [])

  const openRescheduleParticipant = useCallback((participant) => {
    setReschedulingParticipant(participant)
  }, [])

  const closeRescheduleParticipant = useCallback(() => {
    setReschedulingParticipant(null)
  }, [])

  const resetParticipantModals = useCallback(() => {
    setShowAddParticipantModal(false)
    setEditingParticipant(null)
    setReschedulingParticipant(null)
  }, [])

  return {
    editingParticipant,
    reschedulingParticipant,
    showAddParticipantModal,
    openAddParticipant,
    closeAddParticipant,
    openEditParticipant,
    openRescheduleParticipant,
    closeRescheduleParticipant,
    resetParticipantModals
  }
}
