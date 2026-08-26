import { useCallback } from 'react'
import { scheduleParticipant } from '../services/schedulingService'
import { findClientByPhone, updateClient } from '../services/clientService'
import { updateParticipationObservation, rescheduleParticipantApi, cancelParticipantApi, reactivateParticipantApi } from '../services/participationService'
import { isPresentationPast } from '../utils/dateUtils'

export default function useParticipants(meetings, refreshMeetings) {
  const handleAddParticipant = useCallback(async (meetingId, participantData) => {
    await scheduleParticipant(meetingId, participantData)
    await refreshMeetings()
  }, [refreshMeetings])

  const handleUpdateParticipant = useCallback(async (meetingId, participantId, updatedData) => {
    const currentMeeting = meetings.find(m => m.id === meetingId)
    if (isPresentationPast(currentMeeting)) {
      throw new Error('Não é possível alterar uma apresentação que já ocorreu.')
    }
    const oldParticipant = currentMeeting?.participantsList.find(p => p.id === participantId)
    if (!oldParticipant) return

    const clienteId = oldParticipant.clienteId

    try {
      if (updatedData.telefone !== oldParticipant.telefone) {
        const existingClient = await findClientByPhone(updatedData.telefone)
        if (existingClient && existingClient.id !== clienteId) {
          throw new Error('Este telefone já está vinculado a outro cliente.')
        }
      }

      await updateClient(clienteId, {
        nome: updatedData.nome,
        telefone: updatedData.telefone,
        agencia: updatedData.agencia
      })

      await updateParticipationObservation(participantId, updatedData.observacao)
      await refreshMeetings()
    } catch (err) {
      await refreshMeetings()
      throw err
    }
  }, [meetings, refreshMeetings])

  const handleCancelParticipant = useCallback(async (meetingId, participantId) => {
    try {
      await cancelParticipantApi(participantId)
      await refreshMeetings()
    } catch (err) {
      alert(err.message)
      await refreshMeetings()
    }
  }, [refreshMeetings])

  const handleReactivateParticipant = useCallback(async (meetingId, participantId) => {
    try {
      await reactivateParticipantApi(participantId)
      await refreshMeetings()
    } catch (err) {
      alert(err.message)
      await refreshMeetings()
    }
  }, [refreshMeetings])

  const handleRescheduleParticipant = useCallback(async (participantId, fromMeetingId, toMeetingId) => {
    try {
      await rescheduleParticipantApi(participantId, fromMeetingId, toMeetingId)
      await refreshMeetings()
    } catch (err) {
      alert(err.message)
      if (!err.isValidationError) {
        await refreshMeetings()
      }
      throw err
    }
  }, [refreshMeetings])

  return {
    handleAddParticipant,
    handleUpdateParticipant,
    handleCancelParticipant,
    handleReactivateParticipant,
    handleRescheduleParticipant
  }
}
