import { useState, useEffect, useRef } from 'react'
import { FunctionsHttpError } from '@supabase/supabase-js'
import './App.css'
import MeetingDetailsModal from './components/MeetingDetailsModal'
import AddParticipantModal from './components/AddParticipantModal'
import RescheduleParticipantModal from './components/RescheduleParticipantModal'
import AddPresentationModal from './components/AddPresentationModal'
import EditPresentationModal from './components/EditPresentationModal'
import MoveParticipantsModal from './components/MoveParticipantsModal'
import DeletePresentationModal from './components/DeletePresentationModal'
import meetyLogo from './assets/meety-logo.png'
import iconCalendario from './assets/icon-calendario.png'
import iconClientes from './assets/icon-clientes.png'
import iconConfig from './assets/icon-config.png'
import iconCriarApresentacao from './assets/icon-criar-apresentacao.png'
import iconResumo from './assets/icon-resumo.png'
import iconSair from './assets/icon-sair.png'
import { supabase } from './supabaseClient'
import { createGooglePresentation, updateGooglePresentation, deleteGooglePresentation, moveParticipantsAndDeletePresentation, generateMeetLink } from './services/googlePresentationService'
import { listPresentations } from './services/presentationService'
import { findClientByPhone, createClient, updateClient } from './services/clientService'
import { findParticipation, createParticipation, updateParticipationObservation, updateParticipationStatus, updateParticipationPresentation } from './services/participationService'
import { isPresentationPast, isPresentationFuture } from './utils/dateUtils'

const navigationItems = [
  {
    id: 'calendario',
    label: 'Calendário',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
        <foreignObject width="24" height="24">
          <div style={{
            width: '100%',
            height: '100%',
            backgroundColor: 'currentColor',
            WebkitMaskImage: `url(${iconCalendario})`,
            maskImage: `url(${iconCalendario})`,
            WebkitMaskSize: 'contain',
            maskSize: 'contain',
            WebkitMaskRepeat: 'no-repeat',
            maskRepeat: 'no-repeat'
          }} />
        </foreignObject>
      </svg>
    )
  },
  {
    id: 'clientes',
    label: 'Clientes',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
        <foreignObject width="24" height="24">
          <div style={{
            width: '100%',
            height: '100%',
            backgroundColor: 'currentColor',
            WebkitMaskImage: `url(${iconClientes})`,
            maskImage: `url(${iconClientes})`,
            WebkitMaskSize: 'contain',
            maskSize: 'contain',
            WebkitMaskRepeat: 'no-repeat',
            maskRepeat: 'no-repeat'
          }} />
        </foreignObject>
      </svg>
    )
  },
  {
    id: 'configuracoes',
    label: 'Configurações',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
        <foreignObject width="24" height="24">
          <div style={{
            width: '100%',
            height: '100%',
            backgroundColor: 'currentColor',
            WebkitMaskImage: `url(${iconConfig})`,
            maskImage: `url(${iconConfig})`,
            WebkitMaskSize: 'contain',
            maskSize: 'contain',
            WebkitMaskRepeat: 'no-repeat',
            maskRepeat: 'no-repeat'
          }} />
        </foreignObject>
      </svg>
    )
  }
]



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
      const { data, error } = await supabase
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
      }
    } catch (e) {
      console.error('Erro ao checar integração:', e)
    }
  }

  useEffect(() => {
    if (user) {
      checkGoogleIntegration()
      setMeetingsLoading(true)
      setMeetingsError(null)
      listPresentations()
        .then(data => {
          console.log('DIAGNOSTIC - listPresentations resolved data:', data)
          console.log('DIAGNOSTIC - calling setMeetings with:', data)
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
  const [devSyncLoading, setDevSyncLoading] = useState(false)
  const [devSyncResult, setDevSyncResult] = useState(null)
  
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
  const [isResponsible, setIsResponsible] = useState(false)
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

  // Client search state
  const [clientSearchTerm, setClientSearchTerm] = useState('')

  // Theme state
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('theme') || 'dark'
  })

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('theme', theme)
  }, [theme])

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
        }).then(({ data, error }) => {
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
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name: name
        }
      }
    })
    if (error) {
      setLoginError(error.message)
    } else {
      setLoginSuccess('Cadastro realizado! Verifique seu e-mail para confirmar sua conta antes de entrar.')
      setAuthMode('login')
      setName('')
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
    const meeting = meetings.find(m => m.id === meetingId)
    if (isPresentationPast(meeting)) {
      throw new Error('Não é possível alterar uma apresentação que já ocorreu.')
    }

    let client = await findClientByPhone(participantData.telefone)
    
    if (!client) {
      client = await createClient({
        nome: participantData.nome,
        telefone: participantData.telefone,
        agencia: participantData.agencia
      })
    }
    
    const existingPart = await findParticipation(client.id, meetingId)
    if (existingPart) {
      if (existingPart.status === 'ativo') {
        throw new Error('Este cliente já está cadastrado nesta reunião.')
      } else {
        throw new Error('Este cliente já possui uma participação cancelada nesta reunião.')
      }
    }
    
    await createParticipation({
      clienteId: client.id,
      apresentacaoId: meetingId,
      observacao: participantData.observacao
    })
    
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
    const meeting = meetings.find(m => m.id === meetingId)
    if (isPresentationPast(meeting)) {
      alert('Não é possível alterar uma apresentação que já ocorreu.')
      return
    }
    try {
      await updateParticipationStatus(participantId, 'cancelado')
      const refreshed = await listPresentations()
      setMeetings(refreshed)
    } catch (err) {
      alert(err.message)
      const refreshed = await listPresentations()
      setMeetings(refreshed)
    }
  }

  const handleReactivateParticipant = async (meetingId, participantId) => {
    const meeting = meetings.find(m => m.id === meetingId)
    if (!meeting) return

    if (isPresentationPast(meeting)) {
      alert('Não é possível alterar uma apresentação que já ocorreu.')
      return
    }

    // Find the participant to get their telephone
    const participant = meeting.participantsList.find(p => p.id === participantId)
    if (!participant) return

    // Check if duplicate client is already active
    const isAlreadyActive = meeting.participantsList.some(
      p => p.telefone === participant.telefone && p.statusAtivo && p.id !== participantId
    )
    if (isAlreadyActive) {
      alert('Este cliente já está ativo nesta reunião.')
      return
    }

    try {
      await updateParticipationStatus(participantId, 'ativo')
      const refreshed = await listPresentations()
      setMeetings(refreshed)
    } catch (err) {
      alert(err.message)
      const refreshed = await listPresentations()
      setMeetings(refreshed)
    }
  }

  const handleRescheduleParticipant = async (participantId, fromMeetingId, toMeetingId) => {
    const fromMeeting = meetings.find(m => m.id === fromMeetingId)
    const toMeeting = meetings.find(m => m.id === toMeetingId)
    const participantToMove = fromMeeting?.participantsList.find(p => p.id === participantId)
    if (!participantToMove) return

    const clienteId = participantToMove.clienteId

    try {
      if (isPresentationPast(fromMeeting) || isPresentationPast(toMeeting)) {
        const err = new Error('Não é possível alterar uma apresentação que já ocorreu.')
        err.isValidationError = true
        throw err
      }

      const destinationPart = await findParticipation(clienteId, toMeetingId)
      if (destinationPart) {
        if (destinationPart.status === 'ativo') {
          const err = new Error('Este cliente já está ativo na reunião de destino.')
          err.isValidationError = true
          throw err
        } else {
          const err = new Error('Já existe uma participação cancelada no destino.')
          err.isValidationError = true
          throw err
        }
      }

      await updateParticipationPresentation(participantId, toMeetingId)
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
        setGoogleAccountEmail(data.googleEmail)
        setGoogleCalendars(data.calendars || [])
        setIsResponsible(!!data.isResponsible)
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
      const { data, error } = await supabase.functions.invoke('google-calendar-select', {
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
        } catch (_) {}
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
      setIsResponsible(false)
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
        } catch (_) {}
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
        }).then(({ data, error }) => {
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
          }).then(({ data, error }) => {
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
        }).then(({ data, error }) => {
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
        }).then(({ data, error }) => {
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

  const getUniqueClients = () => {
    const clientsMap = {}
    meetings.forEach(meeting => {
      meeting.participantsList.forEach(participant => {
        const cleanTel = participant.telefone.replace(/\D/g, '')
        if (!cleanTel) return

        if (!clientsMap[cleanTel]) {
          clientsMap[cleanTel] = {
            nome: participant.nome,
            telefone: participant.telefone,
            agencia: participant.agencia,
            totalAgendamentos: 0
          }
        }
        clientsMap[cleanTel].totalAgendamentos += 1
      })
    })

    return Object.values(clientsMap).sort((a, b) => a.nome.localeCompare(b.nome))
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
              {import.meta.env.DEV && (
                <div style={{ marginBottom: '16px' }}>
                  <button
                    type="button"
                    disabled={devSyncLoading}
                    onClick={() => {
                      const y = currentDate.getFullYear()
                      const m = currentDate.getMonth()
                      const startDate = `${y}-${String(m + 1).padStart(2, '0')}-01`
                      const next = new Date(y, m + 1, 1)
                      const endDate = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}-01`
                      setDevSyncLoading(true)
                      setDevSyncResult(null)
                      supabase.functions.invoke('google-calendar-sync-apply', {
                        body: { startDate, endDate }
                      }).then(({ data, error }) => {
                        setDevSyncResult(error
                          ? `Erro: ${error.message}`
                          : JSON.stringify(data, null, 2))
                      }).catch(err => {
                        setDevSyncResult(`Exceção: ${err.message}`)
                      }).finally(() => setDevSyncLoading(false))
                    }}
                    style={{
                      padding: '5px 14px',
                      fontSize: '12px',
                      fontWeight: '600',
                      borderRadius: '6px',
                      border: '1px solid #6366f1',
                      background: devSyncLoading ? '#e0e7ff' : '#6366f1',
                      color: devSyncLoading ? '#6366f1' : '#fff',
                      cursor: devSyncLoading ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {devSyncLoading ? 'Sincronizando...' : 'Testar sincronização'}
                  </button>
                  {devSyncResult && (
                    <pre style={{
                      marginTop: '8px',
                      padding: '10px 14px',
                      background: '#f8fafc',
                      border: '1px solid #cbd5e1',
                      borderRadius: '6px',
                      fontSize: '11px',
                      color: '#1e293b',
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-all',
                      maxHeight: '180px',
                      overflowY: 'auto',
                    }}>{devSyncResult}</pre>
                  )}
                </div>
              )}
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
                              if (day.dateKey === '2026-07-28') {
                                const currentDayMeetings = meetings.filter(m => m.date === day.dateKey)
                                const sortedDayMeetings = [...currentDayMeetings].sort((a, b) => a.time.localeCompare(b.time))
                                console.log('DIAGNOSTIC - dayMeetings:', currentDayMeetings)
                                console.log('DIAGNOSTIC - IDs:', currentDayMeetings.map(m => m.id))
                                console.log('DIAGNOSTIC - selectedDayMeetings (sorted):', sortedDayMeetings)
                              }
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

                  {selectedDateKey && (
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
                  )}
                </>
              )}
            </div>
          </div>
        )
      }
      case 'clientes': {
        const uniqueClients = getUniqueClients()
        const filteredClients = uniqueClients.filter(client => {
          const term = clientSearchTerm.toLowerCase()
          return (
            client.nome.toLowerCase().includes(term) ||
            client.telefone.replace(/\D/g, '').includes(term) ||
            client.agencia.toLowerCase().includes(term)
          )
        })

        return (
          <div className="view-container">
            <div className="view-header">
              <h1 className="view-title">Clientes</h1>
              <p className="view-description">Lista de clientes e contatos comerciais consolidados a partir dos agendamentos.</p>
            </div>

            <div className="client-search-wrapper">
              <div className="search-input-container">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="search-icon">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.637 10.637z" />
                </svg>
                <input
                  type="text"
                  className="client-search-input"
                  placeholder="Pesquisar por nome, telefone ou agência..."
                  value={clientSearchTerm}
                  onChange={(e) => setClientSearchTerm(e.target.value)}
                />
              </div>
            </div>

            <div className="clients-table-container">
              {filteredClients.length > 0 ? (
                <table className="clients-table">
                  <thead>
                    <tr>
                      <th>Nome</th>
                      <th>Telefone</th>
                      <th>Agência</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredClients.map((client) => (
                      <tr key={client.telefone}>
                        <td>
                          <span className="client-table-name">{client.nome}</span>
                        </td>
                        <td>
                          <span className="client-table-phone">{client.telefone}</span>
                        </td>
                        <td>
                          {client.agencia ? (
                            <span className="client-table-agency">{client.agencia}</span>
                          ) : (
                            <span className="client-table-agency-empty">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="no-clients-found">
                  <p>Nenhum cliente encontrado para os termos da busca.</p>
                </div>
              )}
            </div>
          </div>
        )
      }
      case 'configuracoes': {
        const getCalName = (cal) => {
          if (!cal) return ''
          const isEmail = cal.name && (cal.name.includes('@') || cal.name === googleAccountEmail)
          if (isEmail) {
            return cal.primary ? 'Agenda principal' : 'Agenda Google'
          }
          return cal.name
        }
        return (
          <div className="view-container">
            <div className="view-header">
              <h1 className="view-title">Configurações</h1>
              <p className="view-description">Gerencie as preferências da aplicação, incluindo o tema de exibição.</p>
            </div>
            
            <div className="settings-section-card">
              <h3 className="settings-section-title">Tema do Sistema</h3>
              <p className="settings-section-subtitle">Escolha entre a aparência Clara ou Escura para a interface da plataforma.</p>
              
              <div className="theme-toggle-options">
                <button
                  type="button"
                  className={`theme-option-btn ${theme === 'dark' ? 'active' : ''}`}
                  onClick={() => setTheme('dark')}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="theme-icon">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" />
                  </svg>
                  <span>Escuro (Padrão)</span>
                </button>
                
                <button
                  type="button"
                  className={`theme-option-btn ${theme === 'light' ? 'active' : ''}`}
                  onClick={() => setTheme('light')}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="theme-icon">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m0 13.5V21M4.22 4.22l1.42 1.42m12.72 12.72l1.42 1.42M3 12h2.25m13.5 0H21M6.34 17.66l-1.42 1.42m12.72-12.72l1.42-1.42A9 9 0 1111.25 3v11.25H3z" />
                  </svg>
                  <span>Claro</span>
                </button>
              </div>
            </div>

            <div className="settings-section-card">
              <h3 className="settings-section-title">Integração Google Agenda</h3>
              <p className="settings-section-subtitle">Vincule sua conta Google para sincronizar e gerenciar as apresentações comerciais diretamente na sua agenda.</p>

              <div style={{ marginTop: '1.5rem' }}>
                {hasActiveGoogleIntegration ? (
                  <div>
                    <p style={{ fontSize: '0.95rem', fontWeight: '500', marginBottom: '1rem', color: 'var(--text-primary)' }}>
                      Conectado como: <span style={{ color: 'var(--accent-color)' }}>{googleAccountEmail || 'Carregando...'}</span>
                    </p>

                    <div style={{ marginBottom: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      <div style={{ display: 'flex', gap: '0.75rem' }}>
                        <button
                          type="button"
                          className="btn btn-secondary"
                          onClick={handleConnectGoogle}
                          disabled={isConnectingGoogle || isDisconnectingGoogle}
                        >
                          {isConnectingGoogle ? 'Redirecionando...' : 'Trocar conta Google'}
                        </button>

                        <button
                          type="button"
                          className="btn btn-secondary"
                          style={{ color: 'var(--text-error)', borderColor: 'rgba(239, 68, 68, 0.2)' }}
                          onClick={handleDisconnectGoogle}
                          disabled={isConnectingGoogle || isDisconnectingGoogle}
                        >
                          {isDisconnectingGoogle ? 'Desconectando...' : 'Desconectar'}
                        </button>
                      </div>
                      {googleConnectError && (
                        <p style={{ color: 'var(--text-error)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
                          {googleConnectError}
                        </p>
                      )}
                      {googleDisconnectError && (
                        <p style={{ color: 'var(--text-error)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
                          {googleDisconnectError}
                        </p>
                      )}
                    </div>

                    {calendarsLoading ? (
                      <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                        Carregando agendas do Google...
                      </p>
                    ) : calendarsError ? (
                      <div style={{ marginBottom: '1.5rem' }}>
                        <p style={{ color: 'var(--text-error)', fontSize: '0.875rem', marginBottom: '0.75rem' }}>
                          {calendarsError}
                        </p>
                        <button
                          type="button"
                          className="btn btn-secondary"
                          onClick={fetchGoogleCalendars}
                        >
                          Tentar carregar agendas novamente
                        </button>
                      </div>
                    ) : (
                      <>
                        <h4 style={{ fontSize: '0.9rem', fontWeight: '600', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>
                          Suas Agendas Google:
                        </h4>
                        
                        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                          {googleCalendars.map((cal) => {
                            const isSelectable = cal.accessRole === 'owner' || cal.accessRole === 'writer'
                            const isSelected = selectedCalendar?.id === cal.id
                            const isActive = activeCalendarId === cal.id
                            
                            return (
                              <li
                                key={cal.id}
                                onClick={() => {
                                  if (isSelectable) {
                                    setSelectedCalendar(cal)
                                    setSavingCalendarError(null)
                                    setSavingCalendarSuccess(false)
                                  }
                                }}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  padding: '0.75rem 1rem',
                                  background: 'var(--input-bg)',
                                  border: isSelected ? '2px solid var(--accent-color)' : '1px solid var(--border-color)',
                                  borderRadius: '8px',
                                  fontSize: '0.9rem',
                                  cursor: isSelectable ? 'pointer' : 'not-allowed',
                                  opacity: isSelectable ? 1 : 0.6,
                                  transition: 'all 0.2s ease'
                                }}
                              >
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                                  <span style={{ fontWeight: isSelected ? '600' : '400' }}>{getCalName(cal)}</span>
                                  {!isSelectable && (
                                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                      Apenas leitura ({cal.accessRole})
                                    </span>
                                  )}
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                  {cal.primary && (
                                    <span style={{ fontSize: '0.75rem', background: 'var(--accent-glow)', color: 'var(--text-accent)', padding: '0.2rem 0.5rem', borderRadius: '4px', fontWeight: '500' }}>
                                      Principal
                                    </span>
                                  )}
                                  {isActive && (
                                    <span style={{ fontSize: '0.75rem', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.2)', padding: '0.2rem 0.5rem', borderRadius: '4px', fontWeight: '600' }}>
                                      Em uso
                                    </span>
                                  )}
                                </div>
                              </li>
                            )
                          })}
                        </ul>

                        {activeCalendarId && (
                          <p style={{ fontSize: '0.875rem', color: '#10b981', marginTop: '1rem', fontWeight: '500' }}>
                            Agenda selecionada: <strong style={{ color: 'var(--text-primary)' }}>{getCalName(googleCalendars.find(c => c.id === activeCalendarId) || selectedCalendar)}</strong>
                          </p>
                        )}

                        {selectedCalendar && selectedCalendar.id !== activeCalendarId && (
                          <div style={{ marginTop: '1.5rem' }}>
                            <button
                              type="button"
                              className="btn btn-primary"
                              onClick={handleSaveCalendar}
                              disabled={isSavingCalendar}
                            >
                              {isSavingCalendar ? 'Salvando...' : 'Usar esta agenda'}
                            </button>
                            
                            {savingCalendarError && (
                              <p style={{ color: 'var(--text-error)', fontSize: '0.875rem', marginTop: '0.5rem' }}>
                                {savingCalendarError}
                              </p>
                            )}
                            {savingCalendarSuccess && (
                              <p style={{ color: '#10b981', fontSize: '0.875rem', marginTop: '0.5rem' }}>
                                Agenda salva com sucesso!
                              </p>
                            )}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                ) : (
                  <div>
                    <p style={{ fontSize: '0.95rem', fontWeight: '500', marginBottom: '1rem', color: 'var(--text-primary)' }}>
                      Status: <span style={{ color: 'var(--text-muted)' }}>Desconectado</span>
                    </p>
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={handleConnectGoogle}
                      disabled={isConnectingGoogle}
                    >
                      {isConnectingGoogle ? 'Conectando...' : 'Conectar Google'}
                    </button>
                    {googleConnectError && (
                      <p style={{ color: 'var(--text-error)', fontSize: '0.875rem', marginTop: '0.5rem' }}>
                        {googleConnectError}
                      </p>
                    )}
                    {googleSuccessMessage && (
                      <p className="success-message" style={{ color: '#10b981', fontSize: '0.875rem', marginTop: '0.5rem' }}>
                        {googleSuccessMessage}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
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
    return `Olá, confirmo nossa apresentação "${meeting.title}" no dia ${formattedDate} às ${meeting.time}. Link do Meet: ${meeting.meetLink}`
  }

  // Filter future meetings, sorted by date and time
  const futureMeetings = meetings
    .filter(isPresentationFuture)
    .sort((a, b) => {
      const dateDiff = a.date.localeCompare(b.date)
      if (dateDiff !== 0) return dateDiff
      return a.time.localeCompare(b.time)
    })

  if (authLoading) {
    return (
      <div className="auth-loading-screen">
        <div className="loading-spinner"></div>
      </div>
    )
  }

  if (!user || authMode === 'update_password') {
    const getFormTitle = () => {
      switch (authMode) {
        case 'signup': return 'Criar Conta'
        case 'forgot_password': return 'Recuperar Senha'
        case 'update_password': return 'Criar Nova Senha'
        default: return 'Acesso ao Agendamento'
      }
    }

    const getFormSubtitle = () => {
      switch (authMode) {
        case 'signup': return 'Cadastre-se para gerenciar as apresentações'
        case 'forgot_password': return 'Digite seu e-mail para receber as instruções'
        case 'update_password': return 'Digite e confirme sua nova senha'
        default: return 'Entre na sua conta para organizar e gerenciar suas apresentações.'
      }
    }

    const getSubmitHandler = () => {
      switch (authMode) {
        case 'signup': return handleSignUpSubmit
        case 'forgot_password': return handleForgotPasswordSubmit
        case 'update_password': return handleUpdatePasswordSubmit
        default: return handleLoginSubmit
      }
    }

    const getSubmitLabel = () => {
      if (loginLoading) return 'Carregando...'
      switch (authMode) {
        case 'signup': return 'Cadastrar'
        case 'forgot_password': return 'Enviar E-mail'
        case 'update_password': return 'Alterar Senha'
        default: return 'Entrar'
      }
    }

    return (
      <div className="login-screen-wrapper">
        <div className="login-card">
          <div className="login-header">
            <img src={meetyLogo} alt="Meety Logo" className="login-logo-img" />
            <h2 className="login-title">{getFormTitle()}</h2>
            <p className="login-subtitle">{getFormSubtitle()}</p>
          </div>
          <form className="login-form" onSubmit={getSubmitHandler()}>
            {authMode === 'signup' && (
              <div className="form-group">
                <label className="form-label">Nome</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Seu nome"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  disabled={loginLoading}
                />
              </div>
            )}
            
            {authMode !== 'update_password' && (
              <div className="form-group">
                <label className="form-label">E-mail</label>
                <input
                  type="email"
                  className="form-input"
                  placeholder="seu-email@dominio.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loginLoading}
                />
              </div>
            )}

            {authMode !== 'forgot_password' && authMode !== 'update_password' && (
              <div className="form-group">
                <label className="form-label">Senha</label>
                <input
                  type="password"
                  className="form-input"
                  placeholder="Sua senha"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loginLoading}
                />
              </div>
            )}

            {authMode === 'update_password' && (
              <>
                <div className="form-group">
                  <label className="form-label">Nova Senha</label>
                  <input
                    type="password"
                    className="form-input"
                    placeholder="Sua nova senha"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    disabled={loginLoading}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Confirmar Senha</label>
                  <input
                    type="password"
                    className="form-input"
                    placeholder="Confirme a nova senha"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    disabled={loginLoading}
                  />
                </div>
              </>
            )}

            {loginError && <span className="login-error-msg">{loginError}</span>}
            {loginSuccess && <span className="login-success-msg">{loginSuccess}</span>}
            
            <button
              className="btn btn-primary btn-login"
              type="submit"
              disabled={loginLoading}
            >
              {getSubmitLabel()}
            </button>

            {authMode === 'login' && (
              <>
                <p className="login-switch-text">
                  Não tem uma conta?{' '}
                  <button
                    type="button"
                    className="btn-link"
                    onClick={() => {
                      setAuthMode('signup')
                      setLoginError(null)
                      setLoginSuccess(null)
                    }}
                  >
                    Criar conta
                  </button>
                </p>
                <p className="login-switch-text" style={{ marginTop: '0.5rem' }}>
                  <button
                    type="button"
                    className="btn-link"
                    onClick={() => {
                      setAuthMode('forgot_password')
                      setLoginError(null)
                      setLoginSuccess(null)
                    }}
                  >
                    Esqueci minha senha
                  </button>
                </p>
              </>
            )}

            {authMode === 'signup' && (
              <p className="login-switch-text">
                Já tem uma conta?{' '}
                <button
                  type="button"
                  className="btn-link"
                  onClick={() => {
                    setAuthMode('login')
                    setLoginError(null)
                    setLoginSuccess(null)
                  }}
                >
                  Entrar
                </button>
              </p>
            )}

            {authMode === 'forgot_password' && (
              <p className="login-switch-text">
                <button
                  type="button"
                  className="btn-link"
                  onClick={() => {
                    setAuthMode('login')
                    setLoginError(null)
                    setLoginSuccess(null)
                  }}
                >
                  Voltar para Entrar
                </button>
              </p>
            )}
          </form>
        </div>
      </div>
    )
  }

  return (
    <div className="dashboard-layout">
      {/* Sidebar Navigation */}
      <aside className="sidebar">
        <div className="sidebar-brand">
          <img src={meetyLogo} alt="Meety Logo" className="sidebar-logo" />
        </div>

        <nav className="sidebar-menu">
          {/* Calendário */}
          {navigationItems.slice(0, 1).map((item) => (
            <button
              key={item.id}
              type="button"
              className={`menu-item ${activeTab === item.id ? 'active' : ''}`}
              onClick={() => {
                setActiveTab(item.id)
                setSelectedMeetingId(null)
                setShowMeetLink(false)
                setMeetCopied(false)
                resetMessageStates()
              }}
            >
              <span className="menu-icon">{item.icon}</span>
              <span className="menu-label">{item.label}</span>
            </button>
          ))}

          {/* Botões de Ação Exclusivos do Desktop no Meio do Menu */}
          <div className="desktop-only" style={{ flexDirection: 'column', gap: '0.5rem' }}>
            <button
              type="button"
              className="menu-item"
              onClick={() => openPresentationModal()}
            >
              <span className="menu-icon">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                  <foreignObject width="24" height="24">
                    <div style={{
                      width: '100%',
                      height: '100%',
                      backgroundColor: 'currentColor',
                      WebkitMaskImage: `url(${iconCriarApresentacao})`,
                      maskImage: `url(${iconCriarApresentacao})`,
                      WebkitMaskSize: 'contain',
                      maskSize: 'contain',
                      WebkitMaskRepeat: 'no-repeat',
                      maskRepeat: 'no-repeat'
                    }} />
                  </foreignObject>
                </svg>
              </span>
              <span className="menu-label">Criar apresentação</span>
            </button>
            <button
              type="button"
              className="menu-item"
            >
              <span className="menu-icon">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                  <foreignObject width="24" height="24">
                    <div style={{
                      width: '100%',
                      height: '100%',
                      backgroundColor: 'currentColor',
                      WebkitMaskImage: `url(${iconResumo})`,
                      maskImage: `url(${iconResumo})`,
                      WebkitMaskSize: 'contain',
                      maskSize: 'contain',
                      WebkitMaskRepeat: 'no-repeat',
                      maskRepeat: 'no-repeat'
                    }} />
                  </foreignObject>
                </svg>
              </span>
              <span className="menu-label">Resumo da semana</span>
            </button>
          </div>

          {/* Clientes e Configurações */}
          {navigationItems.slice(1).map((item) => (
            <button
              key={item.id}
              type="button"
              className={`menu-item ${activeTab === item.id ? 'active' : ''}`}
              onClick={() => {
                setActiveTab(item.id)
                setSelectedMeetingId(null)
                setShowMeetLink(false)
                setMeetCopied(false)
                resetMessageStates()
              }}
            >
              <span className="menu-icon">{item.icon}</span>
              <span className="menu-label">{item.label}</span>
            </button>
          ))}

          {(() => {
            const pendingCount = meetings.filter(m => m.syncStatus === 'pending').length
            if (pendingCount === 0) return null
            return (
              <button
                type="button"
                className="menu-item pending-menu-item"
                onClick={() => setShowPendingList(true)}
              >
                <span className="menu-icon">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                  </svg>
                </span>
                <span className="menu-label">
                  {pendingCount === 1 ? '1 ação necessária' : `${pendingCount} ações necessárias`}
                </span>
              </button>
            )
          })()}
          
          <button
            type="button"
            className="menu-item logout-menu-item"
            onClick={handleLogout}
            style={{ marginTop: 'auto' }}
          >
            <span className="menu-icon">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                <foreignObject width="24" height="24">
                  <div style={{
                    width: '100%',
                    height: '100%',
                    backgroundColor: 'currentColor',
                    WebkitMaskImage: `url(${iconSair})`,
                    maskImage: `url(${iconSair})`,
                    WebkitMaskSize: 'contain',
                    maskSize: 'contain',
                    WebkitMaskRepeat: 'no-repeat',
                    maskRepeat: 'no-repeat'
                  }} />
                </foreignObject>
              </svg>
            </span>
            <span className="menu-label">Sair</span>
          </button>
        </nav>
      </aside>

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
          } catch (err) {
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
      {showPendingList && (
        <div className="modal-overlay" onClick={() => setShowPendingList(false)}>
          <div className="modal-card pending-list-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Reuniões com pendências</h3>
              <button
                className="btn-close"
                onClick={() => setShowPendingList(false)}
                type="button"
                aria-label="Fechar"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
              {meetings.filter(m => m.syncStatus === 'pending').length === 0 ? (
                <p>Nenhuma pendência encontrada.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {meetings.filter(m => m.syncStatus === 'pending').map((meeting) => {
                    const [y, mon, d] = meeting.date.split('-').map(Number)
                    const formattedDate = new Date(y, mon - 1, d).toLocaleDateString('pt-BR', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric'
                    })
                    return (
                      <div key={meeting.id} className="pending-item-card-detail" style={{
                        padding: '1rem',
                        border: '1px solid rgba(234, 179, 8, 0.3)',
                        borderRadius: '8px',
                        backgroundColor: 'rgba(234, 179, 8, 0.02)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.5rem'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>{meeting.title}</h4>
                          <span style={{ fontSize: '0.75rem', backgroundColor: 'rgba(234, 179, 8, 0.1)', color: '#eab308', padding: '0.2rem 0.5rem', borderRadius: '4px', fontWeight: 600 }}>
                            {formattedDate} às {meeting.time}
                          </span>
                        </div>
                        <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                          <strong>Erro:</strong> {meeting.syncError}
                        </p>
                        <button
                          type="button"
                          className="btn btn-secondary"
                          style={{ alignSelf: 'flex-end', marginTop: '0.25rem' }}
                          onClick={() => {
                            setSelectedMeetingId(meeting.id)
                            // Opcionalmente fechamos para focar no modal principal de detalhes
                            setShowPendingList(false)
                          }}
                        >
                          Ver reunião
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
