export default function GoogleSettings({
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
    </div>
  )
}
