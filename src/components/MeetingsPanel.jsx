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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '320px', flexShrink: 0 }}>
      {/* Resumo do Dia Card */}
      <div className="meetings-panel" style={{
        width: '100%',
        backgroundColor: '#0B0C16',
        border: '1px solid rgba(124, 92, 255, 0.28)',
        boxShadow: '0 0 24px rgba(124, 92, 255, 0.06)',
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
            <svg style={{ width: '20px', height: '20px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: '700', color: '#F8FAFC' }}>Resumo do dia</h3>
            <p style={{ margin: '2px 0 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              {selectedDateKey ? formattedSelectedDate : 'Selecione um dia'}
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '4px' }}>
          {selectedDateKey && activeDayMeetings.length > 0 ? (
            activeDayMeetings.map((meeting) => {
              const status = getStatusDetails(meeting)
              const participantText = meeting.participantsList && meeting.participantsList.length > 0
                ? meeting.participantsList.map(p => p.nome).join(', ')
                : 'Sem participantes'

              return (
                <div
                  key={meeting.id}
                  onClick={() => {
                    setSelectedMeetingId(meeting.id)
                    setShowMeetLink(false)
                    setMeetCopied(false)
                    resetMessageStates()
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 12px',
                    borderRadius: '10px',
                    backgroundColor: selectedMeetingId === meeting.id ? 'rgba(124, 92, 255, 0.08)' : '#07080F',
                    border: selectedMeetingId === meeting.id ? '1px solid #7C5CFF' : '1px solid rgba(255, 255, 255, 0.03)',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center', overflow: 'hidden' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: '600', color: '#F8FAFC', whiteSpace: 'nowrap' }}>
                      {meeting.time ? meeting.time.slice(0, 5) : ''}
                    </span>
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: status.color, flexShrink: 0 }} />
                    <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                      <span style={{ fontSize: '0.8rem', fontWeight: '600', color: '#F8FAFC', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {meeting.title}
                      </span>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: '2px' }}>
                        👤 {participantText}
                      </span>
                    </div>
                  </div>
                  <span style={{
                    padding: '2px 8px',
                    borderRadius: '20px',
                    border: `1px solid ${status.color}3d`,
                    backgroundColor: `${status.color}0a`,
                    color: status.color,
                    fontSize: '0.7rem',
                    fontWeight: '600',
                    whiteSpace: 'nowrap',
                    marginLeft: '8px'
                  }}>
                    {status.label}
                  </span>
                </div>
              )
            })
          ) : (
            <p style={{ margin: '12px 0', fontSize: '0.85rem', color: 'var(--text-secondary)', textAlign: 'center' }}>
              {selectedDateKey ? 'Nenhuma reunião para esta data.' : 'Selecione um dia no calendário.'}
            </p>
          )}
        </div>

        {selectedDateKey && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(255, 255, 255, 0.04)', paddingTop: '12px', marginTop: '4px' }}>
            <span
              onClick={() => openPresentationModal(selectedDateKey)}
              style={{ fontSize: '0.8rem', color: '#7C5CFF', fontWeight: '600', cursor: 'pointer' }}
            >
              + Agendar neste dia
            </span>
          </div>
        )}
      </div>

      {/* Próximas Reuniões Card */}
      <div className="meetings-panel" style={{
        width: '100%',
        backgroundColor: '#0B0C16',
        border: '1px solid rgba(124, 92, 255, 0.28)',
        boxShadow: '0 0 24px rgba(124, 92, 255, 0.06)',
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
            <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: '700', color: '#F8FAFC' }}>Próximas reuniões</h3>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {upcomingMeetings.length > 0 ? (
            upcomingMeetings.map((meeting, index) => {
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

              const isLast = index === upcomingMeetings.length - 1

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
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingBottom: isLast ? '0' : '16px',
                    borderBottom: isLast ? 'none' : '1px solid rgba(255, 255, 255, 0.06)',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <div style={{ display: 'flex', gap: '14px', alignItems: 'center', overflow: 'hidden' }}>
                    <div style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '44px',
                      height: '44px',
                      backgroundColor: 'rgba(7, 8, 15, 0.3)',
                      border: `1.5px solid ${status.color}`,
                      borderRadius: '10px',
                      flexShrink: 0
                    }}>
                      <span style={{ fontSize: '1rem', fontWeight: '800', color: '#F8FAFC', lineHeight: 1 }}>{day}</span>
                      <span style={{ fontSize: '0.6rem', fontWeight: '700', color: '#94A3B8', marginTop: '2px', lineHeight: 1 }}>{month}</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                      <span style={{ fontSize: '0.8rem', color: '#94A3B8', fontWeight: '500' }}>
                        {meeting.time ? meeting.time.slice(0, 5) : ''}
                      </span>
                      <span style={{ fontSize: '0.9rem', color: '#F8FAFC', fontWeight: '700', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: '2px' }}>
                        {meeting.title}
                      </span>
                      <span style={{ fontSize: '0.75rem', color: '#94A3B8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: '2px' }}>
                        {participantText}
                      </span>
                    </div>
                  </div>
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
                    flexShrink: 0,
                    marginLeft: '8px'
                  }}>
                    {statusIcon}
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
