export const getSaoPauloDateTime = (date = new Date()) => {
  const formatter = new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23'
  })
  return formatter.format(date).replace(' ', 'T')
}

export const isPresentationPast = (meeting) => {
  if (!meeting) return false
  const timeToCheck = meeting.timeEnd || meeting.time
  if (!timeToCheck) return false

  const parts = timeToCheck.split(':')
  const normalizedTime = parts.length === 2 ? `${timeToCheck}:00` : timeToCheck

  const meetingDateTimeStr = `${meeting.date}T${normalizedTime}`
  const nowDateTimeStr = getSaoPauloDateTime()
  return meetingDateTimeStr < nowDateTimeStr
}

export const hasPresentationStarted = (presentation) => {
  if (!presentation) return false
  const timeToCheck = presentation.time || '00:00'
  const parts = timeToCheck.split(':')
  const normalizedTime = parts.length === 2 ? `${timeToCheck}:00` : timeToCheck

  const meetingDateTimeStr = `${presentation.date}T${normalizedTime}`
  const nowDateTimeStr = getSaoPauloDateTime()
  return nowDateTimeStr >= meetingDateTimeStr
}
