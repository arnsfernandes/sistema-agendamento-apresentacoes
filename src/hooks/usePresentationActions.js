import { useCallback } from 'react'
import { supabase } from '../services/supabaseClient'
import { createGooglePresentation, updateGooglePresentation } from '../services/googlePresentationService'

export default function usePresentationActions(refreshMeetings, addLocalMeeting, currentDate) {
  const handleCreatePresentation = useCallback(async (presentationData) => {
    try {
      const createdPresentation = await createGooglePresentation(presentationData)
      if (createdPresentation.id) {
        const newMeeting = {
          id: createdPresentation.id,
          date: createdPresentation.date,
          time: createdPresentation.time,
          timeEnd: createdPresentation.timeEnd,
          title: createdPresentation.title,
          meetLink: createdPresentation.meetLink,
          participantsList: createdPresentation.participantsList || []
        }
        addLocalMeeting(newMeeting)
      }

      if (createdPresentation.date) {
        const presentationDateObj = new Date(createdPresentation.date + 'T00:00:00')
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
          console.error('Erro na sincronização automática pós-criação:', err)
        })
      }
    } catch (err) {
      console.error('Erro ao criar apresentação:', err)
      throw err
    }
  }, [refreshMeetings, addLocalMeeting])

  const handleUpdatePresentation = useCallback(async (presentationData) => {
    try {
      await updateGooglePresentation(presentationData)

      if (presentationData.editScope === 'series') {
        const y = currentDate.getFullYear()
        const m = currentDate.getMonth()
        const startDate = `${y}-${String(m + 1).padStart(2, '0')}-01`
        const next = new Date(y, m + 1, 1)
        const endDate = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}-01`

        const { error } = await supabase.functions.invoke('google-calendar-sync-apply', {
          body: { startDate, endDate }
        })
        if (error) throw error

        await refreshMeetings()
      } else {
        await refreshMeetings()

        if (presentationData.date) {
          const presentationDateObj = new Date(presentationData.date + 'T00:00:00')
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
            console.error('Erro na sincronização automática pós-edição:', err)
          })
        }
      }
    } catch (err) {
      console.error('Erro ao atualizar apresentação comercial:', err)
      throw err
    }
  }, [currentDate, refreshMeetings])

  return {
    handleCreatePresentation,
    handleUpdatePresentation
  }
}
