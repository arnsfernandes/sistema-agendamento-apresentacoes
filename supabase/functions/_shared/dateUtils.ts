export const TIME_ZONE = 'America/Sao_Paulo'

export const getSaoPauloTodayDetails = () => {
  const date = new Date()
  const formatter = new Intl.DateTimeFormat('pt-BR', {
    timeZone: TIME_ZONE,
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
  return formatter.format(date) // e.g. "quinta-feira, 20 de agosto de 2026"
}

export const parseSaoPauloDateTime = (dateStr: string, timeStr: string): Date => {
  const dummy = new Date(`${dateStr}T${timeStr}:00Z`)
  const tzString = dummy.toLocaleString('sv', { timeZone: TIME_ZONE })
  const spDate = new Date(tzString.replace(' ', 'T') + 'Z')
  const diffMs = dummy.getTime() - spDate.getTime()
  return new Date(dummy.getTime() + diffMs)
}
