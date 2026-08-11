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
  openPresentationModal
}) {
  if (!selectedDateKey) return null

  return (
    <div className="meetings-panel-overlay" onClick={() => {
      setSelectedDateKey(null)
      setSelectedMeetingId(null)
      setShowMeetLink(false)
      setMeetCopied(false)
      resetMessageStates()
    }}>
      <aside className="meetings-panel" onClick={(e) => e.stopPropagation()}>
        <div className="panel-header">
          <h3 className="panel-title">{formattedSelectedDate}</h3>
          <button
            className="btn-close"
            onClick={() => {
              setSelectedDateKey(null)
              setSelectedMeetingId(null)
              setShowMeetLink(false)
              setMeetCopied(false)
              resetMessageStates()
            }}
            type="button"
            aria-label="Fechar painel"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="panel-body">
          {dayMeetings.length > 0 ? (
            <div className="meetings-list">
              {[
                ...dayMeetings.filter(m => m.syncStatus !== 'google_deleted'),
                ...dayMeetings.filter(m => m.syncStatus === 'google_deleted'),
              ].map((meeting) => {
                const isGoogleDeleted = meeting.syncStatus === 'google_deleted'
                return (
                  <div
                    key={meeting.id}
                    className={`meeting-item-card ${selectedMeetingId === meeting.id ? 'active' : ''} ${isGoogleDeleted ? 'google-deleted' : ''} ${meeting.syncStatus === 'pending' ? 'pending' : ''}`}
                    onClick={() => {
                      setSelectedMeetingId(meeting.id)
                      setShowMeetLink(false)
                      setMeetCopied(false)
                      resetMessageStates()
                    }}
                  >
                    <span className="meeting-time-badge">{meeting.time}{meeting.timeEnd ? ` - ${meeting.timeEnd}` : ''}</span>
                    <h4 className="meeting-item-title">{meeting.title}</h4>
                    {isGoogleDeleted && (
                      <span className="meeting-cancelled-badge">Reunião cancelada</span>
                    )}
                    {meeting.syncStatus === 'pending' && (
                      <span className="meeting-pending-badge">Ação necessária</span>
                    )}
                    <div className="meeting-participants-info">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.109A11.386 11.386 0 0110.089 20M3 11.627a1.125 1.125 0 011.083-1.127h4.374c.56 0 1.04.388 1.125.941a11.322 11.322 0 004.122 6.556m-8.622-6.37a1.125 1.125 0 00-1.083 1.127V18.5c0 .54.406.991.94 1.036A11.478 11.478 0 0010.089 20m-7.089-8.373a11.42 11.42 0 007.089 8.373m0 0l.092.012a9.39 9.39 0 005.105-1.503M10.089 20a11.385 11.385 0 01-5.111-1.503m10.092-2.118a8.967 8.967 0 00-3.07-5.07M12.188 8.75a3 3 0 116 0 3 3 0 01-6 0zM1.5 9.75a3 3 0 116 0 3 3 0 01-6 0zM12.251 14.75a3.75 3.75 0 016.75 0V15h-6.75v-.25z" />
                      </svg>
                      <span>
                        {meeting.participantsList.length} {meeting.participantsList.length === 1 ? 'participante' : 'participantes'}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <p className="no-meetings-message">Nenhuma apresentação agendada para esta data.</p>
          )}

          <div className="day-create-action">
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => openPresentationModal(selectedDateKey)}
            >
              Criar apresentação neste dia
            </button>
          </div>
        </div>
      </aside>
    </div>
  )
}
