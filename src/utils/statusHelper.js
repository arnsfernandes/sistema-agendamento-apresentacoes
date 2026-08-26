export const getStatusDetails = (meeting) => {
  if (!meeting) return { label: 'Confirmada', color: '#10b981', bg: 'rgba(16, 185, 129, 0.1)', icon: '✓' }

  if (meeting.syncStatus === 'google_deleted') {
    return { label: 'Conflito', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.1)', icon: '⚠️' }
  }
  if (meeting.googleRecurringEventId) {
    return { label: 'Recorrente', color: '#a78bfa', bg: 'rgba(167, 139, 250, 0.1)', icon: '🔄' }
  }
  if (meeting.syncStatus === 'rescheduled') {
    return { label: 'Remarcada', color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.1)', icon: '🔄' }
  }
  if (meeting.syncStatus === 'pending') {
    return { label: 'Pendente', color: '#fbbf24', bg: 'rgba(251, 191, 36, 0.1)', icon: '⊘' }
  }
  return { label: 'Confirmada', color: '#10b981', bg: 'rgba(16, 185, 129, 0.1)', icon: '✓' }
}
