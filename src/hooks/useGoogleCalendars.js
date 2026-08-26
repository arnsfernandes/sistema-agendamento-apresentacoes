import { useState, useCallback } from 'react'
import { supabase } from '../services/supabaseClient'

export default function useGoogleCalendars() {
  const [googleCalendars, setGoogleCalendars] = useState([])
  const [selectedCalendar, setSelectedCalendar] = useState(null)
  const [calendarsLoading, setCalendarsLoading] = useState(false)
  const [calendarsError, setCalendarsError] = useState(null)

  const fetchGoogleCalendars = useCallback(async () => {
    setCalendarsLoading(true)
    setCalendarsError(null)
    try {
      const { data, error } = await supabase.functions.invoke('google-calendar-list')
      if (error) throw error
      if (data) {
        setGoogleCalendars(data.calendars || [])
        if (data.selectedCalendarId) {
          const activeCal = (data.calendars || []).find(c => c.id === data.selectedCalendarId)
          if (activeCal) {
            setSelectedCalendar(activeCal)
          }
        }
        return data
      }
    } catch (err) {
      console.error('Erro ao listar agendas:', err)
      setCalendarsError('Não foi possível obter a lista de agendas do Google.')
    } finally {
      setCalendarsLoading(false)
    }
  }, [])

  return {
    googleCalendars,
    setGoogleCalendars,
    selectedCalendar,
    setSelectedCalendar,
    calendarsLoading,
    calendarsError,
    fetchGoogleCalendars
  }
}
