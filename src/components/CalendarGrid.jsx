import { getStatusDetails } from '../utils/statusHelper'

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

          const dayMeetings = meetings.filter(m => m.date === day.dateKey)
          const activeMeetings = dayMeetings.filter(m => m.syncStatus !== 'google_deleted')
          const deletedMeetings = dayMeetings.filter(m => m.syncStatus === 'google_deleted')

          const mainMeeting = activeMeetings[0] || deletedMeetings[0]

          const status = mainMeeting ? getStatusDetails(mainMeeting) : null

          return (
            <div
              key={day.id}
              className={`calendar-day-cell ${day.isToday ? 'today' : ''} ${isSelected ? 'selected' : ''}`}
              onClick={() => {
                setSelectedDateKey(day.dateKey)
              }}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'stretch',
                justifyContent: 'flex-start',
                padding: '8px',
                boxSizing: 'border-box'
              }}
            >
              <div className="day-cell-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                <span className="day-number">{day.dayNumber}</span>
                {status && (
                  <span style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    backgroundColor: status.color,
                    display: 'inline-block'
                  }} />
                )}
              </div>

              {mainMeeting && status && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '4px 6px',
                  borderRadius: '6px',
                  border: `1px solid ${status.color}47`,
                  backgroundColor: `${status.color}14`,
                  color: status.color,
                  fontSize: '0.7rem',
                  fontWeight: '600',
                  marginTop: '8px',
                  justifyContent: 'center',
                  width: '100%',
                  boxSizing: 'border-box',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden'
                }}>
                  <span style={{ fontSize: '0.65rem' }}>{status.icon}</span>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{status.label}</span>
                </div>
              )}

              {dayMeetings.length > 1 && (
                <div style={{
                  fontSize: '0.7rem',
                  fontWeight: '600',
                  color: status ? status.color : 'var(--text-secondary)',
                  marginTop: '4px',
                  textAlign: 'center',
                  width: '100%'
                }}>
                  +{dayMeetings.length - 1}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
