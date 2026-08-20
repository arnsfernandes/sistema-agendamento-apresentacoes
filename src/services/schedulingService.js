import { supabase } from './supabaseClient'

export const scheduleParticipant = async (meetingId, participantData) => {
  const { data, error } = await supabase.functions.invoke('schedule-participant', {
    body: { meetingId, participantData }
  })

  if (error) {
    throw error
  }

  if (data?.error) {
    throw new Error(data.error)
  }

  return data
}
