import { useState, useCallback } from 'react'
import { supabase } from '../services/supabaseClient'
import { deleteGooglePresentation, moveParticipantsAndDeletePresentation } from '../services/googlePresentationService'

export default function usePresentationDeletion(meetings, refreshMeetings, currentDate, onDeletionSuccess) {
  const [showMoveParticipantsModal, setShowMoveParticipantsModal] = useState(false)
  const [showDeletePresentationModal, setShowDeletePresentationModal] = useState(false)
  const [deleteTargetId, setDeleteTargetId] = useState(null)
  const [deleteTargetParticipants, setDeleteTargetParticipants] = useState(false)
  const [movingPresentation, setMovingPresentation] = useState(null)
  const [isDeletingPresentation, setIsDeletingPresentation] = useState(false)
  const [isMovingAndDeleteProcessing, setIsMovingAndDeleteProcessing] = useState(false)

  const handleDeletePresentation = useCallback(async (presentationId, forceDeleteParticipants = false, editScope = null) => {
    const presentation = meetings.find(m => m.id === presentationId)
    if (!presentation) return

    const hasParticipants = presentation.participantsList && presentation.participantsList.length > 0
    let deleteParticipants = false

    if (hasParticipants && !forceDeleteParticipants) {
      setMovingPresentation(presentation)
      setShowMoveParticipantsModal(true)
      return
    }

    if (hasParticipants && forceDeleteParticipants) {
      deleteParticipants = true
    }

    if (presentation.googleRecurringEventId && !editScope) {
      setDeleteTargetId(presentationId)
      setDeleteTargetParticipants(deleteParticipants)
      setShowDeletePresentationModal(true)
      return
    }

    if (!presentation.googleRecurringEventId) {
      if (!deleteParticipants) {
        const confirmDelete = window.confirm('Deseja realmente excluir esta apresentação e removê-la do Google Agenda?')
        if (!confirmDelete) return
      }
    }

    setIsDeletingPresentation(true)
    try {
      await deleteGooglePresentation(presentationId, deleteParticipants, editScope || 'occurrence')
      await refreshMeetings()

      if (presentation.date) {
        const presentationDateObj = new Date(presentation.date + 'T00:00:00')
        const y = presentationDateObj.getFullYear()
        const m = presentationDateObj.getMonth()
        const startDate = `${y}-${String(m + 1).padStart(2, '0')}-01`
        const next = new Date(y, m + 1, 1)
        const endDate = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}-01`

        supabase.functions.invoke('google-calendar-sync-apply', {
          body: { startDate, endDate }
        }).then(({ error }) => {
          if (error) throw error
          refreshMeetings()
        }).catch(err => {
          console.error('Erro na sincronização automática pós-exclusão:', err)
        })
      }

      if (onDeletionSuccess) {
        onDeletionSuccess()
      }
    } catch (err) {
      console.error('Erro ao excluir apresentação comercial:', err)
      throw err
    } finally {
      setIsDeletingPresentation(false)
    }
  }, [meetings, refreshMeetings, onDeletionSuccess])

  const handleMoveAndDeletePresentation = useCallback(async (targetMeetingId) => {
    if (!movingPresentation) return
    setIsMovingAndDeleteProcessing(true)

    try {
      await moveParticipantsAndDeletePresentation(movingPresentation.id, targetMeetingId)
      await refreshMeetings()

      if (movingPresentation.date) {
        const presentationDateObj = new Date(movingPresentation.date + 'T00:00:00')
        const y = presentationDateObj.getFullYear()
        const m = presentationDateObj.getMonth()
        const startDate = `${y}-${String(m + 1).padStart(2, '0')}-01`
        const next = new Date(y, m + 1, 1)
        const endDate = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}-01`

        supabase.functions.invoke('google-calendar-sync-apply', {
          body: { startDate, endDate }
        }).then(({ error }) => {
          if (error) throw error
          refreshMeetings()
        }).catch(err => {
          console.error('Erro na sincronização automática pós-movimentação:', err)
        })
      }

      setShowMoveParticipantsModal(false)
      setMovingPresentation(null)

      if (onDeletionSuccess) {
        onDeletionSuccess()
      }
    } catch (err) {
      console.error('Erro ao mover participantes e excluir apresentação:', err)
      throw err
    } finally {
      setIsMovingAndDeleteProcessing(false)
    }
  }, [movingPresentation, refreshMeetings, onDeletionSuccess])

  return {
    showMoveParticipantsModal,
    setShowMoveParticipantsModal,
    showDeletePresentationModal,
    setShowDeletePresentationModal,
    deleteTargetId,
    setDeleteTargetId,
    deleteTargetParticipants,
    setDeleteTargetParticipants,
    movingPresentation,
    setMovingPresentation,
    isDeletingPresentation,
    isMovingAndDeleteProcessing,
    handleDeletePresentation,
    handleMoveAndDeletePresentation
  }
}
