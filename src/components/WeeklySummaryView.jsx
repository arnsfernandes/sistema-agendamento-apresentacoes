import { useState, useEffect } from 'react'

export default function WeeklySummaryView({ meetings, onSelectMeeting }) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024)
  const [hoveredCardKey, setHoveredCardKey] = useState(null)

  // Track window resizing for responsive layout
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 1024)
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const formatDateKey = (date) => {
    const y = date.getFullYear()
    const m = String(date.getMonth() + 1).padStart(2, '0')
    const d = String(date.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
  }

  // Selected/fixed day on desktop
  const [selectedDayDesktop, setSelectedDayDesktop] = useState(formatDateKey(new Date()))

  // Get Monday of the week containing currentDate
  const getMonday = (d) => {
    const date = new Date(d)
    const day = date.getDay()
    const diff = date.getDate() - day + (day === 0 ? -6 : 1) // adjust when day is sunday
    const monday = new Date(date.setDate(diff))
    monday.setHours(0, 0, 0, 0)
    return monday
  }

  const monday = getMonday(currentDate)

  // Generate 7 days of the week starting from Monday
  const weekDays = []
  for (let i = 0; i < 7; i++) {
    const day = new Date(monday)
    day.setDate(monday.getDate() + i)
    weekDays.push(day)
  }

  // Initialize expanded state for mobile (expand Today by default)
  const [expandedDays, setExpandedDays] = useState({
    [formatDateKey(new Date())]: true
  })

  const toggleDay = (dateKey) => {
    setExpandedDays(prev => ({
      ...prev,
      [dateKey]: !prev[dateKey]
    }))
  }

  const handlePrevWeek = () => {
    const nextDate = new Date(currentDate)
    nextDate.setDate(currentDate.getDate() - 7)
    setCurrentDate(nextDate)
  }

  const handleNextWeek = () => {
    const nextDate = new Date(currentDate)
    nextDate.setDate(currentDate.getDate() + 7)
    setCurrentDate(nextDate)
  }

  const handleToday = () => {
    const today = new Date()
    setCurrentDate(today)
    const todayKey = formatDateKey(today)
    setExpandedDays({
      [todayKey]: true
    })
    setSelectedDayDesktop(todayKey)
  }

  const formatDisplayDate = (date) => {
    return date.toLocaleDateString('pt-BR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long'
    })
  }

  const capitalize = (str) => str.charAt(0).toUpperCase() + str.slice(1)

  return (
    <div className="view-container" style={!isMobile ? { display: 'flex', flexDirection: 'column', height: 'calc(100vh - 125px)', gap: '0.5rem', boxSizing: 'border-box', overflow: 'hidden' } : {}}>
      <div className="view-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem', width: '100%', textAlign: 'left', marginBottom: '0.1rem' }}>
        <div style={{ textAlign: 'left' }}>
          <h1 className="view-title" style={{ margin: 0, fontSize: '1.5rem' }}>Sua semana</h1>
          <p className="view-description" style={{ margin: '0.15rem 0 0 0', fontSize: '0.85rem' }}>Veja suas reuniões e organize os próximos dias.</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignSelf: 'center' }}>
          <button className="btn btn-secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }} onClick={handlePrevWeek}>
            Semana anterior
          </button>
          <button className="btn btn-secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }} onClick={handleToday}>
            Hoje
          </button>
          <button className="btn btn-secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }} onClick={handleNextWeek}>
            Próxima semana
          </button>
        </div>
      </div>

      {isMobile ? (
        /* Vertical Accordion Layout for Mobile */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1.5rem' }}>
          {weekDays.map((day) => {
            const dateKey = formatDateKey(day)
            const dayMeetings = (meetings || [])
              .filter((m) => m.date === dateKey && (m.participantsList || []).some(p => p.statusAtivo))
              .sort((a, b) => a.time.localeCompare(b.time))

            const isToday = new Date().toDateString() === day.toDateString()
            const isExpanded = !!expandedDays[dateKey]

            const cardBackground = isToday
              ? 'rgba(79, 70, 229, 0.05)'
              : (isExpanded
                  ? 'rgba(59, 130, 246, 0.05)'
                  : (dayMeetings.length > 0 ? 'rgba(59, 130, 246, 0.02)' : 'var(--bg-secondary)'))

            const cardBorder = isToday
              ? '2px solid var(--text-accent)'
              : (isExpanded ? '1px solid rgba(59, 130, 246, 0.25)' : '1px solid var(--border-color)')

            const cardShadow = isExpanded
              ? '0 4px 12px rgba(59, 130, 246, 0.05)'
              : '0 2px 4px rgba(0,0,0,0.01)'

            return (
              <div
                key={dateKey}
                style={{
                  background: cardBackground,
                  border: cardBorder,
                  borderRadius: '12px',
                  padding: '1.25rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.75rem',
                  boxShadow: cardShadow,
                  transition: 'all 0.2s ease'
                }}
              >
                {/* Header Clicável (Accordion Toggle) */}
                <div
                  onClick={() => toggleDay(dateKey)}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    cursor: 'pointer',
                    userSelect: 'none',
                    paddingBottom: isExpanded ? '0.25rem' : '0'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: '600', color: isToday ? 'var(--text-accent)' : 'var(--text-primary)' }}>
                      {capitalize(formatDisplayDate(day))}
                    </h3>
                    {isToday && (
                      <span style={{
                        fontSize: '0.7rem',
                        fontWeight: '600',
                        background: 'rgba(79, 70, 229, 0.12)',
                        color: 'var(--text-accent)',
                        padding: '0.2rem 0.5rem',
                        borderRadius: '8px'
                      }}>
                        Hoje
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--text-secondary)' }}>
                    {!isExpanded && dayMeetings.length > 0 && (
                      <span style={{
                        fontSize: '0.75rem',
                        fontWeight: '600',
                        background: 'rgba(59, 130, 246, 0.12)',
                        color: '#3b82f6',
                        padding: '0.2rem 0.55rem',
                        borderRadius: '6px'
                      }}>
                        {dayMeetings.length} {dayMeetings.length === 1 ? 'reunião' : 'reuniões'}
                      </span>
                    )}
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={2.5}
                      stroke="currentColor"
                      style={{
                        width: '16px',
                        height: '16px',
                        transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                        transition: 'transform 0.2s ease',
                        flexShrink: 0
                      }}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                    </svg>
                  </div>
                </div>

                {/* Área Expandível */}
                {isExpanded && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.25rem' }}>
                    {dayMeetings.length > 0 ? (
                      dayMeetings.map((meeting) => {
                        const activeParticipantsCount = (meeting.participantsList || []).filter(p => p.statusAtivo).length

                        return (
                          <div
                            key={meeting.id}
                            style={{
                              background: 'var(--bg-primary)',
                              border: '1px solid var(--border-color)',
                              borderRadius: '8px',
                              padding: '0.85rem 1rem',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              gap: '1rem',
                              flexWrap: 'wrap'
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', flexGrow: 1 }}>
                              <span style={{
                                fontSize: '0.85rem',
                                fontWeight: '600',
                                color: 'var(--text-primary)',
                                background: 'var(--bg-secondary)',
                                padding: '0.25rem 0.5rem',
                                borderRadius: '6px',
                                whiteSpace: 'nowrap',
                                border: '1px solid var(--border-color)'
                              }}>
                                {meeting.time}
                              </span>
                              <span style={{ fontSize: '0.95rem', fontWeight: '600', color: 'var(--text-primary)' }}>
                                {meeting.title}
                              </span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" style={{ width: '15px', height: '15px', opacity: 0.75 }}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.109A11.386 11.386 0 0022 19.128zM15 8.962a4.5 4.5 0 00-3.13-3.902 4.5 4.5 0 00-6.74 3.902 4.68 4.68 0 00.375 1.86l.041.077c.819 1.542 2.55 2.51 4.323 2.51s3.504-.968 4.323-2.51l.04-.078a4.68 4.68 0 00.377-1.859z" />
                                </svg>
                                <span>{activeParticipantsCount} {activeParticipantsCount === 1 ? 'participante' : 'participantes'}</span>
                              </div>
                              <button
                                className="btn btn-primary"
                                type="button"
                                onClick={() => onSelectMeeting(meeting.id)}
                                style={{
                                  fontSize: '0.8rem',
                                  padding: '0.4rem 0.85rem',
                                  height: 'auto',
                                  background: 'var(--text-accent)',
                                  color: '#ffffff',
                                  border: 'none',
                                  cursor: 'pointer'
                                }}
                              >
                                Ver reunião
                              </button>
                            </div>
                          </div>
                        )
                      })
                    ) : (
                      <span style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', fontStyle: 'italic', paddingLeft: '0.25rem', paddingTop: '0.25rem' }}>
                        Nenhuma reunião
                      </span>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      ) : (
        /* Grid Layout for Desktop filling height completely */
        <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', minHeight: '0', marginTop: '0.25rem' }}>
          {/* Days Grid with equal height rows */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gridTemplateRows: '1fr 1fr', gap: '0.75rem', width: '100%', flexGrow: 1, minHeight: '0' }}>
            {weekDays.map((day, index) => {
              const dateKey = formatDateKey(day)
              const dayMeetings = (meetings || [])
                .filter((m) => m.date === dateKey && (m.participantsList || []).some(p => p.statusAtivo))
                .sort((a, b) => a.time.localeCompare(b.time))

              const isToday = new Date().toDateString() === day.toDateString()
              const isSelected = selectedDayDesktop === dateKey
              const isHovered = hoveredCardKey === dateKey
              const isExpandedOrHovered = isSelected || (isHovered && dayMeetings.length > 0)

              const cardBackground = isToday
                ? 'rgba(79, 70, 229, 0.05)'
                : (isExpandedOrHovered
                    ? 'rgba(59, 130, 246, 0.05)'
                    : (dayMeetings.length > 0 ? 'rgba(59, 130, 246, 0.02)' : 'var(--bg-secondary)'))

              const cardBorder = isSelected
                ? '2px solid var(--text-accent)'
                : (isToday ? '2px dotted var(--text-accent)' : (isHovered ? '1px solid rgba(59, 130, 246, 0.25)' : '1px solid var(--border-color)'))

              const cardShadow = isSelected
                ? '0 4px 12px rgba(79, 70, 229, 0.08)'
                : (isHovered ? '0 12px 28px rgba(0,0,0,0.12)' : '0 1px 3px rgba(0,0,0,0.01)')

              const cardTransform = isHovered ? 'scale(1.10) translateY(-6px)' : 'scale(1) translateY(0)'

              return (
                <div
                  key={dateKey}
                  onClick={() => setSelectedDayDesktop(isSelected ? null : dateKey)}
                  onMouseEnter={() => setHoveredCardKey(dateKey)}
                  onMouseLeave={() => setHoveredCardKey(null)}
                  style={{
                    gridColumn: index < 4 ? 'span 3' : 'span 4',
                    background: cardBackground,
                    border: cardBorder,
                    borderRadius: '10px',
                    padding: '0.75rem 1rem',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    height: '100%',
                    boxSizing: 'border-box',
                    boxShadow: cardShadow,
                    transform: cardTransform,
                    transition: 'transform 200ms ease-out, box-shadow 200ms ease-out, border-color 200ms ease-out, background-color 200ms ease-out',
                    textAlign: 'left',
                    minHeight: '0',
                    zIndex: isHovered ? 20 : 1
                  }}
                >
                  {/* Top Header Section */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                    {/* Top: Day of the week + Today badge */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.78rem', fontWeight: '600', color: 'var(--text-secondary)' }}>
                        {capitalize(day.toLocaleDateString('pt-BR', { weekday: 'long' }))}
                      </span>
                      {isToday && (
                        <span style={{
                          fontSize: '0.62rem',
                          fontWeight: '600',
                          background: 'rgba(79, 70, 229, 0.12)',
                          color: 'var(--text-accent)',
                          padding: '0.1rem 0.35rem',
                          borderRadius: '5px'
                        }}>
                          Hoje
                        </span>
                      )}
                    </div>

                    {/* Middle: Day number in focus + Month */}
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.3rem' }}>
                      <span style={{ fontSize: '1.45rem', fontWeight: '800', color: 'var(--text-primary)', lineHeight: '1' }}>
                        {day.getDate()}
                      </span>
                      <span style={{ fontSize: '0.78rem', fontWeight: '500', color: 'var(--text-secondary)' }}>
                        de {day.toLocaleDateString('pt-BR', { month: 'long' })}
                      </span>
                    </div>
                  </div>

                  {/* Embedded Details Panel (Inside Card with flex scroll, constrained nicely inside grid height) */}
                  {isExpandedOrHovered && (
                    <div
                      onClick={(e) => e.stopPropagation()}
                      className="scrollbar-thin"
                      style={{ 
                        display: 'flex', 
                        flexDirection: 'column', 
                        gap: '0.35rem', 
                        marginTop: '0.35rem',
                        marginBottom: '0.35rem',
                        overflowY: 'auto',
                        flexGrow: 1,
                        paddingRight: '0.2rem',
                        minHeight: '0'
                      }}
                    >
                      {dayMeetings.length > 0 ? (
                        dayMeetings.map((meeting) => {
                          const activeParticipantsCount = (meeting.participantsList || []).filter(p => p.statusAtivo).length

                          return (
                            <div
                              key={meeting.id}
                              style={{
                                background: 'var(--bg-primary)',
                                border: '1px solid var(--border-color)',
                                borderRadius: '6px',
                                padding: '0.55rem',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '0.35rem'
                              }}
                            >
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{
                                  fontSize: '0.68rem',
                                  fontWeight: '600',
                                  color: 'var(--text-primary)',
                                  background: 'var(--bg-secondary)',
                                  padding: '0.12rem 0.3rem',
                                  borderRadius: '4px',
                                  border: '1px solid var(--border-color)'
                                }}>
                                  {meeting.time}
                                </span>
                                <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" style={{ width: '11px', height: '11px', opacity: 0.75 }}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.109A11.386 11.386 0 0022 19.128zM15 8.962a4.5 4.5 0 00-3.13-3.902 4.5 4.5 0 00-6.74 3.902 4.68 4.68 0 00.375 1.86l.041.077c.819 1.542 2.55 2.51 4.323 2.51s3.504-.968 4.323-2.51l.04-.078a4.68 4.68 0 00.377-1.859z" />
                                  </svg>
                                  <span>{activeParticipantsCount}</span>
                                </div>
                              </div>
                              <span style={{ fontSize: '0.78rem', fontWeight: '600', color: 'var(--text-primary)', wordBreak: 'break-word', lineHeight: '1.2' }}>
                                {meeting.title}
                              </span>
                              <button
                                className="btn btn-primary"
                                type="button"
                                onClick={() => onSelectMeeting(meeting.id)}
                                style={{
                                  fontSize: '0.7rem',
                                  padding: '0.22rem 0.4rem',
                                  height: 'auto',
                                  background: 'var(--text-accent)',
                                  color: '#ffffff',
                                  border: 'none',
                                  cursor: 'pointer',
                                  width: '100%',
                                  marginTop: '0.1rem'
                                }}
                              >
                                Ver reunião
                              </button>
                            </div>
                          )
                        })
                      ) : (
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontStyle: 'italic', padding: '0.2rem 0' }}>
                          Nenhuma reunião.
                        </span>
                      )}
                    </div>
                  )}

                  {/* Footer Section */}
                  <div style={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'center', borderTop: '1px solid var(--border-color)', paddingTop: '0.4rem', marginTop: 'auto' }}>
                    {dayMeetings.length > 0 ? (
                      <span style={{
                        fontSize: '0.72rem',
                        fontWeight: '600',
                        background: 'rgba(59, 130, 246, 0.12)',
                        color: '#3b82f6',
                        padding: '0.15rem 0.5rem',
                        borderRadius: '5px'
                      }}>
                        {dayMeetings.length} {dayMeetings.length === 1 ? 'reunião' : 'reuniões'}
                      </span>
                    ) : (
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                        Sem reuniões
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
