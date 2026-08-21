import { useState, useEffect, useRef } from 'react'
import { FunctionsHttpError } from '@supabase/supabase-js'
import './App.css'
import Sidebar from './components/Sidebar'
import AuthView from './components/AuthView'
import CalendarGrid from './components/CalendarGrid'
import ClientsView from './components/ClientsView'
import WeeklySummaryView from './components/WeeklySummaryView'
import SettingsView from './components/SettingsView'
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
import { createGooglePresentation, updateGooglePresentation, deleteGooglePresentation, moveParticipantsAndDeletePresentation, generateMeetLink } from './services/googlePresentationService'
import { listPresentations } from './services/presentationService'
import { findClientByPhone, createClient, updateClient, listClients, deleteClientLogical } from './services/clientService'
import { findParticipation, createParticipation, updateParticipationObservation, updateParticipationPresentation, rescheduleParticipantApi, cancelParticipantApi, reactivateParticipantApi } from './services/participationService'
import { isPresentationPast, isPresentationFuture } from './utils/dateUtils'
import { scheduleParticipant } from './services/schedulingService'



function App() {
  const [user, setUser] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('calendario')
  const [authMode, setAuthMode] = useState('login')

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setAuthLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        setAuthMode('update_password')
      }
      setUser(session?.user ?? null)
      setAuthLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  const checkGoogleIntegration = async () => {
    if (!user) {
      setHasActiveGoogleIntegration(false)
      return
    }
    try {
      const { data } = await supabase
        .from('google_integracao')
        .select('id, google_email, calendar_id')
        .eq('user_id', user.id)
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
  }

  const loadClients = async () => {
    try {
      const data = await listClients()
      setClients(data)
    } catch (err) {
      console.error('Erro ao carregar clientes:', err)
    }
  }

  useEffect(() => {
    if (activeTab === 'clientes' && user) {
      loadClients()
    }
  }, [activeTab, user])

  useEffect(() => {
    if (user) {
      checkGoogleIntegration()
      setMeetingsLoading(true)
      setMeetingsError(null)
      listPresentations()
        .then(data => {
          setMeetings(data)
          setMeetingsLoading(false)
          setMeetingsError(null)
        })
        .catch(err => {
          console.error('Erro ao carregar apresentações:', err.message)
          setMeetingsLoading(false)
          setMeetingsError('Não foi possível carregar as apresentações. Tente novamente mais tarde.')
        })
    } else {
      setHasActiveGoogleIntegration(false)
      setMeetings([])
      setMeetingsLoading(false)
      setMeetingsError(null)
    }
  }, [user])

  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDateKey, setSelectedDateKey] = useState(null)
  
  // Reactive list of meetings
  const [meetings, setMeetings] = useState([])
  const [selectedMeetingId, setSelectedMeetingId] = useState(null)
  const [meetingsLoading, setMeetingsLoading] = useState(false)
  const [meetingsError, setMeetingsError] = useState(null)
  const [isConnectingGoogle, setIsConnectingGoogle] = useState(false)
  const [googleConnectError, setGoogleConnectError] = useState(null)
  const [googleSuccessMessage, setGoogleSuccessMessage] = useState(null)
  const [googleCalendars, setGoogleCalendars] = useState([])
  const [googleAccountEmail, setGoogleAccountEmail] = useState(null)
  const [hasActiveGoogleIntegration, setHasActiveGoogleIntegration] = useState(false)
  const [calendarsLoading, setCalendarsLoading] = useState(false)
  const [calendarsError, setCalendarsError] = useState(null)
  const [selectedCalendar, setSelectedCalendar] = useState(null)
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

  // Message states
  const [customMessages, setCustomMessages] = useState({})
  const [showMessageModal, setShowMessageModal] = useState(false)
  const [messageCopied, setMessageCopied] = useState(false)
  const [meetingErrorMsg, setMeetingErrorMsg] = useState(null)

  // Modal and form states
  const [showAddParticipantModal, setShowAddParticipantModal] = useState(false)
  const [showAddPresentationModal, setShowAddPresentationModal] = useState(false)
  const [showEditPresentationModal, setShowEditPresentationModal] = useState(false)
  const [isDeletingPresentation, setIsDeletingPresentation] = useState(false)
  const [showMoveParticipantsModal, setShowMoveParticipantsModal] = useState(false)
  const [movingPresentation, setMovingPresentation] = useState(null)
  const [isMovingAndDeleteProcessing, setIsMovingAndDeleteProcessing] = useState(false)
  const [showDeletePresentationModal, setShowDeletePresentationModal] = useState(false)
  const [deleteTargetId, setDeleteTargetId] = useState(null)
  const [deleteTargetParticipants, setDeleteTargetParticipants] = useState(false)
  const [remotePresentationData, setRemotePresentationData] = useState(null)
  const [isFixingSchedule, setIsFixingSchedule] = useState(false)
  const [isGeneratingMeet, setIsGeneratingMeet] = useState(false)
  const [presentationModalInitialDate, setPresentationModalInitialDate] = useState('')
  const [editingParticipant, setEditingParticipant] = useState(null)
  const [reschedulingParticipant, setReschedulingParticipant] = useState(null)
  const lastSyncedMonthRef = useRef(null)

  // Client list state
  const [clients, setClients] = useState([])

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
    if (activeTab === 'configuracoes' && user) {
      checkGoogleIntegration()
      fetchGoogleCalendars()
    }
  }, [activeTab, user])

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
          listPresentations().then(refreshedData => {
            setMeetings(refreshedData)
          }).catch(err => {
            console.error('Erro ao recarregar após sincronização automática:', err)
          })
        }).catch(err => {
          console.error('Erro na sincronização automática:', err)
        })
      }
    }
  }, [activeTab, user, currentDate])

  // Login form states & handlers
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loginError, setLoginError] = useState(null)
  const [loginSuccess, setLoginSuccess] = useState(null)
  const [loginLoading, setLoginLoading] = useState(false)
  const [name, setName] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const handleLoginSubmit = async (e) => {
    e.preventDefault()
    setLoginError(null)
    setLoginSuccess(null)
    setLoginLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setLoginError(error.message === 'Invalid login credentials' ? 'E-mail ou senha incorretos.' : error.message)
    } else {
      // Clear fields upon successful login
      setEmail('')
      setPassword('')
    }
    setLoginLoading(false)
  }

  const handleSignUpSubmit = async (e) => {
    e.preventDefault()
    setLoginError(null)
    setLoginSuccess(null)
    setLoginLoading(true)

    // WhatsApp validation and normalization (DDI 55 + DDD + 9 digits) - optional field
    let normalizedWhatsapp = null
    if (whatsapp) {
      const cleanWhatsapp = whatsapp.replace(/\D/g, '')
      if (cleanWhatsapp.length !== 11 || cleanWhatsapp[2] !== '9') {
        setLoginError('Informe um número de WhatsApp válido.')
        setLoginLoading(false)
        return
      }
      normalizedWhatsapp = `55${cleanWhatsapp}`
    }

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name: name,
          ...(normalizedWhatsapp ? { whatsapp_number: normalizedWhatsapp } : {})
        }
      }
    })
    if (error) {
      setLoginError(error.message)
    } else {
      setLoginSuccess('Cadastro realizado! Verifique seu e-mail para confirmar sua conta antes de entrar.')
      setAuthMode('login')
      setName('')
      setWhatsapp('')
      setEmail('')
      setPassword('')
    }
    setLoginLoading(false)
  }

  const handleForgotPasswordSubmit = async (e) => {
    e.preventDefault()
    setLoginError(null)
    setLoginSuccess(null)
    setLoginLoading(true)
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: import.meta.env.VITE_APP_URL,
    })
    if (error) {
      setLoginError(error.message)
    } else {
      setLoginSuccess('E-mail de recuperação enviado com sucesso! Verifique sua caixa de entrada.')
      setAuthMode('login')
      setEmail('')
    }
    setLoginLoading(false)
  }

  const handleUpdatePasswordSubmit = async (e) => {
    e.preventDefault()
    setLoginError(null)
    setLoginSuccess(null)

    if (newPassword !== confirmPassword) {
      setLoginError('As senhas não coincidem.')
      return
    }

    setLoginLoading(true)
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    if (error) {
      setLoginError(error.message)
    } else {
      setLoginSuccess('Senha alterada com sucesso!')
      setNewPassword('')
      setConfirmPassword('')
      setAuthMode('login')
      await supabase.auth.signOut()
    }
    setLoginLoading(false)
  }

  const handleLogout = async () => {
    lastSyncedMonthRef.current = null
    await supabase.auth.signOut()
  }

  const resetMessageStates = () => {
    setShowMessageModal(false)
    setMessageCopied(false)
    setMeetingErrorMsg(null)
    setShowAddParticipantModal(false)
    setEditingParticipant(null)
    setReschedulingParticipant(null)
    setClientSearchTerm('')
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

  const handleAddParticipant = async (meetingId, participantData) => {
    await scheduleParticipant(meetingId, participantData)
    const updatedData = await listPresentations()
    setMeetings(updatedData)
  }

  const handleUpdateParticipant = async (meetingId, participantId, updatedData) => {
    const currentMeeting = meetings.find(m => m.id === meetingId)
    if (isPresentationPast(currentMeeting)) {
      throw new Error('Não é possível alterar uma apresentação que já ocorreu.')
    }
    const oldParticipant = currentMeeting?.participantsList.find(p => p.id === participantId)
    if (!oldParticipant) return

    const clienteId = oldParticipant.clienteId

    try {
      if (updatedData.telefone !== oldParticipant.telefone) {
        const existingClient = await findClientByPhone(updatedData.telefone)
        if (existingClient && existingClient.id !== clienteId) {
          throw new Error('Este telefone já está vinculado a outro cliente.')
        }
      }

      await updateClient(clienteId, {
        nome: updatedData.nome,
        telefone: updatedData.telefone,
        agencia: updatedData.agencia
      })

      await updateParticipationObservation(participantId, updatedData.observacao)

      const refreshed = await listPresentations()
      setMeetings(refreshed)
    } catch (err) {
      const refreshed = await listPresentations()
      setMeetings(refreshed)
      throw err
    }
  }

  const handleCancelParticipant = async (meetingId, participantId) => {
    try {
      await cancelParticipantApi(participantId)
      const refreshed = await listPresentations()
      setMeetings(refreshed)
    } catch (err) {
      alert(err.message)
      const refreshed = await listPresentations()
      setMeetings(refreshed)
    }
  }

  const handleReactivateParticipant = async (meetingId, participantId) => {
    try {
      await reactivateParticipantApi(participantId)
      const refreshed = await listPresentations()
      setMeetings(refreshed)
    } catch (err) {
      alert(err.message)
      const refreshed = await listPresentations()
      setMeetings(refreshed)
    }
  }

  const handleRescheduleParticipant = async (participantId, fromMeetingId, toMeetingId) => {
    try {
      await rescheduleParticipantApi(participantId, fromMeetingId, toMeetingId)
      const refreshed = await listPresentations()
      setMeetings(refreshed)
    } catch (err) {
      alert(err.message)
      if (!err.isValidationError) {
        const refreshed = await listPresentations()
        setMeetings(refreshed)
      }
      throw err
    }
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

  const fetchGoogleCalendars = async () => {
    setCalendarsLoading(true)
    setCalendarsError(null)
    try {
      const { data, error } = await supabase.functions.invoke('google-calendar-list')
      if (error) throw error
      if (data) {
        setGoogleAccountEmail(prev => prev || data.googleEmail)
        setGoogleCalendars(data.calendars || [])
        if (data.selectedCalendarId) {
          setActiveCalendarId(data.selectedCalendarId)
          const activeCal = (data.calendars || []).find(c => c.id === data.selectedCalendarId)
          if (activeCal) {
            setSelectedCalendar(activeCal)
          }
        }
      }
    } catch (err) {
      console.error('Erro ao listar agendas:', err)
      setCalendarsError('Não foi possível obter a lista de agendas do Google.')
    } finally {
      setCalendarsLoading(false)
    }
  }

  const handleSaveCalendar = async () => {
    if (!selectedCalendar) return
    setIsSavingCalendar(true)
    setSavingCalendarError(null)
    setSavingCalendarSuccess(false)
    try {
      const { error } = await supabase.functions.invoke('google-calendar-select', {
        body: { calendarId: selectedCalendar.id }
      })
      if (error) throw error
      setSavingCalendarSuccess(true)
      setActiveCalendarId(selectedCalendar.id)
      
      // Refresh meetings list automatically for the new calendar
      setMeetings([])
      setMeetingsLoading(true)
      try {
        await checkGoogleIntegration()
        const presentations = await listPresentations()
        setMeetings(presentations)
      } catch (listErr) {
        console.error('Erro ao atualizar apresentações após trocar agenda:', listErr)
        setMeetings([])
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

  const handleCreatePresentation = async (presentationData) => {
    try {
      const createdPresentation = await createGooglePresentation(presentationData)
      if (createdPresentation.id) {
        const newMeeting = {
          id: createdPresentation.id,
          date: createdPresentation.date,
          time: createdPresentation.time,
          timeEnd: createdPresentation.timeEnd,
          title: createdPresentation.title,
          meetLink: createdPresentation.meetLink,
          participantsList: createdPresentation.participantsList || []
        }
        setMeetings(prev => [...prev, newMeeting])
      }

      if (createdPresentation.date) {
        const presentationDateObj = new Date(createdPresentation.date + 'T00:00:00')
        const y = presentationDateObj.getFullYear()
        const m = presentationDateObj.getMonth()
        const startDate = `${y}-${String(m + 1).padStart(2, '0')}-01`
        const next = new Date(y, m + 1, 1)
        const endDate = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}-01`

        supabase.functions.invoke('google-calendar-sync-apply', {
          body: { startDate, endDate }
        }).then(({ error }) => {
          if (error) throw error
          listPresentations().then(refreshedData => {
            setMeetings(refreshedData)
          }).catch(err => {
            console.error('Erro ao recarregar após sincronização automática pós-criação:', err)
          })
        }).catch(err => {
          console.error('Erro na sincronização automática pós-criação:', err)
        })
      }
    } catch (err) {
      console.error('Erro ao criar apresentação:', err)
      throw err
    }
  }

  const openPresentationModal = (initialDate = '') => {
    setPresentationModalInitialDate(initialDate)
    setShowAddPresentationModal(true)
  }

  const closePresentationModal = () => {
    setShowAddPresentationModal(false)
    setPresentationModalInitialDate('')
  }

  const openEditPresentationModal = () => {
    setShowEditPresentationModal(true)
  }

  const closeEditPresentationModal = () => {
    setShowEditPresentationModal(false)
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
        setShowEditPresentationModal(true)
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

  const handleUpdatePresentation = async (presentationData) => {
    try {
      await updateGooglePresentation(presentationData)

      if (presentationData.editScope === 'series') {
        const y = currentDate.getFullYear()
        const m = currentDate.getMonth()
        const startDate = `${y}-${String(m + 1).padStart(2, '0')}-01`
        const next = new Date(y, m + 1, 1)
        const endDate = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}-01`

        const { error } = await supabase.functions.invoke('google-calendar-sync-apply', {
          body: { startDate, endDate }
        })
        if (error) throw error

        const refreshedData = await listPresentations()
        setMeetings(refreshedData)
      } else {
        const refreshed = await listPresentations()
        setMeetings(refreshed)

        if (presentationData.date) {
          const presentationDateObj = new Date(presentationData.date + 'T00:00:00')
          const y = presentationDateObj.getFullYear()
          const m = presentationDateObj.getMonth()
          const startDate = `${y}-${String(m + 1).padStart(2, '0')}-01`
          const next = new Date(y, m + 1, 1)
          const endDate = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}-01`

          supabase.functions.invoke('google-calendar-sync-apply', {
            body: { startDate, endDate }
          }).then(({ error }) => {
            if (error) throw error
            listPresentations().then(refreshedData => {
              setMeetings(refreshedData)
            }).catch(err => {
              console.error('Erro ao recarregar após sincronização automática pós-edição:', err)
            })
          }).catch(err => {
            console.error('Erro na sincronização automática pós-edição:', err)
          })
        }
      }
    } catch (err) {
      console.error('Erro ao atualizar apresentação comercial:', err)
      throw err
    }
  }

  const handleDeletePresentation = async (presentationId, forceDeleteParticipants = false, editScope = null) => {
    setMeetingErrorMsg(null)

    const presentation = meetings.find(m => m.id === presentationId)
    if (!presentation) return

    const hasParticipants = presentation.participantsList && presentation.participantsList.length > 0
    let deleteParticipants = false

    if (hasParticipants && !forceDeleteParticipants) {
      setMovingPresentation(presentation)
      setShowMoveParticipantsModal(true)
      return
    }

    if (hasParticipants && forceDeleteParticipants) {
      deleteParticipants = true
    }

    if (presentation.googleRecurringEventId && !editScope) {
      setDeleteTargetId(presentationId)
      setDeleteTargetParticipants(deleteParticipants)
      setShowDeletePresentationModal(true)
      return
    }

    if (!presentation.googleRecurringEventId) {
      if (!deleteParticipants) {
        const confirmDelete = window.confirm('Deseja realmente excluir esta apresentação e removê-la do Google Agenda?')
        if (!confirmDelete) return
      }
    }

    setIsDeletingPresentation(true)
    try {
      await deleteGooglePresentation(presentationId, deleteParticipants, editScope || 'occurrence')

      const refreshed = await listPresentations()
      setMeetings(refreshed)

      if (presentation.date) {
        const presentationDateObj = new Date(presentation.date + 'T00:00:00')
        const y = presentationDateObj.getFullYear()
        const m = presentationDateObj.getMonth()
        const startDate = `${y}-${String(m + 1).padStart(2, '0')}-01`
        const next = new Date(y, m + 1, 1)
        const endDate = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}-01`

        supabase.functions.invoke('google-calendar-sync-apply', {
          body: { startDate, endDate }
        }).then(({ error }) => {
          if (error) throw error
          listPresentations().then(refreshedData => {
            setMeetings(refreshedData)
          }).catch(err => {
            console.error('Erro ao recarregar após sincronização automática pós-exclusão:', err)
          })
        }).catch(err => {
          console.error('Erro na sincronização automática pós-exclusão:', err)
        })
      }

      setSelectedMeetingId(null)
      setShowMeetLink(false)
      setMeetCopied(false)
      resetMessageStates()
    } catch (err) {
      console.error('Erro ao excluir apresentação comercial:', err)
      setMeetingErrorMsg(err.message || 'Não foi possível excluir a apresentação comercial. Tente novamente.')
    } finally {
      setIsDeletingPresentation(false)
    }
  }

  const handleMoveAndDeletePresentation = async (targetMeetingId) => {
    if (!movingPresentation) return
    setMeetingErrorMsg(null)
    setIsMovingAndDeleteProcessing(true)

    try {
      await moveParticipantsAndDeletePresentation(movingPresentation.id, targetMeetingId)

      const refreshed = await listPresentations()
      setMeetings(refreshed)

      if (movingPresentation.date) {
        const presentationDateObj = new Date(movingPresentation.date + 'T00:00:00')
        const y = presentationDateObj.getFullYear()
        const m = presentationDateObj.getMonth()
        const startDate = `${y}-${String(m + 1).padStart(2, '0')}-01`
        const next = new Date(y, m + 1, 1)
        const endDate = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}-01`

        supabase.functions.invoke('google-calendar-sync-apply', {
          body: { startDate, endDate }
        }).then(({ error }) => {
          if (error) throw error
          listPresentations().then(refreshedData => {
            setMeetings(refreshedData)
          }).catch(err => {
            console.error('Erro ao recarregar após sincronização automática pós-movimentação:', err)
          })
        }).catch(err => {
          console.error('Erro na sincronização automática pós-movimentação:', err)
        })
      }

      setShowMoveParticipantsModal(false)
      setMovingPresentation(null)
      setSelectedMeetingId(null)
      setShowMeetLink(false)
      setMeetCopied(false)
      resetMessageStates()
    } catch (err) {
      console.error('Erro ao mover participantes e excluir apresentação:', err)
      alert(err.message || 'Não foi possível mover os participantes e excluir a apresentação. Tente novamente.')
    } finally {
      setIsMovingAndDeleteProcessing(false)
    }
  }

  const handleGenerateMeetLink = async (presentationId) => {
    setMeetingErrorMsg(null)
    setIsGeneratingMeet(true)
    try {
      const newMeetLink = await generateMeetLink(presentationId)
      if (newMeetLink) {
        setMeetings(prev => prev.map(m => m.id === presentationId ? { ...m, meetLink: newMeetLink } : m))
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
        const handleAddDirectClient = async (clientData) => {
          const existing = await findClientByPhone(clientData.telefone)
          if (existing) {
            throw new Error('Já existe um cliente cadastrado com este telefone.')
          }
          await createClient(clientData)
          await loadClients()
        }

        const handleUpdateDirectClient = async (clientId, clientData) => {
          await updateClient(clientId, clientData)
          await loadClients()
        }

        const handleDeleteDirectClient = async (clientId) => {
          await deleteClientLogical(clientId)
          await loadClients()
        }

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
            googleSuccessMessage={googleSuccessMessage}
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

  const getDefaultMessage = (meeting, formattedDate) => {
    if (!meeting) return ''
    const timeWithoutSeconds = meeting.time ? meeting.time.slice(0, 5) : ''
    return `Olá! 😊 Passando para confirmar nossa reunião no dia ${formattedDate}, às ${timeWithoutSeconds}. Link do Meet: ${meeting.meetLink || ''}`
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
        openPresentationModal={openPresentationModal}
        meetings={meetings}
        setShowPendingList={setShowPendingList}
        handleLogout={handleLogout}
        user={user}
      />

      {/* Main Content Area */}
      <main className={`main-content ${activeTab === 'calendario' ? 'calendar-tab-active' : ''}`}>
        <section className="content-body">
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
        onDeletePresentation={handleDeletePresentation}
        isDeletingPresentation={isDeletingPresentation}
        onAddParticipant={() => setShowAddParticipantModal(true)}
        onEditParticipant={(participant) => {
          setEditingParticipant(participant)
          setShowAddParticipantModal(true)
        }}
        onCancelParticipant={(participantId) => handleCancelParticipant(selectedMeeting.id, participantId)}
        onReactivateParticipant={(participantId) => handleReactivateParticipant(selectedMeeting.id, participantId)}
        onRescheduleParticipant={(participant) => setReschedulingParticipant(participant)}
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
        onClose={() => {
          setShowAddParticipantModal(false)
          setEditingParticipant(null)
        }}
        onAdd={async (participantData) => {
          if (editingParticipant) {
            await handleUpdateParticipant(selectedMeeting.id, editingParticipant.id, participantData)
            setShowAddParticipantModal(false)
            setEditingParticipant(null)
          } else {
            await handleAddParticipant(selectedMeeting.id, participantData)
            setShowAddParticipantModal(false)
          }
        }}
        onFindClient={findClientByPhone}
      />

      {/* Reschedule Participant Sub-Modal */}
      <RescheduleParticipantModal
        isOpen={!!reschedulingParticipant}
        participant={reschedulingParticipant}
        futureMeetings={futureMeetings}
        onClose={() => setReschedulingParticipant(null)}
        onReschedule={async (targetMeetingId) => {
          try {
            await handleRescheduleParticipant(reschedulingParticipant.id, selectedMeeting.id, targetMeetingId)
            setReschedulingParticipant(null)
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
        onClose={closeEditPresentationModal}
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
          await handleDeletePresentation(movingPresentation.id, true)
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
          await handleDeletePresentation(targetId, targetParticipants, scope)
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
