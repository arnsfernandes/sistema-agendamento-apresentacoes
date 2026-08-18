import { useState, useEffect } from 'react'
import { supabase } from '../services/supabaseClient'

export default function GoogleSettings({
  user,
  theme,
  setTheme,
  hasActiveGoogleIntegration,
  googleAccountEmail,
  handleConnectGoogle,
  isConnectingGoogle,
  isDisconnectingGoogle,
  handleDisconnectGoogle,
  googleConnectError,
  googleDisconnectError,
  calendarsLoading,
  calendarsError,
  fetchGoogleCalendars,
  googleCalendars,
  selectedCalendar,
  setSelectedCalendar,
  setSavingCalendarError,
  setSavingCalendarSuccess,
  activeCalendarId,
  handleSaveCalendar,
  isSavingCalendar,
  savingCalendarError,
  savingCalendarSuccess,
  googleSuccessMessage
}) {
  const [activeSubTab, setActiveSubTab] = useState('conta')
  const [isEditing, setIsEditing] = useState(false)

  const defaultReminderTemplate = "Olá! Este é um lembrete da sua reunião agendada para o dia {data}, às {hora}.\n\nParticipantes confirmados:\n{participantes}\n\nPara acessar a reunião:\n{meet}"
  const [reminderMessage, setReminderMessage] = useState(user?.user_metadata?.custom_reminder_message || defaultReminderTemplate)
  const [reminderWithoutParticipants, setReminderWithoutParticipants] = useState(!!user?.user_metadata?.reminder_without_participants)
  const [isSavingMessage, setIsSavingMessage] = useState(false)
  const [messageError, setMessageError] = useState(null)
  const [messageSuccess, setMessageSuccess] = useState(null)

  const handleRestoreDefault = () => {
    setReminderMessage(defaultReminderTemplate)
  }

  const handleSaveMessage = async () => {
    setIsSavingMessage(true)
    setMessageError(null)
    setMessageSuccess(null)
    try {
      const { error } = await supabase.auth.updateUser({
        data: {
          ...user?.user_metadata,
          custom_reminder_message: reminderMessage,
          reminder_without_participants: reminderWithoutParticipants
        }
      })
      if (error) throw error
      setMessageSuccess("Configurações de mensagem salvas com sucesso!")
    } catch (err) {
      console.error('Erro ao salvar configurações de mensagem:', err)
      setMessageError(err.message || 'Erro ao salvar as configurações.')
    } finally {
      setIsSavingMessage(false)
    }
  }

  const getPreviewMessage = () => {
    if (!reminderMessage) return ""
    return reminderMessage
      .replace(/{data}/g, "20/08/2026")
      .replace(/{hora}/g, "14:00")
      .replace(/{participantes}/g, "João Silva — (11) 99999-9999\nMaria Souza — (11) 98888-8888")
      .replace(/{meet}/g, "https://meet.google.com/abc-defg-hij")
  }

  const getPreviewWithoutParticipants = () => {
    if (!reminderMessage) return ""
    let msg = reminderMessage
      .replace(/Participantes confirmados:\s*\{participantes\}\s*/gi, "")
      .replace(/{data}/g, "20/08/2026")
      .replace(/{hora}/g, "14:00")
      .replace(/{meet}/g, "https://meet.google.com/abc-defg-hij")
    
    return msg.replace(/\n{3,}/g, "\n\n").trim()
  }

  useEffect(() => {
    if (user) {
      setReminderMessage(user?.user_metadata?.custom_reminder_message || defaultReminderTemplate)
      setReminderWithoutParticipants(!!user?.user_metadata?.reminder_without_participants)
    }
  }, [user])

  const [whatsappStatus, setWhatsappStatus] = useState(null)
  const [whatsappLoading, setWhatsappLoading] = useState(false)
  const [whatsappError, setWhatsappError] = useState(null)

  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [logoutError, setLogoutError] = useState(null)
  const [isPairing, setIsPairing] = useState(false)

  const [isDisconnecting, setIsDisconnecting] = useState(false)
  const [disconnectError, setDisconnectError] = useState(null)
  const [disconnectSuccess, setDisconnectSuccess] = useState(null)

  const [qrCodeString, setQrCodeString] = useState(null)
  const [qrLoading, setQrLoading] = useState(false)
  const [qrError, setQrError] = useState(null)

  const handleWhatsappDisconnect = async () => {
    const confirmDisconnect = window.confirm("Tem certeza que deseja desconectar completamente o WhatsApp? O serviço de envio de mensagens ficará offline até que um novo pareamento seja iniciado.");
    if (!confirmDisconnect) return

    setIsDisconnecting(true)
    setDisconnectError(null)
    setDisconnectSuccess(null)
    try {
      const { error } = await supabase.functions.invoke('whatsapp-admin', {
        body: { action: 'disconnect' }
      })
      if (error) throw error

      setWhatsappStatus({ connected: false, number: null, name: null })
      setIsPairing(false)
      setQrCodeString(null)
      setDisconnectSuccess("Desconectado com sucesso.")
    } catch (err) {
      console.error('Erro ao desconectar WhatsApp:', err)
      setDisconnectError(err.message || 'Erro ao realizar a desconexão.')
    } finally {
      setIsDisconnecting(false)
    }
  }

  const fetchWhatsappStatus = async () => {
    setWhatsappLoading(true)
    setWhatsappError(null)
    try {
      const { data, error } = await supabase.functions.invoke('whatsapp-admin', {
        body: { action: 'status' }
      })
      if (error) throw error
      setWhatsappStatus(data)
      if (data && data.connected) {
        setIsPairing(false)
        setQrCodeString(null)
      }
    } catch (err) {
      console.error('Erro ao consultar status do WhatsApp:', err)
      setWhatsappError(err.message || 'Erro ao carregar o status.')
    } finally {
      setWhatsappLoading(false)
    }
  }

  const fetchQrCode = async () => {
    setQrError(null)
    try {
      const { data, error } = await supabase.functions.invoke('whatsapp-admin', {
        body: { action: 'qr' }
      })
      if (error) throw error
      if (data && data.available && data.qr) {
        setQrCodeString(data.qr)
        return true
      }
      return false
    } catch (err) {
      console.error('Erro ao buscar QR Code:', err)
      setQrError(err.message || 'Erro ao carregar o QR Code.')
      return false
    }
  }

  const handleWhatsappLogout = async () => {
    const confirmLogout = window.confirm("Tem certeza que deseja trocar o número? O WhatsApp atual será desconectado e você precisará escanear um novo QR Code.");
    if (!confirmLogout) return

    setIsLoggingOut(true)
    setLogoutError(null)
    setQrCodeString(null)
    try {
      const { error } = await supabase.functions.invoke('whatsapp-admin', {
        body: { action: 'logout' }
      })
      if (error) throw error
      
      setWhatsappStatus({ connected: false, number: null, name: null })
      setIsPairing(true)
    } catch (err) {
      console.error('Erro ao desconectar WhatsApp:', err)
      setLogoutError(err.message || 'Erro ao realizar o logout.')
    } finally {
      setIsLoggingOut(false)
    }
  }

  const handleStartPairing = async () => {
    setIsLoggingOut(true)
    setLogoutError(null)
    setQrCodeString(null)
    try {
      const { error } = await supabase.functions.invoke('whatsapp-admin', {
        body: { action: 'logout' }
      })
      if (error) throw error
      
      setWhatsappStatus({ connected: false, number: null, name: null })
      setIsPairing(true)
    } catch (err) {
      console.error('Erro ao iniciar conexão do WhatsApp:', err)
      setLogoutError(err.message || 'Erro ao iniciar a conexão.')
    } finally {
      setIsLoggingOut(false)
    }
  }

  useEffect(() => {
    if (activeSubTab === 'whatsapp') {
      fetchWhatsappStatus()
    }
  }, [activeSubTab])

  useEffect(() => {
    let intervalId = null
    
    if (activeSubTab === 'whatsapp' && isPairing && !qrCodeString) {
      setQrLoading(true)
      const poll = async () => {
        const success = await fetchQrCode()
        if (success) {
          setQrLoading(false)
          clearInterval(intervalId)
        }
      }
      
      poll()
      intervalId = setInterval(poll, 3000)
    }

    return () => {
      if (intervalId) clearInterval(intervalId)
    }
  }, [activeSubTab, isPairing, qrCodeString])

  useEffect(() => {
    let intervalId = null

    if (activeSubTab === 'whatsapp' && isPairing) {
      const pollStatus = async () => {
        try {
          const { data, error } = await supabase.functions.invoke('whatsapp-admin', {
            body: { action: 'status' }
          })
          if (error) throw error
          if (data && data.connected) {
            setWhatsappStatus(data)
            setIsPairing(false)
            setQrCodeString(null)
          }
        } catch (err) {
          console.error('Erro no polling de status do WhatsApp:', err)
        }
      }

      intervalId = setInterval(pollStatus, 4000)
    }

    return () => {
      if (intervalId) clearInterval(intervalId)
    }
  }, [activeSubTab, isPairing])
  const formatWhatsapp = (val) => {
    if (!val) return ''
    let clean = val.replace(/\D/g, '')
    if (clean.startsWith('55') && clean.length === 13) {
      clean = clean.slice(2)
    }
    if (clean.length > 7) {
      return `(${clean.slice(0, 2)}) ${clean.slice(2, 7)}-${clean.slice(7, 11)}`
    }
    if (clean.length > 2) {
      return `(${clean.slice(0, 2)}) ${clean.slice(2)}`
    }
    return clean ? `(${clean}` : ''
  }

  const [newName, setNewName] = useState(user?.user_metadata?.name || '')
  const [newWhatsapp, setNewWhatsapp] = useState(formatWhatsapp(user?.user_metadata?.whatsapp_number || ''))
  const [isSaving, setIsSaving] = useState(false)
  const [errorMsg, setErrorMsg] = useState(null)
  const [successMsg, setSuccessMsg] = useState(null)

  useEffect(() => {
    setNewName(user?.user_metadata?.name || '')
    setNewWhatsapp(formatWhatsapp(user?.user_metadata?.whatsapp_number || ''))
  }, [user])

  const [avatarLoading, setAvatarLoading] = useState(false)
  const [avatarError, setAvatarError] = useState(null)

  const getInitials = (name) => {
    if (!name) return '?'
    const parts = name.trim().split(' ')
    if (parts.length === 1) return parts[0].substring(0, 1).toUpperCase()
    return (parts[0].substring(0, 1) + parts[parts.length - 1].substring(0, 1)).toUpperCase()
  }

  const handleAvatarUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    setAvatarError(null)

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      setAvatarError('Apenas arquivos JPG, PNG e WebP são permitidos.')
      return
    }

    const maxSize = 2 * 1024 * 1024
    if (file.size > maxSize) {
      setAvatarError('O tamanho da imagem deve ser menor que 2MB.')
      return
    }

    setAvatarLoading(true)
    try {
      const fileExt = file.name.split('.').pop().toLowerCase()
      const fileName = `${user.id}.${fileExt}`

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, { upsert: true })

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName)

      const oldAvatarUrl = user?.user_metadata?.avatar_url

      const { error: updateError } = await supabase.auth.updateUser({
        data: { avatar_url: publicUrl }
      })

      if (updateError) throw updateError

      if (oldAvatarUrl) {
        try {
          const oldFileName = oldAvatarUrl.split('/').pop().split('?')[0]
          if (oldFileName !== fileName) {
            const { error: removeError } = await supabase.storage.from('avatars').remove([oldFileName])
            if (removeError) {
              console.error('Erro ao limpar avatar antigo:', removeError.message)
            }
          }
        } catch (cleanupErr) {
          console.error('Erro ao limpar avatar antigo:', cleanupErr)
        }
      }
    } catch (err) {
      setAvatarError(err.message || 'Erro ao enviar a imagem de perfil.')
    } finally {
      setAvatarLoading(false)
      e.target.value = ''
    }
  }

  const handleAvatarRemove = async () => {
    setAvatarError(null)
    setAvatarLoading(true)
    try {
      const oldAvatarUrl = user?.user_metadata?.avatar_url
      if (!oldAvatarUrl) return

      const oldFileName = oldAvatarUrl.split('/').pop().split('?')[0]

      // 1. Remover primeiro o arquivo do Supabase Storage
      const { error: removeError } = await supabase.storage.from('avatars').remove([oldFileName])
      if (removeError) throw removeError

      // 2. Somente após sucesso, limpar user_metadata.avatar_url
      const { error: updateError } = await supabase.auth.updateUser({
        data: { avatar_url: null }
      })
      if (updateError) throw updateError
    } catch (err) {
      setAvatarError(err.message || 'Erro ao remover a imagem de perfil.')
    } finally {
      setAvatarLoading(false)
    }
  }

  const handleEdit = () => {
    setIsEditing(true)
    setErrorMsg(null)
    setSuccessMsg(null)
  }

  const handleWhatsappChange = (e) => {
    let value = e.target.value.replace(/\D/g, '')
    if (value.startsWith('55') && value.length === 13) {
      value = value.slice(2)
    }
    if (value.length > 11) value = value.slice(0, 11)
    
    let formatted = ''
    if (value.length > 0) {
      formatted += `(${value.slice(0, 2)}`
    }
    if (value.length > 2) {
      formatted += `) ${value.slice(2, 7)}`
    }
    if (value.length > 7) {
      formatted += `-${value.slice(7, 11)}`
    }
    setNewWhatsapp(formatted || value)
  }

  const handleCancel = () => {
    setIsEditing(false)
    setNewName(user?.user_metadata?.name || '')
    setNewWhatsapp(formatWhatsapp(user?.user_metadata?.whatsapp_number || ''))
    setErrorMsg(null)
  }

  const [isChangingPassword, setIsChangingPassword] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordSaving, setPasswordSaving] = useState(false)
  const [passwordError, setPasswordError] = useState(null)
  const [passwordSuccess, setPasswordSuccess] = useState(null)

  const handleCancelPasswordChange = () => {
    setIsChangingPassword(false)
    setNewPassword('')
    setConfirmPassword('')
    setPasswordError(null)
    setPasswordSuccess(null)
  }

  const handleSavePassword = async () => {
    setPasswordError(null)
    setPasswordSuccess(null)

    if (newPassword.length < 6) {
      setPasswordError('A senha deve ter no mínimo 6 caracteres.')
      return
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('As senhas não coincidem.')
      return
    }

    setPasswordSaving(true)
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword })
      if (error) {
        setPasswordError(error.message)
      } else {
        setPasswordSuccess('Senha alterada com sucesso!')
        setNewPassword('')
        setConfirmPassword('')
        setIsChangingPassword(false)
      }
    } catch {
      setPasswordError('Erro ao atualizar a senha.')
    } finally {
      setPasswordSaving(false)
    }
  }

  const handleSave = async () => {
    setErrorMsg(null)
    setSuccessMsg(null)
    setIsSaving(true)

    let normalizedWhatsapp = null
    if (newWhatsapp) {
      const cleanWhatsapp = newWhatsapp.replace(/\D/g, '')
      if (cleanWhatsapp.length !== 11 || cleanWhatsapp[2] !== '9') {
        setErrorMsg('Informe um número de WhatsApp válido.')
        setIsSaving(false)
        return
      }
      normalizedWhatsapp = `55${cleanWhatsapp}`
    }

    try {
      const { error } = await supabase.auth.updateUser({
        data: { 
          name: newName,
          whatsapp_number: normalizedWhatsapp
        }
      })
      if (error) {
        setErrorMsg(error.message)
      } else {
        setSuccessMsg('Dados atualizados com sucesso!')
        setIsEditing(false)
      }
    } catch {
      setErrorMsg('Erro ao atualizar os dados.')
    } finally {
      setIsSaving(false)
    }
  }

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
      <div className="view-header" style={{ flexShrink: 0 }}>
        <h1 className="view-title">Configurações</h1>
        <p className="view-description">Gerencie as preferências da aplicação, incluindo o tema de exibição e os dados da sua conta.</p>
      </div>

      <div className="settings-subtabs" style={{
        display: 'flex',
        gap: '0.5rem',
        borderBottom: '1px solid var(--border-color)',
        marginBottom: '1.5rem',
        paddingBottom: '0.25rem',
        overflowX: 'auto',
        whiteSpace: 'nowrap',
        scrollbarWidth: 'none',
        flexShrink: 0
      }}>
        {[
          { id: 'conta', label: 'Conta' },
          { id: 'aparencia', label: 'Aparência' },
          { id: 'messages', label: 'Mensagens' },
          { id: 'google', label: 'Google Agenda' },
          ...(user?.email === 'webychatsistema@gmail.com' ? [{ id: 'whatsapp', label: 'WhatsApp Master' }] : [])
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveSubTab(tab.id)}
            style={{
              padding: '0.6rem 1.2rem',
              background: activeSubTab === tab.id ? 'var(--accent-glow)' : 'none',
              border: 'none',
              borderRadius: '8px',
              color: activeSubTab === tab.id ? 'var(--text-accent)' : 'var(--text-secondary)',
              fontSize: '0.9rem',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeSubTab === 'conta' && (
      <div className="settings-section-card">
        <h3 className="settings-section-title">Minha Conta</h3>
        <p className="settings-section-subtitle">Informações básicas do seu perfil de usuário.</p>
        
        <div style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: '400px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', marginBottom: '0.5rem' }}>
            <div style={{
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              overflow: 'hidden',
              backgroundColor: 'var(--accent-glow)',
              color: 'var(--text-accent)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.75rem',
              fontWeight: '600',
              border: '2px solid var(--border-color)',
              flexShrink: 0
            }}>
              {user?.user_metadata?.avatar_url ? (
                <img
                  src={user.user_metadata.avatar_url}
                  alt="Foto de perfil"
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                getInitials(user?.user_metadata?.name || user?.email)
              )}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <label className="btn btn-secondary" style={{ cursor: 'pointer', margin: 0, display: 'inline-flex', alignItems: 'center', fontSize: '0.85rem' }}>
                  {avatarLoading ? 'Carregando...' : 'Escolher foto'}
                  <input
                    type="file"
                    accept=".jpg,.jpeg,.png,.webp"
                    style={{ display: 'none' }}
                    onChange={handleAvatarUpload}
                    disabled={avatarLoading}
                  />
                </label>
                {user?.user_metadata?.avatar_url && (
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ color: 'var(--text-error)', borderColor: 'rgba(239, 68, 68, 0.2)' }}
                    onClick={handleAvatarRemove}
                    disabled={avatarLoading}
                  >
                    Remover
                  </button>
                )}
              </div>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>
                Formatos: JPG, PNG ou WebP (Máx: 2MB).
              </p>
              {avatarError && (
                <p style={{ color: 'var(--text-error)', fontSize: '0.75rem', margin: 0 }}>
                  {avatarError}
                </p>
              )}
            </div>
          </div>

          <div>
            <label className="form-label" style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', fontWeight: '500', color: 'var(--text-secondary)' }}>Nome</label>
            <input
              type="text"
              className="form-input"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              disabled={!isEditing || isSaving}
            />
          </div>
          <div>
            <label className="form-label" style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', fontWeight: '500', color: 'var(--text-secondary)' }}>WhatsApp</label>
            <input
              type="text"
              className="form-input"
              placeholder="(11) 99999-9999"
              value={newWhatsapp}
              onChange={handleWhatsappChange}
              disabled={!isEditing || isSaving}
            />
          </div>
          <div>
            <label className="form-label" style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', fontWeight: '500', color: 'var(--text-secondary)' }}>E-mail</label>
            <input
              type="email"
              className="form-input"
              value={user?.email || ''}
              disabled
            />
          </div>

          {errorMsg && (
            <p style={{ color: 'var(--text-error)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
              {errorMsg}
            </p>
          )}
          {successMsg && (
            <p style={{ color: '#10b981', fontSize: '0.875rem', marginTop: '0.25rem' }}>
              {successMsg}
            </p>
          )}

          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
            {!isEditing ? (
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleEdit}
              >
                Editar
              </button>
            ) : (
              <>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleSave}
                  disabled={isSaving}
                >
                  {isSaving ? 'Salvando...' : 'Salvar'}
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={handleCancel}
                  disabled={isSaving}
                >
                  Cancelar
                </button>
              </>
            )}
          </div>

          <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)', margin: '1rem 0' }} />

          {!isChangingPassword ? (
            <div>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  setIsChangingPassword(true)
                  setPasswordError(null)
                  setPasswordSuccess(null)
                }}
              >
                Alterar senha
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <h4 style={{ fontSize: '0.9rem', fontWeight: '600', color: 'var(--text-primary)' }}>Alterar Senha</h4>
              <div>
                <label className="form-label" style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', fontWeight: '500', color: 'var(--text-secondary)' }}>Nova senha</label>
                <input
                  type="password"
                  className="form-input"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  disabled={passwordSaving}
                  placeholder="Mínimo 6 caracteres"
                />
              </div>
              <div>
                <label className="form-label" style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', fontWeight: '500', color: 'var(--text-secondary)' }}>Confirmar nova senha</label>
                <input
                  type="password"
                  className="form-input"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={passwordSaving}
                />
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleSavePassword}
                  disabled={passwordSaving}
                >
                  {passwordSaving ? 'Salvando...' : 'Salvar nova senha'}
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={handleCancelPasswordChange}
                  disabled={passwordSaving}
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}

          {passwordError && (
            <p style={{ color: 'var(--text-error)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
              {passwordError}
            </p>
          )}
          {passwordSuccess && (
            <p style={{ color: '#10b981', fontSize: '0.875rem', marginTop: '0.25rem' }}>
              {passwordSuccess}
            </p>
          )}
        </div>
      </div>
      )}
      
      {activeSubTab === 'aparencia' && (
      <div className="settings-section-card">
        <h3 className="settings-section-title">Preferência de Tema</h3>
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
            <span>Escuro</span>
          </button>
          
          <button
            type="button"
            className={`theme-option-btn ${theme === 'light' ? 'active' : ''}`}
            onClick={() => setTheme('light')}
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="theme-icon">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
            </svg>
            <span>Claro (Padrão)</span>
          </button>

          <button
            type="button"
            className={`theme-option-btn ${theme === 'system' ? 'active' : ''}`}
            onClick={() => setTheme('system')}
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="theme-icon">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 17.25v1.007a3 3 0 01-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0115 18.257V17.25m6-12V15a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 15V5.25A2.25 2.25 0 015.25 3h13.5A2.25 2.25 0 0121 5.25z" />
            </svg>
            <span>Automático (Sistema)</span>
          </button>
        </div>
      </div>
      )}

      {activeSubTab === 'messages' && (
        <div className="settings-section-card">
          <h3 className="settings-section-title">Mensagens Personalizadas</h3>
          <p className="settings-section-subtitle">
            Configure o modelo de mensagem de confirmação enviado automaticamente pelo WhatsApp para seus clientes.
          </p>

          <div style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem', maxWidth: '600px' }}>
            <div>
              <h4 style={{ fontSize: '0.95rem', fontWeight: '600', marginBottom: '0.5rem', color: 'var(--text-primary)' }}>
                Lembrete de reunião
              </h4>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.75rem', lineHeight: '1.4' }}>
                Defina o texto padrão do lembrete. Você pode usar variáveis dinâmicas que serão substituídas pelas informações reais da reunião no momento do disparo.
              </p>
              
              <textarea
                className="form-input"
                style={{
                  width: '100%',
                  minHeight: '120px',
                  fontFamily: 'inherit',
                  fontSize: '0.9rem',
                  lineHeight: '1.5',
                  padding: '0.75rem',
                  resize: 'vertical',
                  borderRadius: '8px',
                  border: '1px solid var(--border-color)',
                  backgroundColor: 'var(--bg-input, transparent)',
                  color: 'var(--text-primary)'
                }}
                value={reminderMessage}
                onChange={(e) => setReminderMessage(e.target.value)}
                placeholder="Escreva a mensagem aqui..."
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: '0.25rem 0' }}>
              <input
                type="checkbox"
                id="reminder-without-participants"
                checked={reminderWithoutParticipants}
                onChange={(e) => setReminderWithoutParticipants(e.target.checked)}
                style={{
                  width: '16px',
                  height: '16px',
                  cursor: 'pointer',
                  accentColor: 'var(--accent-color, #3b82f6)'
                }}
              />
              <label
                htmlFor="reminder-without-participants"
                style={{
                  fontSize: '0.875rem',
                  color: 'var(--text-primary)',
                  cursor: 'pointer',
                  userSelect: 'none'
                }}
              >
                Enviar lembrete mesmo sem participantes confirmados
              </label>
            </div>

             <div style={{
              padding: '0.75rem 1rem',
              backgroundColor: 'var(--accent-glow)',
              borderRadius: '8px',
              border: '1px solid var(--border-color)',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.5rem'
            }}>
              <div>
                <span style={{ fontSize: '0.75rem', fontWeight: '600', color: 'var(--text-accent)', display: 'block', marginBottom: '0.25rem' }}>
                  Variáveis disponíveis:
                </span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>
                  {"{data}"}, {"{hora}"}, {"{participantes}"}, {"{meet}"}
                </span>
              </div>
              <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', margin: 0, lineHeight: '1.4' }}>
                * A variável <strong>{"{participantes}"}</strong> será substituída automaticamente pela lista de nomes e telefones cadastrados (Ex: Nome — (11) 99999-9999).
              </p>
            </div>

            <div style={{
              padding: '1rem',
              borderRadius: '8px',
              border: '1px dashed var(--border-color)',
              backgroundColor: 'rgba(255, 255, 255, 0.02)',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.5rem'
            }}>
              <span style={{ fontSize: '0.75rem', fontWeight: '600', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Como a mensagem será enviada
              </span>
              <div style={{
                whiteSpace: 'pre-wrap',
                fontFamily: 'inherit',
                fontSize: '0.875rem',
                lineHeight: '1.5',
                color: 'var(--text-primary)',
                padding: '0.75rem',
                borderRadius: '6px',
                backgroundColor: 'rgba(0, 0, 0, 0.15)',
                border: '1px solid var(--border-color)',
                wordBreak: 'break-word'
              }}>
                {getPreviewMessage()}
              </div>
            </div>

            {reminderWithoutParticipants && (
              <div style={{
                padding: '1rem',
                borderRadius: '8px',
                border: '1px dashed var(--border-color)',
                backgroundColor: 'rgba(255, 255, 255, 0.02)',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.5rem'
              }}>
                <span style={{ fontSize: '0.75rem', fontWeight: '600', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Como ficará sem participantes
                </span>
                <div style={{
                  whiteSpace: 'pre-wrap',
                  fontFamily: 'inherit',
                  fontSize: '0.875rem',
                  lineHeight: '1.5',
                  color: 'var(--text-primary)',
                  padding: '0.75rem',
                  borderRadius: '6px',
                  backgroundColor: 'rgba(0, 0, 0, 0.15)',
                  border: '1px solid var(--border-color)',
                  wordBreak: 'break-word'
                }}>
                  {getPreviewWithoutParticipants()}
                </div>
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleSaveMessage}
                  disabled={isSavingMessage}
                >
                  {isSavingMessage ? 'Salvando...' : 'Salvar configurações'}
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={handleRestoreDefault}
                  disabled={isSavingMessage}
                  style={{ fontSize: '0.85rem' }}
                >
                  Restaurar padrão
                </button>
                {isSavingMessage && (
                  <div className="loading-spinner" style={{ width: '16px', height: '16px', borderWidth: '2px' }}></div>
                )}
              </div>
              
              {messageSuccess && (
                <p style={{ color: '#10b981', fontSize: '0.85rem', margin: 0 }}>
                  {messageSuccess}
                </p>
              )}
              {messageError && (
                <p style={{ color: 'var(--text-error)', fontSize: '0.85rem', margin: 0 }}>
                  {messageError}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {activeSubTab === 'google' && (
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
                Conta desconectada
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
      )}

      {activeSubTab === 'whatsapp' && (
        <div className="settings-section-card">
          <h3 className="settings-section-title">WhatsApp Master</h3>
          <p className="settings-section-subtitle">
            Gerencie o número de WhatsApp usado pelo Meety para o envio automático de mensagens.
          </p>

          <div style={{ marginTop: '1.5rem' }}>
            {whatsappLoading ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                <div className="loading-spinner" style={{ width: '20px', height: '20px', borderWidth: '2px' }}></div>
                <span>Carregando status do WhatsApp...</span>
              </div>
            ) : whatsappError ? (
              <div>
                <p style={{ color: 'var(--text-error)', fontSize: '0.9rem', margin: 0 }}>
                  {whatsappError}
                </p>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ marginTop: '1rem' }}
                  onClick={fetchWhatsappStatus}
                >
                  Tentar novamente
                </button>
              </div>
            ) : whatsappStatus ? (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                  <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Status da conexão:</span>
                  <span style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    padding: '0.25rem 0.75rem',
                    borderRadius: '50px',
                    fontSize: '0.85rem',
                    fontWeight: '600',
                    backgroundColor: whatsappStatus.connected ? 'rgba(16, 185, 129, 0.1)' : 'rgba(107, 114, 128, 0.1)',
                    color: whatsappStatus.connected ? '#10b981' : 'var(--text-secondary)'
                  }}>
                    {whatsappStatus.connected ? 'Conectado' : 'Desconectado'}
                  </span>
                </div>

                {whatsappStatus.connected && (
                  <div style={{ marginTop: '1rem' }}>
                    {whatsappStatus.number && (
                      <div style={{ fontSize: '0.9rem', color: 'var(--text-primary)', marginBottom: '1rem' }}>
                        <strong>Número conectado:</strong> {whatsappStatus.number}
                      </div>
                    )}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={handleWhatsappLogout}
                        disabled={isLoggingOut || isDisconnecting}
                      >
                        {isLoggingOut ? 'Processando...' : 'Trocar número'}
                      </button>
                      <button
                        type="button"
                        className="btn btn-primary"
                        style={{ backgroundColor: 'var(--text-error, #ef4444)', borderColor: 'var(--text-error, #ef4444)', color: '#ffffff' }}
                        onClick={handleWhatsappDisconnect}
                        disabled={isLoggingOut || isDisconnecting}
                      >
                        {isDisconnecting ? 'Desconectando...' : 'Desconectar'}
                      </button>
                      {(isLoggingOut || isDisconnecting) && (
                        <div className="loading-spinner" style={{ width: '16px', height: '16px', borderWidth: '2px' }}></div>
                      )}
                    </div>
                    {logoutError && (
                      <p style={{ color: 'var(--text-error)', fontSize: '0.85rem', marginTop: '0.5rem', marginBottom: 0 }}>
                        {logoutError}
                      </p>
                    )}
                    {disconnectError && (
                      <p style={{ color: 'var(--text-error)', fontSize: '0.85rem', marginTop: '0.5rem', marginBottom: 0 }}>
                        {disconnectError}
                      </p>
                    )}
                    {disconnectSuccess && (
                      <p style={{ color: '#10b981', fontSize: '0.85rem', marginTop: '0.5rem', marginBottom: 0 }}>
                        {disconnectSuccess}
                      </p>
                    )}
                  </div>
                )}

                {!whatsappStatus.connected && !isPairing && (
                  <div style={{ marginTop: '1rem' }}>
                    <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
                      Nenhum WhatsApp está conectado.
                    </p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <button
                        type="button"
                        className="btn btn-primary"
                        onClick={handleStartPairing}
                        disabled={isLoggingOut}
                      >
                        {isLoggingOut ? 'Iniciando...' : 'Conectar número'}
                      </button>
                      {isLoggingOut && (
                        <div className="loading-spinner" style={{ width: '16px', height: '16px', borderWidth: '2px' }}></div>
                      )}
                    </div>
                    {logoutError && (
                      <p style={{ color: 'var(--text-error)', fontSize: '0.85rem', marginTop: '0.5rem', marginBottom: 0 }}>
                        {logoutError}
                      </p>
                    )}
                  </div>
                )}

                {isPairing && (
                  <div style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'flex-start' }}>
                    <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                      Status: <strong>Aguardando pareamento...</strong>
                    </div>

                    {qrLoading && !qrCodeString && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                        <div className="loading-spinner" style={{ width: '18px', height: '18px', borderWidth: '2px' }}></div>
                        <span>Gerando QR Code...</span>
                      </div>
                    )}

                    {qrError && (
                      <p style={{ color: 'var(--text-error)', fontSize: '0.85rem', margin: 0 }}>
                        {qrError}
                      </p>
                    )}

                    {qrCodeString && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'flex-start' }}>
                        <div style={{
                          padding: '1rem',
                          backgroundColor: '#ffffff',
                          borderRadius: '8px',
                          border: '1px solid var(--border-color)',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}>
                          <img
                            src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(qrCodeString)}`}
                            alt="WhatsApp Master QR Code"
                            style={{ width: '180px', height: '180px' }}
                          />
                        </div>
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0, maxWidth: '320px', lineHeight: '1.4' }}>
                          Abra o WhatsApp no novo celular e escaneie este QR Code em <strong>Aparelhos conectados</strong>.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  )
}
