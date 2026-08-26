import { getStatusDetails } from '../utils/statusHelper'

export default function MeetingsPanel({
  selectedDateKey,
  setSelectedDateKey,
  selectedMeetingId,
  setSelectedMeetingId,
  setShowMeetLink,
  setMeetCopied,
  resetMessageStates,
  formattedSelectedDate,
  dayMeetings,
  meetings = [],
  openPresentationModal
}) {
  const formatShortDate = (dateStr) => {
    if (!dateStr) return { day: '', month: '' }
    const [year, month, day] = dateStr.split('-')
    const dateObj = new Date(year, month - 1, day)
    const monthName = dateObj.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '').toUpperCase()
    return { day, month: monthName }
  }

  // Get upcoming active meetings
  const todayStr = new Date().toISOString().split('T')[0]
  const upcomingMeetings = meetings
    .filter(m => m.date >= todayStr && m.syncStatus !== 'google_deleted')
    .sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time))
    .slice(0, 4)

  const activeDayMeetings = [
    ...dayMeetings.filter(m => m.syncStatus !== 'google_deleted'),
    ...dayMeetings.filter(m => m.syncStatus === 'google_deleted'),
  ]

  return (
    <div className="meetings-panel-container">
      {/* Resumo do Dia Card */}
      <div className="meetings-panel" style={{
        width: '100%',
        backgroundColor: 'var(--bg-panel)',
        border: '1px solid var(--border-accent)',
        boxShadow: 'var(--shadow-card)',
        borderRadius: '18px',
        padding: '24px',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px'
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: '8px',
            backgroundColor: 'rgba(124, 92, 255, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#7C5CFF'
          }}>
            <svg style={{ width: '18px', height: '18px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: '700', color: 'var(--text-primary)' }}>Resumo do dia</h3>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{selectedDateKey ? formattedSelectedDate : 'Selecione um dia'}</span>
          </div>
        </div>

        {activeDayMeetings.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {activeDayMeetings.map((meeting) => (
              <div
                key={meeting.id}
                onClick={() => {
                  setSelectedMeetingId(meeting.id)
                  setShowMeetLink(false)
                  setMeetCopied(false)
                  resetMessageStates()
                }}
                className={`panel-meeting-item ${selectedMeetingId === meeting.id ? 'active' : ''} ${meeting.syncStatus === 'google_deleted' ? 'deleted' : ''}`}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: '0', flexGrow: 1 }}>
                  <div style={{
                    fontSize: '0.75rem',
                    fontWeight: '600',
                    color: 'var(--text-primary)',
                    backgroundColor: 'var(--bg-elevated)',
                    padding: '4px 8px',
                    borderRadius: '6px',
                    whiteSpace: 'nowrap'
                  }}>
                    {meeting.time ? meeting.time.slice(0, 5) : ''}
                  </div>
                  <div style={{ minWidth: '0', flexGrow: 1 }}>
                    <div style={{
                      fontSize: '0.85rem',
                      fontWeight: '600',
                      color: 'var(--text-primary)',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}>
                      {meeting.title}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                      {meeting.participantsList?.length || 0} {meeting.participantsList?.length === 1 ? 'participante' : 'participantes'}
                    </div>
                  </div>
                </div>
                <div style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', marginLeft: '6px', flexShrink: 0 }}>
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" style={{ width: '12px', height: '12px' }}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                  </svg>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '16px 0', gap: '8px' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>{selectedDateKey ? 'Nenhuma reunião encontrada' : 'Selecione um dia'}</span>
            {selectedDateKey && (
              <span
                onClick={() => openPresentationModal(selectedDateKey)}
                style={{
                  fontSize: '0.75rem',
                  fontWeight: '600',
                  color: '#7C5CFF',
                  cursor: 'pointer',
                  transition: 'color 150ms ease'
                }}
              >
                + Agendar neste dia
              </span>
            )}
          </div>
        )}
      </div>

      {/* Próximas Reuniões Card */}
      <div className="meetings-panel" style={{
        width: '100%',
        backgroundColor: 'var(--bg-panel)',
        border: '1px solid var(--border-accent)',
        boxShadow: 'var(--shadow-card)',
        borderRadius: '18px',
        padding: '24px',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <svg style={{ width: '18px', height: '18px', color: 'var(--text-secondary)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: '700', color: 'var(--text-primary)' }}>Próximas reuniões</h3>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {upcomingMeetings.length > 0 ? (
            upcomingMeetings.map((meeting) => {
              const status = getStatusDetails(meeting)
              const { day, month } = formatShortDate(meeting.date)
              const participantText = meeting.participantsList && meeting.participantsList.length > 0
                ? meeting.participantsList[0].nome
                : 'Sem participantes'

              // Setup icons for status
              let statusIcon = '✓'
              if (meeting.syncStatus === 'google_deleted') {
                statusIcon = '⚠️'
              } else if (meeting.googleRecurringEventId) {
                statusIcon = '🔄'
              } else if (meeting.syncStatus === 'rescheduled') {
                statusIcon = '🔄'
              } else if (meeting.syncStatus === 'pending') {
                statusIcon = '⊘'
              }

              return (
                <div
                  key={meeting.id}
                  onClick={() => {
                    setSelectedDateKey(meeting.date)
                    setSelectedMeetingId(meeting.id)
                    setShowMeetLink(false)
                    setMeetCopied(false)
                    resetMessageStates()
                  }}
                  className={`panel-meeting-item ${selectedMeetingId === meeting.id ? 'active' : ''}`}
                >
                  <div style={{ display: 'flex', gap: '14px', alignItems: 'center', overflow: 'hidden', flexGrow: 1 }}>
                    <div style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '44px',
                      height: '44px',
                      backgroundColor: 'var(--bg-primary)',
                      border: `1.5px solid ${status.color}`,
                      borderRadius: '10px',
                      flexShrink: 0
                    }}>
                      <span style={{ fontSize: '1rem', fontWeight: '800', color: 'var(--text-primary)', lineHeight: 1 }}>{day}</span>
                      <span style={{ fontSize: '0.6rem', fontWeight: '700', color: 'var(--text-secondary)', marginTop: '2px', lineHeight: 1 }}>{month}</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0, flexGrow: 1 }}>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: '500' }}>
                        {meeting.time ? meeting.time.slice(0, 5) : ''}
                      </span>
                      <span style={{ fontSize: '0.9rem', color: 'var(--text-primary)', fontWeight: '700', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: '2px' }}>
                        {meeting.title}
                      </span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: '2px' }}>
                        {participantText}
                      </span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0, marginLeft: '8px' }}>
                    <div style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '8px',
                      border: `1.5px solid ${status.color}`,
                      backgroundColor: `${status.color}14`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: status.color,
                      fontWeight: '700',
                      fontSize: '0.9rem',
                      flexShrink: 0
                    }}>
                      {statusIcon}
                    </div>
                    <div style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" style={{ width: '12px', height: '12px' }}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                      </svg>
                    </div>
                  </div>
                </div>
              )
            })
          ) : (
            <p style={{ margin: '12px 0', fontSize: '0.8rem', color: 'var(--text-secondary)', textAlign: 'center' }}>
              Nenhuma próxima reunião.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
