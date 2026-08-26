import { useState, useEffect, useCallback } from 'react'
import { listPresentations } from '../services/presentationService'

export default function useMeetings(user) {
  const [meetings, setMeetings] = useState([])
  const [meetingsLoading, setMeetingsLoading] = useState(false)
  const [meetingsError, setMeetingsError] = useState(null)

  const refreshMeetings = useCallback(async () => {
    setMeetingsLoading(true)
    setMeetingsError(null)
    try {
      const refreshedData = await listPresentations()
      setMeetings(refreshedData)
      return refreshedData
    } catch (err) {
      console.error('Erro ao atualizar apresentações comercial:', err)
      setMeetingsError('Não foi possível obter a lista de apresentações.')
      throw err
    } finally {
      setMeetingsLoading(false)
    }
  }, [])

  const clearMeetings = useCallback(() => {
    setMeetings([])
  }, [])

  const updateSingleMeeting = useCallback((meetingId, updatedFields) => {
    setMeetings(prev => prev.map(m => m.id === meetingId ? { ...m, ...updatedFields } : m))
  }, [])

  const addLocalMeeting = useCallback((newMeeting) => {
    setMeetings(prev => [...prev, newMeeting])
  }, [])

  // Initial load effect
  useEffect(() => {
    if (user) {
      setMeetingsLoading(true)
      setMeetingsError(null)
      listPresentations()
        .then(data => {
          setMeetings(data)
        })
        .catch(err => {
          console.error('Erro ao buscar apresentações comerciais iniciais:', err)
          setMeetingsError('Não foi possível carregar as apresentações comerciais.')
        })
        .finally(() => {
          setMeetingsLoading(false)
        })
    } else {
      setMeetings([])
    }
  }, [user])

  return {
    meetings,
    meetingsLoading,
    meetingsError,
    setMeetingsLoading,
    setMeetingsError,
    refreshMeetings,
    clearMeetings,
    updateSingleMeeting,
    addLocalMeeting
  }
}
