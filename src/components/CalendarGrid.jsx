export default function CalendarGrid({
  handlePrevMonth,
  handleNextMonth,
  capitalizedMonthName,
  year,
  weekDays,
  days,
  selectedDateKey,
  setSelectedDateKey,
  meetings
}) {
  return (
    <div className="calendar-card">
      {/* Calendar Navigation Header */}
      <div className="calendar-header-nav">
        <button className="btn-nav" onClick={handlePrevMonth} type="button" aria-label="Mês anterior">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
        </button>
        <h2 className="calendar-month-title">{capitalizedMonthName} {year}</h2>
        <button className="btn-nav" onClick={handleNextMonth} type="button" aria-label="Próximo mês">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
          </svg>
        </button>
      </div>

      {/* Weekdays Labels */}
      <div className="calendar-weekdays-grid">
        {weekDays.map((wd) => (
          <div key={wd} className="weekday-label">
            {wd}
          </div>
        ))}
      </div>

      {/* Days Grid */}
      <div className="calendar-days-grid">
        {days.map((day) => {
          if (day.type === 'empty') {
            return <div key={day.id} className="calendar-day-cell empty" />
          }
          const isSelected = day.dateKey === selectedDateKey
          return (
            <div
              key={day.id}
              className={`calendar-day-cell ${day.isToday ? 'today' : ''} ${isSelected ? 'selected' : ''}`}
              onClick={() => {
                setSelectedDateKey(day.dateKey)
              }}
            >
              {(() => {
                const dayMeetings = meetings.filter(m => m.date === day.dateKey)
                const hasRecurringEmpty = dayMeetings.some(m => m.googleRecurringEventId && m.syncStatus !== 'google_deleted' && (!m.participantsList || !m.participantsList.some(p => p.statusAtivo)))
                return hasRecurringEmpty ? <span className="recurring-indicator-dot" title="Recorrência sem participantes" /> : null
              })()}
              <span className="day-number">{day.dayNumber}</span>
              {(() => {
                const dayMeetings = meetings.filter(m => m.date === day.dateKey)
                const activeMeetings = dayMeetings.filter(m =>
                  m.syncStatus !== 'google_deleted' &&
                  m.participantsList &&
                  m.participantsList.some(p => p.statusAtivo)
                )
                const hasMeetings = dayMeetings.length > 0
                const hasParticipants = dayMeetings.some(m => m.participantsList && m.participantsList.some(p => p.statusAtivo))

                if (!hasMeetings) return null

                return (
                  <>
                    {activeMeetings.length > 0 && (
                      <span className="meetings-count-badge">
                        {activeMeetings.length} {activeMeetings.length === 1 ? 'reunião' : 'reuniões'}
                      </span>
                    )}
                    <span className={`meetings-dot-indicator ${hasParticipants ? 'purple-dot' : 'grey-dot'}`} />
                  </>
                )
              })()}
            </div>
          )
        })}
      </div>
    </div>
  )
}
