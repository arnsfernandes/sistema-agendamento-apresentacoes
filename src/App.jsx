import { useState, useEffect, useRef, useCallback } from 'react'
import { FunctionsHttpError } from '@supabase/supabase-js'
import './App.css'
import Sidebar from './components/Sidebar'
import AuthView from './components/AuthView'
import CalendarGrid from './components/CalendarGrid'
import ClientsView from './components/ClientsView'
import WeeklySummaryView from './components/WeeklySummaryView'
import SettingsView from './components/SettingsView'
import DashboardView from './components/DashboardView'
import MeetingDetailsModal from './components/MeetingDetailsModal'
import InviteMessageModal from './components/InviteMessageModal'
import MeetingsPanel from './components/MeetingsPanel'
import AddParticipantModal from './components/AddParticipantModal'
import PendingMeetingsModal from './components/PendingMeetingsModal'
import RescheduleParticipantModal from './components/RescheduleParticipantModal'
import AddPresentationModal from './components/AddPresentationModal'
import EditPresentationModal from './components/EditPresentationModal'
import MoveParticipantsModal from './components/MoveParticipantsModal'
import DeletePresentationModal from './components/DeletePresentationModal'
import PrivacyView from './components/PrivacyView'
import { supabase } from './services/supabaseClient'
import { generateMeetLink } from './services/googlePresentationService'

import { findClientByPhone } from './services/clientService'
import useClients from './hooks/useClients'
import useMessages from './hooks/useMessages'
import usePresentationModals from './hooks/usePresentationModals'
import useGoogleCalendars from './hooks/useGoogleCalendars'
import useAuth from './hooks/useAuth'
import useParticipantModals from './hooks/useParticipantModals'
import useMeetings from './hooks/useMeetings'
import useParticipants from './hooks/useParticipants'
import usePresentationActions from './hooks/usePresentationActions'
import usePresentationDeletion from './hooks/usePresentationDeletion'
import { isPresentationFuture } from './utils/dateUtils'



function App() {
  // Auth custom hook
  const {
    user,
    authLoading,
    authMode,
    setAuthMode,
    email,
    setEmail,
    password,
    setPassword,
    loginError,
    setLoginError,
    loginSuccess,
    setLoginSuccess,
    loginLoading,
    name,
    setName,
    whatsapp,
    setWhatsapp,
    newPassword,
    setNewPassword,
    confirmPassword,
    setConfirmPassword,
    handleLoginSubmit,
    handleSignUpSubmit,
    handleForgotPasswordSubmit,
    handleUpdatePasswordSubmit,
    signOut
  } = useAuth()

  const userId = user?.id
  const checkGoogleIntegration = useCallback(async () => {
    if (!userId) {
      setHasActiveGoogleIntegration(false)
      return
    }
    try {
      const { data } = await supabase
        .from('google_integracao')
        .select('id, google_email, calendar_id')
        .eq('user_id', userId)
        .eq('ativo', true)
        .maybeSingle()
      
      if (data) {
        setHasActiveGoogleIntegration(true)
        if (data.google_email) {
          setGoogleAccountEmail(data.google_email)
        }
        if (data.calendar_id) {
          setActiveCalendarId(data.calendar_id)
        }
      } else {
        setHasActiveGoogleIntegration(false)
        setGoogleAccountEmail(null)
      }
    } catch (e) {
      console.error('Erro ao checar integração:', e)
    }
  }, [userId])



  useEffect(() => {
    if (user) {
      checkGoogleIntegration()
    } else {
      setHasActiveGoogleIntegration(false)
    }
  }, [user, checkGoogleIntegration])

  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDateKey, setSelectedDateKey] = useState(null)
  
  const [activeTab, setActiveTab] = useState('agenda')
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  // Meetings custom hook
  const {
    meetings,
    meetingsLoading,
    meetingsError,
    setMeetingsLoading,
    setMeetingsError,
    refreshMeetings,
    clearMeetings,
    updateSingleMeeting,
    addLocalMeeting
  } = useMeetings(user)

  // Participants custom hook
  const {
    handleAddParticipant,
    handleUpdateParticipant,
    handleCancelParticipant,
    handleReactivateParticipant,
    handleRescheduleParticipant
  } = useParticipants(meetings, refreshMeetings)

  // Presentation actions custom hook
  const {
    handleCreatePresentation,
    handleUpdatePresentation
  } = usePresentationActions(refreshMeetings, addLocalMeeting, currentDate)

  const [selectedMeetingId, setSelectedMeetingId] = useState(null)
  const [isConnectingGoogle, setIsConnectingGoogle] = useState(false)
  const [googleConnectError, setGoogleConnectError] = useState(null)
  const [googleAccountEmail, setGoogleAccountEmail] = useState(null)
  const [hasActiveGoogleIntegration, setHasActiveGoogleIntegration] = useState(false)
  // Google calendars custom hook
  const {
    googleCalendars,
    selectedCalendar,
    setSelectedCalendar,
    calendarsLoading,
    calendarsError,
    fetchGoogleCalendars
  } = useGoogleCalendars()

  const [isSavingCalendar, setIsSavingCalendar] = useState(false)
  const [savingCalendarError, setSavingCalendarError] = useState(null)
  const [savingCalendarSuccess, setSavingCalendarSuccess] = useState(false)
  const [activeCalendarId, setActiveCalendarId] = useState(null)
  const [isDisconnectingGoogle, setIsDisconnectingGoogle] = useState(false)
  const [googleDisconnectError, setGoogleDisconnectError] = useState(null)

  // Derive selectedMeeting reactively
  const selectedMeeting = meetings.find(m => m.id === selectedMeetingId)

  const [showMeetLink, setShowMeetLink] = useState(false)
  const [meetCopied, setMeetCopied] = useState(false)
  const [showPendingList, setShowPendingList] = useState(false)

  // Message custom hook
  const {
    customMessages,
    setCustomMessages,
    showMessageModal,
    setShowMessageModal,
    messageCopied,
    setMessageCopied,
    getDefaultMessage,
    resetMessages
  } = useMessages()

  const [meetingErrorMsg, setMeetingErrorMsg] = useState(null)

  // Participant modals custom hook
  const {
    editingParticipant,
    reschedulingParticipant,
    showAddParticipantModal,
    openAddParticipant,
    closeAddParticipant,
    openEditParticipant,
    openRescheduleParticipant,
    closeRescheduleParticipant,
    resetParticipantModals
  } = useParticipantModals()

  // Modal and form states
  // Presentation modals custom hook
  const {
    showAddPresentationModal,
    showEditPresentationModal,
    presentationModalInitialDate,
    openPresentationModal,
    closePresentationModal,
    openEditPresentationModal,
    closeEditPresentationModal
  } = usePresentationModals()

  const resetMessageStates = useCallback(() => {
    resetMessages()
    setMeetingErrorMsg(null)
    resetParticipantModals()
  }, [resetMessages, resetParticipantModals])

  // Deletion custom hook
  const {
    showMoveParticipantsModal,
    setShowMoveParticipantsModal,
    showDeletePresentationModal,
    setShowDeletePresentationModal,
    deleteTargetId,
    setDeleteTargetId,
    deleteTargetParticipants,
    setDeleteTargetParticipants,
    movingPresentation,
    setMovingPresentation,
    isDeletingPresentation,
    isMovingAndDeleteProcessing,
    handleDeletePresentation,
    handleMoveAndDeletePresentation
  } = usePresentationDeletion(meetings, refreshMeetings, currentDate, useCallback(() => {
    setSelectedMeetingId(null)
    setShowMeetLink(false)
    setMeetCopied(false)
    resetMessageStates()
  }, [setSelectedMeetingId, setShowMeetLink, setMeetCopied, resetMessageStates]))

  const [remotePresentationData, setRemotePresentationData] = useState(null)
  const [isFixingSchedule, setIsFixingSchedule] = useState(false)
  const [isGeneratingMeet, setIsGeneratingMeet] = useState(false)

  const lastSyncedMonthRef = useRef(null)

  // Client custom hook
  const {
    clients,
    handleAddDirectClient,
    handleUpdateDirectClient,
    handleDeleteDirectClient
  } = useClients(user, activeTab)

  // Theme state
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('theme') || 'light'
  })

  useEffect(() => {
    const applyTheme = () => {
      if (!user) {
        const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
        document.documentElement.setAttribute('data-theme', systemTheme)
      } else {
        if (theme === 'system') {
          const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
          document.documentElement.setAttribute('data-theme', systemTheme)
        } else {
          document.documentElement.setAttribute('data-theme', theme)
        }
        localStorage.setItem('theme', theme)
      }
    }

    applyTheme()

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handleChange = () => {
      if (!user || theme === 'system') {
        applyTheme()
      }
    }

    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [theme, user])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('google') === 'connected') {
      setActiveTab('configuracoes')
      setGoogleSuccessMessage('Conta Google conectada com sucesso.')
      
      params.delete('google')
      const newQuery = params.toString()
      const newUrl = window.location.pathname + (newQuery ? `?${newQuery}` : '')
      window.history.replaceState({}, document.title, newUrl)
    }
  }, [])

  useEffect(() => {
    const initCalendars = async () => {
      if (activeTab === 'configuracoes' && user) {
        checkGoogleIntegration()
        const data = await fetchGoogleCalendars()
        if (data) {
          if (data.googleEmail) {
            setGoogleAccountEmail(prev => prev || data.googleEmail)
          }
          if (data.selectedCalendarId) {
            setActiveCalendarId(data.selectedCalendarId)
          }
        }
      }
    }
    initCalendars()
  }, [activeTab, user, checkGoogleIntegration, fetchGoogleCalendars])

  useEffect(() => {
    if (activeTab === 'calendario' && user) {
      const y = currentDate.getFullYear()
      const m = currentDate.getMonth()
      const monthKey = `${y}-${String(m + 1).padStart(2, '0')}`

      if (lastSyncedMonthRef.current !== monthKey) {
        lastSyncedMonthRef.current = monthKey

        const startDate = `${y}-${String(m + 1).padStart(2, '0')}-01`
        const next = new Date(y, m + 1, 1)
        const endDate = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}-01`

        supabase.functions.invoke('google-calendar-sync-apply', {
          body: { startDate, endDate }
        }).then(({ error }) => {
          if (error) throw error
          refreshMeetings()
        }).catch(err => {
          console.error('Erro na sincronização automática:', err)
        })
      }
    }
  }, [activeTab, user, currentDate, refreshMeetings])

  const handleLogout = async () => {
    lastSyncedMonthRef.current = null
    await signOut()
  }



  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))
    setSelectedDateKey(null)
    setSelectedMeetingId(null)
    setShowMeetLink(false)
    setMeetCopied(false)
    resetMessageStates()
  }

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))
    setSelectedDateKey(null)
    setSelectedMeetingId(null)
    setShowMeetLink(false)
    setMeetCopied(false)
    resetMessageStates()
  }



  const handleConnectGoogle = async () => {
    setIsConnectingGoogle(true)
    setGoogleConnectError(null)
    try {
      const { data, error } = await supabase.functions.invoke('google-oauth-start', {
        body: { origin: window.location.origin }
      })
      if (error) throw error
      if (data && data.authorizationUrl) {
        window.location.href = data.authorizationUrl
      } else {
        throw new Error('URL de autorização não recebida do servidor.')
      }
    } catch (err) {
      console.error('Erro ao conectar Google:', err)
      setGoogleConnectError('Não foi possível iniciar a conexão com o Google. Tente novamente.')
      setIsConnectingGoogle(false)
    }
  }



  const handleSaveCalendar = async (calendarToSave = null) => {
    const calendar = calendarToSave || selectedCalendar
    if (!calendar) return
    setIsSavingCalendar(true)
    setSavingCalendarError(null)
    setSavingCalendarSuccess(false)
    try {
      const { error } = await supabase.functions.invoke('google-calendar-select', {
        body: { calendarId: calendar.id }
      })
      if (error) throw error
      setSavingCalendarSuccess(true)
      setActiveCalendarId(calendar.id)
      
      // Refresh meetings list automatically for the new calendar
      clearMeetings()
      setMeetingsLoading(true)
      try {
        await checkGoogleIntegration()
        await refreshMeetings()
      } catch (listErr) {
        console.error('Erro ao atualizar apresentações após trocar agenda:', listErr)
        clearMeetings()
        setMeetingsError('Não foi possível carregar as apresentações da nova agenda.')
      } finally {
        setMeetingsLoading(false)
      }
    } catch (err) {
      console.error('Erro ao salvar agenda:', err)
      let errorMsg = 'Não foi possível salvar a agenda selecionada. Tente novamente.'
      if (err instanceof FunctionsHttpError) {
        try {
          const body = await err.context.json()
          if (body && body.error) {
            errorMsg = body.error
          }
        } catch {
        }
      } else if (err && err.message) {
        errorMsg = err.message
      }
      setSavingCalendarError(errorMsg)
    } finally {
      setIsSavingCalendar(false)
    }
  }

  const handleDisconnectGoogle = async () => {
    if (!window.confirm('Tem certeza de que deseja desconectar a sua conta Google?')) return
    setIsDisconnectingGoogle(true)
    setGoogleDisconnectError(null)
    setGoogleSuccessMessage(null)
    try {
      const { error } = await supabase.functions.invoke('google-disconnect')
      if (error) throw error
      
      // Clear states
      setGoogleAccountEmail(null)
      setGoogleCalendars([])
      setSelectedCalendar(null)
      setActiveCalendarId(null)
      setHasActiveGoogleIntegration(false)
      setGoogleSuccessMessage('Conta Google desconectada com sucesso.')
    } catch (err) {
      console.error('Erro ao desconectar Google:', err)
      let errorMsg = 'Não foi possível desconectar a conta Google. Tente novamente.'
      if (err instanceof FunctionsHttpError) {
        try {
          const body = await err.context.json()
          if (body && body.error) {
            errorMsg = body.error
          }
        } catch {
        }
      } else if (err && err.message) {
        errorMsg = err.message
      }
      setGoogleDisconnectError(errorMsg)
    } finally {
      setIsDisconnectingGoogle(false)
    }
  }



  const handleCloseEditModal = () => {
    closeEditPresentationModal()
    setRemotePresentationData(null)
  }

  const handleFixSchedule = async (presentationId) => {
    try {
      setIsFixingSchedule(true)
      const { data, error } = await supabase.functions.invoke('google-presentation-get-remote', {
        body: { presentationId }
      })
      if (error) throw error
      if (data && data.success && data.event) {
        setRemotePresentationData(data.event)
        openEditPresentationModal()
      } else {
        throw new Error(data?.error || 'Erro ao carregar evento remoto.')
      }
    } catch (err) {
      console.error('Erro ao buscar dados remotos do Google Agenda:', err)
      alert(err.message || 'Não foi possível carregar os dados atuais do Google Agenda.')
    } finally {
      setIsFixingSchedule(false)
    }
  }

  const onDeletePresentation = useCallback(async (presentationId, forceDeleteParticipants = false, editScope = null) => {
    try {
      setMeetingErrorMsg(null)
      await handleDeletePresentation(presentationId, forceDeleteParticipants, editScope)
    } catch (err) {
      setMeetingErrorMsg(err.message || 'Não foi possível excluir a apresentação comercial. Tente novamente.')
    }
  }, [handleDeletePresentation])

  const handleGenerateMeetLink = async (presentationId) => {
    setMeetingErrorMsg(null)
    setIsGeneratingMeet(true)
    try {
      const newMeetLink = await generateMeetLink(presentationId)
      if (newMeetLink) {
        updateSingleMeeting(presentationId, { meetLink: newMeetLink })
      }
    } catch (err) {
      console.error('Erro ao gerar link do Meet:', err)
      setMeetingErrorMsg(err.message || 'Não foi possível gerar a reunião. Tente novamente.')
    } finally {
      setIsGeneratingMeet(false)
    }
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
      
      const meetingsCount = meetings.filter(m => m.date === dateKey).length
        
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
      case 'agenda': {
        return (
          <DashboardView
            user={user}
            meetings={meetings}
            clients={clients}
            hasActiveGoogleIntegration={hasActiveGoogleIntegration}
            onNavigate={setActiveTab}
            openPresentationModal={openPresentationModal}
            setSelectedMeetingId={setSelectedMeetingId}
          />
        )
      }
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
          dayMeetings = meetings
            .filter((m) => m.date === selectedDateKey)
            .sort((a, b) => a.time.localeCompare(b.time))
        }

        return (
          <div className="view-container calendar-view-container">
            <div className="action-bar mobile-only">
              <button 
                className="btn btn-primary" 
                type="button"
                onClick={() => openPresentationModal()}
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="btn-icon">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
                Criar apresentação
              </button>
              <button className="btn btn-secondary" type="button">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="btn-icon">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 5.25h16.5m-16.5 4.5h16.5m-16.5 4.5h16.5m-16.5 4.5h16.5" />
                </svg>
                Resumo da semana
              </button>
            </div>
            
            <div className="calendar-area">

              {meetingsLoading ? (
                <div className="loading-state">
                  Carregando apresentações...
                </div>
              ) : meetingsError ? (
                <div className="error-state">
                  Não foi possível carregar as apresentações. Tente novamente mais tarde.
                </div>
              ) : (
                <>
                  <CalendarGrid
                    handlePrevMonth={handlePrevMonth}
                    handleNextMonth={handleNextMonth}
                    capitalizedMonthName={capitalizedMonthName}
                    year={year}
                    weekDays={weekDays}
                    days={days}
                    selectedDateKey={selectedDateKey}
                    setSelectedDateKey={setSelectedDateKey}
                    meetings={meetings}
                  />

                  <MeetingsPanel
                    selectedDateKey={selectedDateKey}
                    setSelectedDateKey={setSelectedDateKey}
                    selectedMeetingId={selectedMeetingId}
                    setSelectedMeetingId={setSelectedMeetingId}
                    setShowMeetLink={setShowMeetLink}
                    setMeetCopied={setMeetCopied}
                    resetMessageStates={resetMessageStates}
                    formattedSelectedDate={formattedSelectedDate}
                    dayMeetings={dayMeetings}
                    meetings={meetings}
                    openPresentationModal={openPresentationModal}
                  />
                </>
              )}
            </div>
          </div>
        )
      }
      case 'resumo': {
        return (
          <WeeklySummaryView
            meetings={meetings}
            onSelectMeeting={setSelectedMeetingId}
          />
        )
      }
      case 'clientes': {


        return (
          <ClientsView
            clients={clients}
            meetings={meetings}
            onAddClient={handleAddDirectClient}
            onUpdateClient={handleUpdateDirectClient}
            onDeleteClient={handleDeleteDirectClient}
            hasActiveGoogleIntegration={hasActiveGoogleIntegration}
          />
        )
      }
      case 'configuracoes': {
        return (
          <SettingsView
            user={user}
            theme={theme}
            setTheme={setTheme}
            hasActiveGoogleIntegration={hasActiveGoogleIntegration}
            googleAccountEmail={googleAccountEmail}
            handleConnectGoogle={handleConnectGoogle}
            isConnectingGoogle={isConnectingGoogle}
            isDisconnectingGoogle={isDisconnectingGoogle}
            handleDisconnectGoogle={handleDisconnectGoogle}
            googleConnectError={googleConnectError}
            googleDisconnectError={googleDisconnectError}
            calendarsLoading={calendarsLoading}
            calendarsError={calendarsError}
            fetchGoogleCalendars={fetchGoogleCalendars}
            googleCalendars={googleCalendars}
            selectedCalendar={selectedCalendar}
            setSelectedCalendar={setSelectedCalendar}
            setSavingCalendarError={setSavingCalendarError}
            setSavingCalendarSuccess={setSavingCalendarSuccess}
            activeCalendarId={activeCalendarId}
            handleSaveCalendar={handleSaveCalendar}
            isSavingCalendar={isSavingCalendar}
            savingCalendarError={savingCalendarError}
            savingCalendarSuccess={savingCalendarSuccess}
          />
        )
      }
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



  // Filter future meetings, sorted by date and time
  const futureMeetings = meetings
    .filter(isPresentationFuture)
    .sort((a, b) => {
      const dateDiff = a.date.localeCompare(b.date)
      if (dateDiff !== 0) return dateDiff
      return a.time.localeCompare(b.time)
    })

  if (window.location.pathname === '/privacy') {
    return <PrivacyView />
  }

  if (authLoading) {
    return (
      <div className="auth-loading-screen">
        <div className="loading-spinner"></div>
      </div>
    )
  }

  if (!user || authMode === 'update_password') {
    return (
      <AuthView
        authMode={authMode}
        setAuthMode={setAuthMode}
        name={name}
        setName={setName}
        email={email}
        setEmail={setEmail}
        password={password}
        setPassword={setPassword}
        whatsapp={whatsapp}
        setWhatsapp={setWhatsapp}
        newPassword={newPassword}
        setNewPassword={setNewPassword}
        confirmPassword={confirmPassword}
        setConfirmPassword={setConfirmPassword}
        loginError={loginError}
        setLoginError={setLoginError}
        loginSuccess={loginSuccess}
        setLoginSuccess={setLoginSuccess}
        loginLoading={loginLoading}
        handleLoginSubmit={handleLoginSubmit}
        handleSignUpSubmit={handleSignUpSubmit}
        handleForgotPasswordSubmit={handleForgotPasswordSubmit}
        handleUpdatePasswordSubmit={handleUpdatePasswordSubmit}
      />
    )
  }

  return (
    <div className="dashboard-layout">
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        setSelectedMeetingId={setSelectedMeetingId}
        setShowMeetLink={setShowMeetLink}
        setMeetCopied={setMeetCopied}
        resetMessageStates={resetMessageStates}
        handleLogout={handleLogout}
        user={user}
        collapsed={sidebarCollapsed}
        setCollapsed={setSidebarCollapsed}
      />

      {/* Main Content Area */}
      <main className={`main-content ${activeTab === 'calendario' ? 'calendar-tab-active' : ''}`}>
        <section className={`content-body ${['agenda', 'clientes'].includes(activeTab) ? 'dashboard-body' : ''} ${activeTab === 'configuracoes' ? 'settings-body-custom' : ''} ${activeTab === 'calendario' ? 'calendar-body-custom' : ''}`}>
          {renderContent()}
        </section>
      </main>

      {/* Meeting Details Modal */}
      <MeetingDetailsModal
        selectedMeeting={selectedMeeting}
        formattedMeetingDate={formattedMeetingDate}
        onClose={() => {
          setSelectedMeetingId(null)
          setShowMeetLink(false)
          setMeetCopied(false)
          resetMessageStates()
        }}
        showMeetLink={showMeetLink}
        setShowMeetLink={setShowMeetLink}
        meetCopied={meetCopied}
        setMeetCopied={setMeetCopied}
        onVerMensagem={() => {
          setMeetingErrorMsg(null)
          if (!selectedMeeting.meetLink) {
            setMeetingErrorMsg('Link ainda não disponível')
          } else {
            setShowMessageModal(true)
          }
        }}
        onEditPresentation={openEditPresentationModal}
        onDeletePresentation={onDeletePresentation}
        isDeletingPresentation={isDeletingPresentation}
        onAddParticipant={openAddParticipant}
        onEditParticipant={openEditParticipant}
        onCancelParticipant={(participantId) => handleCancelParticipant(selectedMeeting.id, participantId)}
        onReactivateParticipant={(participantId) => handleReactivateParticipant(selectedMeeting.id, participantId)}
        onRescheduleParticipant={openRescheduleParticipant}
        meetingErrorMsg={meetingErrorMsg}
        onFixSchedule={handleFixSchedule}
        isFixingSchedule={isFixingSchedule}
        onGenerateMeetLink={() => handleGenerateMeetLink(selectedMeeting.id)}
        isGeneratingMeet={isGeneratingMeet}
      />

      <InviteMessageModal
        isOpen={showMessageModal && !!selectedMeeting}
        onClose={() => {
          setShowMessageModal(false)
          setMessageCopied(false)
        }}
        selectedMeeting={selectedMeeting}
        customMessages={customMessages}
        setCustomMessages={setCustomMessages}
        messageCopied={messageCopied}
        setMessageCopied={setMessageCopied}
        getDefaultMessage={getDefaultMessage}
        formattedMeetingDate={formattedMeetingDate}
      />

      {/* Add / Edit Participant Sub-Modal */}
      <AddParticipantModal
        isOpen={showAddParticipantModal}
        selectedMeeting={selectedMeeting}
        editingParticipant={editingParticipant}
        onClose={closeAddParticipant}
        onAdd={async (participantData) => {
          if (editingParticipant) {
            await handleUpdateParticipant(selectedMeeting.id, editingParticipant.id, participantData)
            closeAddParticipant()
          } else {
            await handleAddParticipant(selectedMeeting.id, participantData)
            closeAddParticipant()
          }
        }}
        onFindClient={findClientByPhone}
      />

      {/* Reschedule Participant Sub-Modal */}
      <RescheduleParticipantModal
        isOpen={!!reschedulingParticipant}
        participant={reschedulingParticipant}
        futureMeetings={futureMeetings}
        onClose={closeRescheduleParticipant}
        onReschedule={async (targetMeetingId) => {
          try {
            await handleRescheduleParticipant(reschedulingParticipant.id, selectedMeeting.id, targetMeetingId)
            closeRescheduleParticipant()
          } catch {
            // Keep the modal open
          }
        }}
      />

      <AddPresentationModal
        isOpen={showAddPresentationModal}
        onClose={closePresentationModal}
        onCreate={handleCreatePresentation}
        initialDate={presentationModalInitialDate}
      />

      <EditPresentationModal
        isOpen={showEditPresentationModal}
        onClose={handleCloseEditModal}
        onSave={handleUpdatePresentation}
        presentation={remotePresentationData || selectedMeeting}
      />

      <MoveParticipantsModal
        isOpen={showMoveParticipantsModal}
        sourceMeeting={movingPresentation}
        futureMeetings={futureMeetings}
        onClose={() => {
          setShowMoveParticipantsModal(false)
          setMovingPresentation(null)
        }}
        onMove={handleMoveAndDeletePresentation}
        onDeleteAll={async () => {
          const confirmDelete = window.confirm(
            'Deseja realmente EXCLUIR permanentemente esta apresentação e todas as suas participações vinculadas? (Os clientes cadastrados não serão excluídos)'
          )
          if (!confirmDelete) return

          setShowMoveParticipantsModal(false)
          setMovingPresentation(null)
          await onDeletePresentation(movingPresentation.id, true)
        }}
        isProcessing={isMovingAndDeleteProcessing}
      />

      <DeletePresentationModal
        isOpen={showDeletePresentationModal}
        onClose={() => {
          setShowDeletePresentationModal(false)
          setDeleteTargetId(null)
          setDeleteTargetParticipants(false)
        }}
        onDelete={async (scope) => {
          setShowDeletePresentationModal(false)
          const targetId = deleteTargetId
          const targetParticipants = deleteTargetParticipants
          setDeleteTargetId(null)
          setDeleteTargetParticipants(false)
          await onDeletePresentation(targetId, targetParticipants, scope)
        }}
        isDeleting={isDeletingPresentation}
      />
      <PendingMeetingsModal
        isOpen={showPendingList}
        onClose={() => setShowPendingList(false)}
        meetings={meetings}
        setSelectedMeetingId={setSelectedMeetingId}
        setShowPendingList={setShowPendingList}
      />
    </div>
  )
}

export default App
