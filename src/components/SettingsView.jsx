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
  const [newName, setNewName] = useState(user?.user_metadata?.name || '')
  const [isSaving, setIsSaving] = useState(false)
  const [errorMsg, setErrorMsg] = useState(null)
  const [successMsg, setSuccessMsg] = useState(null)

  useEffect(() => {
    setNewName(user?.user_metadata?.name || '')
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

  const handleCancel = () => {
    setIsEditing(false)
    setNewName(user?.user_metadata?.name || '')
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
    try {
      const { error } = await supabase.auth.updateUser({
        data: { name: newName }
      })
      if (error) {
        setErrorMsg(error.message)
      } else {
        setSuccessMsg('Nome atualizado com sucesso!')
        setIsEditing(false)
      }
    } catch {
      setErrorMsg('Erro ao atualizar o nome.')
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
          { id: 'google', label: 'Google Agenda' }
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
    </div>
  )
}
