import { useState, useEffect } from 'react'
import { FunctionsHttpError } from '@supabase/supabase-js'
import './App.css'
import MeetingDetailsModal from './components/MeetingDetailsModal'
import AddParticipantModal from './components/AddParticipantModal'
import RescheduleParticipantModal from './components/RescheduleParticipantModal'
import AddPresentationModal from './components/AddPresentationModal'
import EditPresentationModal from './components/EditPresentationModal'
import MoveParticipantsModal from './components/MoveParticipantsModal'
import meetLogo from './assets/meet-logo.png'
import { supabase } from './supabaseClient'
import { createGooglePresentation, updateGooglePresentation, deleteGooglePresentation, moveParticipantsAndDeletePresentation } from './services/googlePresentationService'
import { listPresentations } from './services/presentationService'
import { findClientByPhone, createClient, updateClient } from './services/clientService'
import { findParticipation, createParticipation, updateParticipationObservation, updateParticipationStatus, updateParticipationPresentation } from './services/participationService'
import { isPresentationPast, isPresentationFuture } from './utils/dateUtils'

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



function App() {
  const [user, setUser] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('calendario')

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setAuthLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      setAuthLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (user) {
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
  const [presentationModalInitialDate, setPresentationModalInitialDate] = useState('')
  const [editingParticipant, setEditingParticipant] = useState(null)
  const [reschedulingParticipant, setReschedulingParticipant] = useState(null)

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
      fetchGoogleCalendars()
    }
  }, [activeTab, user])

  // Login form states & handlers
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loginError, setLoginError] = useState(null)
  const [loginLoading, setLoginLoading] = useState(false)

  const handleLoginSubmit = async (e) => {
    e.preventDefault()
    setLoginError(null)
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

  const handleLogout = async () => {
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
      const { data, error } = await supabase.functions.invoke('google-oauth-start')
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
  }

  const handleUpdatePresentation = async (presentationData) => {
    try {
      await updateGooglePresentation(presentationData)
      const refreshed = await listPresentations()
      setMeetings(refreshed)
    } catch (err) {
      console.error('Erro ao atualizar apresentação comercial:', err)
      throw err
    }
  }

  const handleDeletePresentation = async (presentationId, forceDeleteParticipants = false) => {
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
    } else {
      const confirmDelete = window.confirm('Deseja realmente excluir esta apresentação e removê-la do Google Agenda?')
      if (!confirmDelete) return
    }

    setIsDeletingPresentation(true)
    try {
      await deleteGooglePresentation(presentationId, deleteParticipants)

      const refreshed = await listPresentations()
      setMeetings(refreshed)

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
            <div className="action-bar">
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
              <button className="btn btn-secondary" type="button">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="btn-icon">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                </svg>
                Atualizar agenda
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
                            {(() => {
                              const dayMeetings = meetings.filter(m => m.date === day.dateKey)
                              const hasMeetings = dayMeetings.length > 0
                              const hasParticipants = dayMeetings.some(m => m.participantsList && m.participantsList.length > 0)
                              
                              if (!hasMeetings) return null
                              
                              return (
                                <>
                                  <span className="meetings-count-badge">
                                    {dayMeetings.length} {dayMeetings.length === 1 ? 'reunião' : 'reuniões'}
                                  </span>
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
                              {dayMeetings.map((meeting) => (
                                <div
                                  key={meeting.id}
                                  className={`meeting-item-card ${selectedMeetingId === meeting.id ? 'active' : ''}`}
                                  onClick={() => {
                                    setSelectedMeetingId(meeting.id)
                                    setShowMeetLink(false)
                                    setMeetCopied(false)
                                    resetMessageStates()
                                  }}
                                >
                                  <span className="meeting-time-badge">{meeting.time}{meeting.timeEnd ? ` - ${meeting.timeEnd}` : ''}</span>
                                  <h4 className="meeting-item-title">{meeting.title}</h4>
                                  <div className="meeting-participants-info">
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.109A11.386 11.386 0 0110.089 20M3 11.627a1.125 1.125 0 011.083-1.127h4.374c.56 0 1.04.388 1.125.941a11.322 11.322 0 004.122 6.556m-8.622-6.37a1.125 1.125 0 00-1.083 1.127V18.5c0 .54.406.991.94 1.036A11.478 11.478 0 0010.089 20m-7.089-8.373a11.42 11.42 0 007.089 8.373m0 0l.092.012a9.39 9.39 0 005.105-1.503M10.089 20a11.385 11.385 0 01-5.111-1.503m10.092-2.118a8.967 8.967 0 00-3.07-5.07M12.188 8.75a3 3 0 116 0 3 3 0 01-6 0zM1.5 9.75a3 3 0 116 0 3 3 0 01-6 0zM12.251 14.75a3.75 3.75 0 016.75 0V15h-6.75v-.25z" />
                                    </svg>
                                    <span>
                                      {meeting.participantsList.length} {meeting.participantsList.length === 1 ? 'participante' : 'participantes'}
                                    </span>
                                  </div>
                                </div>
                              ))}
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
      case 'configuracoes':
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
                {calendarsLoading ? (
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                    Carregando agendas do Google...
                  </p>
                ) : calendarsError ? (
                  <div>
                    <p style={{ color: 'var(--text-error)', fontSize: '0.875rem', marginBottom: '0.75rem' }}>
                      {calendarsError}
                    </p>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={fetchGoogleCalendars}
                    >
                      Tentar novamente
                    </button>
                  </div>
                ) : googleAccountEmail ? (
                  <div>
                    <p style={{ fontSize: '0.95rem', fontWeight: '500', marginBottom: '1rem', color: 'var(--text-primary)' }}>
                      Conectado como: <span style={{ color: 'var(--accent-color)' }}>{googleAccountEmail}</span>
                    </p>

                    {isResponsible && (
                      <div style={{ marginBottom: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <div style={{ display: 'flex', gap: '0.75rem' }}>
                          <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={handleConnectGoogle}
                            disabled={isConnectingGoogle || isDisconnectingGoogle}
                          >
                            {isConnectingGoogle ? 'Redirecionando...' : 'Reconectar Google'}
                          </button>

                          <button
                            type="button"
                            className="btn btn-secondary"
                            style={{ color: 'var(--text-error)', borderColor: 'rgba(239, 68, 68, 0.2)' }}
                            onClick={handleDisconnectGoogle}
                            disabled={isConnectingGoogle || isDisconnectingGoogle}
                          >
                            {isDisconnectingGoogle ? 'Desconectando...' : 'Desconectar Google'}
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
                    )}
                    
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
                              <span style={{ fontWeight: isSelected ? '600' : '400' }}>{cal.name}</span>
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
                        Agenda selecionada: <strong style={{ color: 'var(--text-primary)' }}>{googleCalendars.find(c => c.id === activeCalendarId)?.name || selectedCalendar?.name || ''}</strong>
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
                  </div>
                ) : (
                  <div>
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

  if (!user) {
    return (
      <div className="login-screen-wrapper">
        <div className="login-card">
          <div className="login-header">
            <img src={meetLogo} alt="Google Meet Logo" className="login-logo-img" />
            <h2 className="login-title">Acesso ao Agendamento</h2>
            <p className="login-subtitle">Entre com sua conta para gerenciar as apresentações</p>
          </div>
          <form className="login-form" onSubmit={handleLoginSubmit}>
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
            {loginError && <span className="login-error-msg">{loginError}</span>}
            <button
              className="btn btn-primary btn-login"
              type="submit"
              disabled={loginLoading}
            >
              {loginLoading ? 'Carregando...' : 'Entrar'}
            </button>
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
          <div className="brand-logo">
            <img src={meetLogo} alt="Google Meet Logo" className="brand-logo-img" />
          </div>
          <span className="brand-name">Agendamento</span>
        </div>

        <nav className="sidebar-menu">
          {navigationItems.map((item) => (
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
          
          <button
            type="button"
            className="menu-item logout-menu-item"
            onClick={handleLogout}
            style={{ marginTop: 'auto' }}
          >
            <span className="menu-icon">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
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
        presentation={selectedMeeting}
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
    </div>
  )
}

export default App
