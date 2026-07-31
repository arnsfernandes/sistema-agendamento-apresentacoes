import { useState } from 'react'
import './App.css'

const navigationItems = [
  {
    id: 'calendario',
    label: 'Calendário',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5m-9-6h.008v.008H12v-.008zM12 15h.008v.008H12V15zm0 2.25h.008v.008H12v-.008zM9.75 15h.008v.008H9.75V15zm0 2.25h.008v.008H9.75v-.008zM7.5 15h.008v.008H7.5V15zm0 2.25h.008v.008H7.5v-.008zm6.75-4.5h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008V15zm0 2.25h.008v.008h-.008v-.008zm2.25-4.5h.008v.008H16.5v-.008zm0 2.25h.008v.008H16.5V15z" />
      </svg>
    )
  },
  {
    id: 'clientes',
    label: 'Clientes',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.109A11.386 11.386 0 0110.089 20M3 11.627a1.125 1.125 0 011.083-1.127h4.374c.56 0 1.04.388 1.125.941a11.322 11.322 0 004.122 6.556m-8.622-6.37a1.125 1.125 0 00-1.083 1.127V18.5c0 .54.406.991.94 1.036A11.478 11.478 0 0010.089 20m-7.089-8.373a11.42 11.42 0 007.089 8.373m0 0l.092.012a9.39 9.39 0 005.105-1.503M10.089 20a11.385 11.385 0 01-5.111-1.503m10.092-2.118a8.967 8.967 0 00-3.07-5.07M12.188 8.75a3 3 0 116 0 3 3 0 01-6 0zM1.5 9.75a3 3 0 116 0 3 3 0 01-6 0zM12.251 14.75a3.75 3.75 0 016.75 0V15h-6.75v-.25z" />
      </svg>
    )
  },
  {
    id: 'configuracoes',
    label: 'Configurações',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.43l-1.003.828c-.293.241-.438.613-.43.992a7.723 7.723 0 010 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.43l1.004-.827c.292-.24.437-.613.43-.991a6.936 6.936 0 010-.255c.007-.38-.138-.751-.43.992l-1.004-.827a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    )
  }
]

// Mock list of meetings with expanded details and Meet links
const mockMeetings = [
  { id: 1, date: '2026-07-15', time: '10:00', title: 'Apresentação Comercial A', participants: 3, meetLink: 'https://meet.google.com/abc-defg-hij' },
  { id: 2, date: '2026-07-28', time: '09:00', title: 'Alinhamento de Vendas', participants: 4, meetLink: 'https://meet.google.com/xyz-pdqr-wst' },
  { id: 3, date: '2026-07-28', time: '14:30', title: 'Apresentação Produto X', participants: 2, meetLink: null },
  { id: 4, date: '2026-07-28', time: '16:00', title: 'Feedback de Proposta', participants: 5, meetLink: 'https://meet.google.com/mno-pqrs-tuv' },
  { id: 5, date: '2026-08-05', time: '11:00', title: 'Apresentação Comercial B', participants: 3, meetLink: 'https://meet.google.com/cde-fghi-jkl' },
  { id: 6, date: '2026-08-05', time: '15:00', title: 'Reunião de Fechamento', participants: 2, meetLink: null },
  { id: 7, date: '2026-08-12', time: '10:00', title: 'Kickoff Projeto Y', participants: 6, meetLink: 'https://meet.google.com/stu-vwxy-z12' },
]

function App() {
  const [activeTab, setActiveTab] = useState('calendario')
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDateKey, setSelectedDateKey] = useState(null)
  const [selectedMeeting, setSelectedMeeting] = useState(null)
  const [showMeetLink, setShowMeetLink] = useState(false)
  const [meetCopied, setMeetCopied] = useState(false)

  // Message states
  const [customMessages, setCustomMessages] = useState({})
  const [showMessageModal, setShowMessageModal] = useState(false)
  const [messageCopied, setMessageCopied] = useState(false)
  const [meetingErrorMsg, setMeetingErrorMsg] = useState(null)

  const resetMessageStates = () => {
    setShowMessageModal(false)
    setMessageCopied(false)
    setMeetingErrorMsg(null)
  }

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))
    setSelectedDateKey(null)
    setSelectedMeeting(null)
    setShowMeetLink(false)
    setMeetCopied(false)
    resetMessageStates()
  }

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))
    setSelectedDateKey(null)
    setSelectedMeeting(null)
    setShowMeetLink(false)
    setMeetCopied(false)
    resetMessageStates()
  }

  const getMonthDays = () => {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()
    
    const firstDay = new Date(year, month, 1)
    const startDayOfWeek = firstDay.getDay()
    const totalDays = new Date(year, month + 1, 0).getDate()
    
    const days = []
    
    for (let i = 0; i < startDayOfWeek; i++) {
      days.push({ type: 'empty', id: `empty-${i}` })
    }
    
    const today = new Date()
    for (let day = 1; day <= totalDays; day++) {
      const isToday = 
        day === today.getDate() && 
        month === today.getMonth() && 
        year === today.getFullYear()
      
      const monthStr = String(month + 1).padStart(2, '0')
      const dayStr = String(day).padStart(2, '0')
      const dateKey = `${year}-${monthStr}-${dayStr}`
      
      const meetingsCount = mockMeetings.filter(m => m.date === dateKey).length
        
      days.push({
        type: 'day',
        dayNumber: day,
        isToday,
        meetingsCount,
        dateKey,
        id: `day-${day}`
      })
    }
    
    return days
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'calendario': {
        const days = getMonthDays()
        const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
        const monthName = currentDate.toLocaleString('pt-BR', { month: 'long' })
        const capitalizedMonthName = monthName.charAt(0).toUpperCase() + monthName.slice(1)
        const year = currentDate.getFullYear()

        let formattedSelectedDate = ''
        let dayMeetings = []
        if (selectedDateKey) {
          const [sYear, sMonth, sDay] = selectedDateKey.split('-').map(Number)
          const sDate = new Date(sYear, sMonth - 1, sDay)
          formattedSelectedDate = sDate.toLocaleDateString('pt-BR', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
          })
          dayMeetings = mockMeetings
            .filter((m) => m.date === selectedDateKey)
            .sort((a, b) => a.time.localeCompare(b.time))
        }

        return (
          <div className="view-container">
            <div className="view-header">
              <h1 className="view-title">Calendário</h1>
              <p className="view-description">
                Esta área será usada para visualizar e gerenciar apresentações comerciais.
              </p>
            </div>
            
            <div className="action-bar">
              <button className="btn btn-primary" type="button">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="btn-icon">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zM4 19.235v-.11a6.375 6.375 0 0112.75 0v.109A12.318 12.318 0 0110.374 21c-2.331 0-4.512-.645-6.374-1.766z" />
                </svg>
                Cadastrar cliente
              </button>
              <button className="btn btn-secondary" type="button">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="btn-icon">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 5.25h16.5m-16.5 4.5h16.5m-16.5 4.5h16.5m-16.5 4.5h16.5" />
                </svg>
                Resumo da semana
              </button>
              <button className="btn btn-secondary" type="button">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="btn-icon">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                </svg>
                Atualizar agenda
              </button>
            </div>
            
            <div className="calendar-area">
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
                        onClick={() => setSelectedDateKey(day.dateKey)}
                      >
                        <span className="day-number">{day.dayNumber}</span>
                        {day.meetingsCount > 0 && (
                          <span className="meetings-count-badge">
                            {day.meetingsCount} {day.meetingsCount === 1 ? 'reunião' : 'reuniões'}
                          </span>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>

              {selectedDateKey && (
                <aside className="meetings-panel">
                  <div className="panel-header">
                    <h3 className="panel-title">{formattedSelectedDate}</h3>
                    <button
                      className="btn-close"
                      onClick={() => {
                        setSelectedDateKey(null)
                        setSelectedMeeting(null)
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
                        {dayMeetings.map((meeting) => (
                          <div
                            key={meeting.id}
                            className={`meeting-item-card ${selectedMeeting?.id === meeting.id ? 'active' : ''}`}
                            onClick={() => {
                              setSelectedMeeting(meeting)
                              setShowMeetLink(false)
                              setMeetCopied(false)
                              resetMessageStates()
                            }}
                          >
                            <span className="meeting-time-badge">{meeting.time}</span>
                            <h4 className="meeting-item-title">{meeting.title}</h4>
                            <div className="meeting-participants-info">
                              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.109A11.386 11.386 0 0110.089 20M3 11.627a1.125 1.125 0 011.083-1.127h4.374c.56 0 1.04.388 1.125.941a11.322 11.322 0 004.122 6.556m-8.622-6.37a1.125 1.125 0 00-1.083 1.127V18.5c0 .54.406.991.94 1.036A11.478 11.478 0 0010.089 20m-7.089-8.373a11.42 11.42 0 007.089 8.373m0 0l.092.012a9.39 9.39 0 005.105-1.503M10.089 20a11.385 11.385 0 01-5.111-1.503m10.092-2.118a8.967 8.967 0 00-3.07-5.07M12.188 8.75a3 3 0 116 0 3 3 0 01-6 0zM1.5 9.75a3 3 0 116 0 3 3 0 01-6 0zM12.251 14.75a3.75 3.75 0 016.75 0V15h-6.75v-.25z" />
                              </svg>
                              <span>
                                {meeting.participants} {meeting.participants === 1 ? 'participante' : 'participantes'}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="no-meetings-message">Nenhuma reunião encontrada para esta data</p>
                    )}
                  </div>
                </aside>
              )}
            </div>
          </div>
        )
      }
      case 'clientes':
        return (
          <div className="view-container">
            <h1 className="view-title">Clientes</h1>
            <p className="view-description">Lista de clientes e contatos comerciais.</p>
          </div>
        )
      case 'configuracoes':
        return (
          <div className="view-container">
            <h1 className="view-title">Configurações</h1>
            <p className="view-description">Configurações da conta, integrações e preferências.</p>
          </div>
        )
      default:
        return null
    }
  }

  // Format date for modal
  let formattedMeetingDate = ''
  if (selectedMeeting) {
    const [sYear, sMonth, sDay] = selectedMeeting.date.split('-').map(Number)
    const sDate = new Date(sYear, sMonth - 1, sDay)
    formattedMeetingDate = sDate.toLocaleDateString('pt-BR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    })
  }

  const getDefaultMessage = (meeting, formattedDate) => {
    if (!meeting) return ''
    return `Olá, confirmo nossa apresentação "${meeting.title}" no dia ${formattedDate} às ${meeting.time}. Link do Meet: ${meeting.meetLink}`
  }

  return (
    <div className="dashboard-layout">
      {/* Sidebar Navigation */}
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="brand-logo">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <span className="brand-name">Scheduling</span>
        </div>

        <nav className="sidebar-menu">
          {navigationItems.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`menu-item ${activeTab === item.id ? 'active' : ''}`}
              onClick={() => {
                setActiveTab(item.id)
                setSelectedMeeting(null)
                setShowMeetLink(false)
                setMeetCopied(false)
                resetMessageStates()
              }}
            >
              <span className="menu-icon">{item.icon}</span>
              <span className="menu-label">{item.label}</span>
            </button>
          ))}
        </nav>
      </aside>

      {/* Main Content Area */}
      <main className="main-content">
        <header className="content-header">
          <span className="badge">Em desenvolvimento</span>
        </header>
        <section className="content-body">
          {renderContent()}
        </section>
      </main>

      {/* Meeting Details Modal */}
      {selectedMeeting && (
        <div
          className="modal-overlay"
          onClick={() => {
            setSelectedMeeting(null)
            setShowMeetLink(false)
            setMeetCopied(false)
            resetMessageStates()
          }}
        >
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Detalhes da Reunião</h3>
              <button
                className="btn-close"
                onClick={() => {
                  setSelectedMeeting(null)
                  setShowMeetLink(false)
                  setMeetCopied(false)
                  resetMessageStates()
                }}
                type="button"
                aria-label="Fechar modal"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="modal-body">
              <h2 className="modal-meeting-title">{selectedMeeting.title}</h2>
              
              <div className="modal-meta-info">
                <div className="meta-item">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5m-9-6h.008v.008H12v-.008zM12 15h.008v.008H12V15zm0 2.25h.008v.008H12v-.008zM9.75 15h.008v.008H9.75V15zm0 2.25h.008v.008H9.75v-.008zM7.5 15h.008v.008H7.5V15zm0 2.25h.008v.008H7.5v-.008zm6.75-4.5h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008V15zm0 2.25h.008v.008h-.008v-.008zm2.25-4.5h.008v.008H16.5v-.008zm0 2.25h.008v.008H16.5V15z" />
                  </svg>
                  <span>{formattedMeetingDate}</span>
                </div>
                <div className="meta-item">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>{selectedMeeting.time}</span>
                </div>
              </div>

              <div className="modal-actions">
                <button
                  className="btn btn-secondary"
                  type="button"
                  onClick={() => setShowMeetLink(true)}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="btn-icon">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
                  </svg>
                  Ver link do Meet
                </button>
                <button
                  className="btn btn-secondary"
                  type="button"
                  onClick={() => {
                    setMeetingErrorMsg(null)
                    if (!selectedMeeting.meetLink) {
                      setMeetingErrorMsg('Link ainda não disponível')
                    } else {
                      setShowMessageModal(true)
                    }
                  }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="btn-icon">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
                  </svg>
                  Ver mensagem
                </button>
                <button className="btn btn-primary" type="button">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="btn-icon">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zM4 19.235v-.11a6.375 6.375 0 0112.75 0v.109A12.318 12.318 0 0110.374 21c-2.331 0-4.512-.645-6.374-1.766z" />
                  </svg>
                  Adicionar participante
                </button>
              </div>

              {/* Error indicator for action link */}
              {meetingErrorMsg && (
                <div className="meeting-error-badge">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="error-icon">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                  </svg>
                  <span>{meetingErrorMsg}</span>
                </div>
              )}

              {/* Dynamic Google Meet Link Area */}
              {showMeetLink && (
                <div className="meet-link-section">
                  {selectedMeeting.meetLink ? (
                    <div className="meet-link-container">
                      <a
                        href={selectedMeeting.meetLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="meet-link-url"
                      >
                        {selectedMeeting.meetLink}
                      </a>
                      <button
                        className={`btn-copy ${meetCopied ? 'copied' : ''}`}
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(selectedMeeting.meetLink)
                          setMeetCopied(true)
                        }}
                      >
                        {meetCopied ? 'Link copiado' : 'Copiar'}
                      </button>
                    </div>
                  ) : (
                    <div className="meet-link-not-found">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="error-icon">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                      </svg>
                      <span>Link do Meet não encontrado</span>
                    </div>
                  )}
                </div>
              )}

              <div className="modal-participants-section">
                <h4 className="participants-section-title">Participantes</h4>
                <p className="no-participants-message">Nenhum participante cadastrado</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Message Customization Sub-Modal */}
      {showMessageModal && selectedMeeting && (
        <div className="sub-modal-overlay" onClick={() => { setShowMessageModal(false); setMessageCopied(false); }}>
          <div className="sub-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="sub-modal-header">
              <h4 className="sub-modal-title">Mensagem de Convite</h4>
              <button
                className="btn-close"
                onClick={() => {
                  setShowMessageModal(false)
                  setMessageCopied(false)
                }}
                type="button"
                aria-label="Fechar modal de mensagem"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="sub-modal-body">
              <textarea
                className="message-textarea"
                value={
                  customMessages[selectedMeeting.id] !== undefined
                    ? customMessages[selectedMeeting.id]
                    : getDefaultMessage(selectedMeeting, formattedMeetingDate)
                }
                onChange={(e) => {
                  const val = e.target.value
                  setCustomMessages((prev) => ({
                    ...prev,
                    [selectedMeeting.id]: val
                  }))
                }}
              />
              
              <button
                className={`btn btn-primary ${messageCopied ? 'copied' : ''}`}
                type="button"
                onClick={() => {
                  const textToCopy =
                    customMessages[selectedMeeting.id] !== undefined
                      ? customMessages[selectedMeeting.id]
                      : getDefaultMessage(selectedMeeting, formattedMeetingDate)
                  navigator.clipboard.writeText(textToCopy)
                  setMessageCopied(true)
                }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="btn-icon">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                {messageCopied ? 'Mensagem copiada' : 'Copiar mensagem'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
