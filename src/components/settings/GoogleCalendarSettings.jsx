export default function GoogleCalendarSettings({
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
  activeCalendarId,
  handleSaveCalendar,
  isSavingCalendar,
  savingCalendarError,
  savingCalendarSuccess
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '100%' }}>
      {!hasActiveGoogleIntegration ? (
        <div className="settings-section-card" style={{
          backgroundColor: '#0B0C16',
          border: '1px solid rgba(124, 92, 255, 0.28)',
          boxShadow: '0 0 24px rgba(124, 92, 255, 0.06)',
          borderRadius: '18px',
          padding: '28px',
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          width: '100%',
          maxWidth: '100%'
        }}>
          <div>
            <h3 className="settings-section-title" style={{ fontSize: '20px', fontWeight: '700', color: '#F8FAFC', margin: '0 0 8px 0', letterSpacing: 'normal', textTransform: 'none' }}>Integração Google Agenda</h3>
            <p className="settings-section-subtitle" style={{ fontSize: '14px', color: '#94A3B8', margin: 0 }}>Vincule sua conta Google para sincronizar e gerenciar as apresentações comerciais diretamente na sua agenda.</p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '8px' }}>
            <p style={{ fontSize: '0.95rem', color: '#94A3B8', margin: 0 }}>Sua conta Google está desconectada no momento.</p>
            <button
              type="button"
              onClick={handleConnectGoogle}
              disabled={isConnectingGoogle}
              style={{
                height: '48px',
                borderRadius: '10px',
                background: 'linear-gradient(90deg, #6366F1 0%, #7C3AED 100%)',
                color: '#ffffff',
                border: 'none',
                padding: '0 24px',
                fontWeight: '600',
                fontSize: '0.9rem',
                cursor: 'pointer',
                boxShadow: '0 0 16px rgba(124, 58, 237, 0.25)',
                alignSelf: 'start',
                marginTop: '8px'
              }}
            >
              {isConnectingGoogle ? 'Conectando...' : 'Conectar Google'}
            </button>
            {googleConnectError && (
              <p style={{ color: '#ef4444', fontSize: '0.875rem', margin: 0, marginTop: '4px' }}>
                {googleConnectError}
              </p>
            )}
          </div>
        </div>
      ) : (
        <>
          {/* Card Conta Google */}
          <div className="settings-section-card" style={{
            backgroundColor: '#0B0C16',
            border: '1px solid rgba(124, 92, 255, 0.22)',
            boxShadow: '0 0 24px rgba(124, 92, 255, 0.06)',
            borderRadius: '18px',
            padding: '28px',
            boxSizing: 'border-box',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '20px',
            width: '100%',
            maxWidth: '100%'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{
                width: '44px',
                height: '44px',
                borderRadius: '50%',
                backgroundColor: 'rgba(124, 92, 255, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#a855f7',
                flexShrink: 0
              }}>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" style={{ width: '22px', height: '22px' }}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                </svg>
              </div>
              <div>
                <h3 className="settings-section-title" style={{ fontSize: '18px', fontWeight: '700', color: '#F8FAFC', margin: '0 0 4px 0', letterSpacing: 'normal', textTransform: 'none' }}>Conta Google</h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <span style={{
                    backgroundColor: 'rgba(16, 185, 129, 0.15)',
                    border: '1px solid #10b981',
                    color: '#10b981',
                    fontSize: '11px',
                    fontWeight: '700',
                    padding: '2px 8px',
                    borderRadius: '20px',
                    textTransform: 'uppercase'
                  }}>
                    Conectado
                  </span>
                  <span style={{ color: '#94A3B8', fontSize: '14px' }}>{googleAccountEmail || 'Carregando...'}</span>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <button
                type="button"
                onClick={handleConnectGoogle}
                disabled={isConnectingGoogle || isDisconnectingGoogle}
                style={{
                  height: '42px',
                  borderRadius: '8px',
                  backgroundColor: '#11131F',
                  border: '1px solid rgba(148, 163, 184, 0.22)',
                  color: '#E2E8F0',
                  padding: '0 16px',
                  fontWeight: '600',
                  fontSize: '0.85rem',
                  cursor: 'pointer'
                }}
              >
                {isConnectingGoogle ? 'Redirecionando...' : 'Trocar conta'}
              </button>

              <button
                type="button"
                onClick={handleDisconnectGoogle}
                disabled={isConnectingGoogle || isDisconnectingGoogle}
                style={{
                  height: '42px',
                  borderRadius: '8px',
                  backgroundColor: 'transparent',
                  border: 'none',
                  color: '#ef4444',
                  padding: '0 12px',
                  fontWeight: '500',
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  opacity: 0.85
                }}
              >
                {isDisconnectingGoogle ? 'Desconectando...' : 'Desconectar'}
              </button>
            </div>
          </div>

          {googleConnectError && (
            <p style={{ color: '#ef4444', fontSize: '0.875rem', margin: 0 }}>
              {googleConnectError}
            </p>
          )}
          {googleDisconnectError && (
            <p style={{ color: '#ef4444', fontSize: '0.875rem', margin: 0 }}>
              {googleDisconnectError}
            </p>
          )}

          {/* Card Agenda selecionada */}
          {(() => {
            const activeCal = googleCalendars.find(cal => cal.id === activeCalendarId);
            return (
              <div className="settings-section-card" style={{
                backgroundColor: '#0B0C16',
                border: '1px solid rgba(124, 92, 255, 0.55)',
                boxShadow: '0 0 24px rgba(124, 92, 255, 0.08)',
                borderRadius: '18px',
                padding: '28px',
                boxSizing: 'border-box',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px',
                width: '100%',
                maxWidth: '100%'
              }}>
                <div>
                  <h3 className="settings-section-title" style={{ fontSize: '18px', fontWeight: '700', color: '#F8FAFC', margin: '0 0 4px 0', letterSpacing: 'normal', textTransform: 'none' }}>Agenda selecionada</h3>
                  <p className="settings-section-subtitle" style={{ fontSize: '14px', color: '#94A3B8', margin: 0 }}>Esta é a agenda sincronizada com o Meety.</p>
                </div>

                <div style={{
                  backgroundColor: '#11131F',
                  border: '1px solid rgba(124, 92, 255, 0.22)',
                  borderRadius: '12px',
                  padding: '16px 20px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="#A5B4FC" style={{ width: '20px', height: '20px' }}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5m-9-6h.008v.008H12v-.008zM12 15h.008v.008H12V15zm0 2.25h.008v.008H12v-.008zM9.75 15h.008v.008H9.75V15zm0 2.25h.008v.008H9.75v-.008zM7.5 15h.008v.008H7.5V15zm0 2.25h.008v.008H7.5v-.008z" />
                    </svg>
                    <span style={{ fontSize: '15px', fontWeight: '600', color: '#F8FAFC' }}>
                      {activeCal ? getCalName(activeCal) : 'Nenhuma agenda ativa sincronizada'}
                    </span>
                  </div>
                  <span style={{
                    backgroundColor: 'rgba(99, 102, 241, 0.15)',
                    border: '1px solid #6366F1',
                    color: '#a5b4fc',
                    fontSize: '11px',
                    fontWeight: '700',
                    padding: '2px 8px',
                    borderRadius: '20px',
                    textTransform: 'uppercase'
                  }}>
                    Em uso
                  </span>
                </div>
              </div>
            );
          })()}

          {/* Card Outras agendas disponíveis */}
          <div className="settings-section-card" style={{
            backgroundColor: '#0B0C16',
            border: '1px solid rgba(124, 92, 255, 0.22)',
            boxShadow: '0 0 24px rgba(124, 92, 255, 0.06)',
            borderRadius: '18px',
            padding: '28px',
            boxSizing: 'border-box',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            width: '100%',
            maxWidth: '100%'
          }}>
            <div>
              <h3 className="settings-section-title" style={{ fontSize: '18px', fontWeight: '700', color: '#F8FAFC', margin: '0 0 4px 0', letterSpacing: 'normal', textTransform: 'none' }}>Outras agendas disponíveis</h3>
              <p className="settings-section-subtitle" style={{ fontSize: '14px', color: '#94A3B8', margin: 0 }}>Escolha outra agenda para sincronizar com o Meety.</p>
            </div>

            {calendarsLoading ? (
              <p style={{ color: '#94A3B8', fontSize: '0.9rem', margin: 0 }}>Carregando agendas...</p>
            ) : calendarsError ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'start' }}>
                <p style={{ color: '#ef4444', fontSize: '0.875rem', margin: 0 }}>{calendarsError}</p>
                <button type="button" className="btn btn-secondary" onClick={fetchGoogleCalendars}>Tentar novamente</button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {googleCalendars.map((cal) => {
                  const isSelectable = cal.accessRole === 'owner' || cal.accessRole === 'writer';
                  const isSelected = selectedCalendar?.id === cal.id;
                  const isActive = activeCalendarId === cal.id;

                  // Skip the actively synced calendar if it's already shown in the top card
                  if (isActive) return null;

                  return (
                    <div
                      key={cal.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '16px 20px',
                        backgroundColor: '#11131F',
                        border: isSelected ? '1px solid #6366F1' : '1px solid rgba(255, 255, 255, 0.06)',
                        borderRadius: '12px',
                        opacity: isSelectable ? 1 : 0.5,
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke={isSelectable ? '#94A3B8' : '#64748B'} style={{ width: '20px', height: '20px' }}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                        </svg>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontSize: '15px', fontWeight: '600', color: '#F8FAFC' }}>
                            {getCalName(cal)}
                          </span>
                          {!isSelectable && (
                            <span style={{ fontSize: '12px', color: '#64748B' }}>
                              Apenas leitura ({cal.accessRole})
                            </span>
                          )}
                        </div>
                      </div>

                      <div>
                        {!isSelectable ? (
                          <span style={{
                            backgroundColor: 'rgba(239, 68, 68, 0.12)',
                            border: '1px solid rgba(239, 68, 68, 0.25)',
                            color: '#ef4444',
                            fontSize: '11px',
                            fontWeight: '700',
                            padding: '4px 10px',
                            borderRadius: '20px',
                            textTransform: 'uppercase'
                          }}>
                            Somente leitura
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={async () => {
                              if (isSavingCalendar) return;
                              setSelectedCalendar(cal);
                              await handleSaveCalendar(cal);
                            }}
                            disabled={isSavingCalendar}
                            style={{
                              height: '36px',
                              borderRadius: '8px',
                              backgroundColor: isSavingCalendar && selectedCalendar?.id === cal.id ? '#6366F1' : '#1E2030',
                              border: 'none',
                              color: '#ffffff',
                              padding: '0 16px',
                              fontWeight: '600',
                              fontSize: '0.85rem',
                              cursor: 'pointer',
                              transition: 'background-color 0.15s ease'
                            }}
                          >
                            {isSavingCalendar && selectedCalendar?.id === cal.id ? 'Salvando...' : 'Selecionar'}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {savingCalendarError && (
              <p style={{ color: '#ef4444', fontSize: '0.875rem', marginTop: '12px', margin: 0 }}>
                {savingCalendarError}
              </p>
            )}
            {savingCalendarSuccess && (
              <p style={{ color: '#10b981', fontSize: '0.875rem', marginTop: '12px', margin: 0 }}>
                Agenda salva com sucesso!
              </p>
            )}
          </div>
        </>
      )}
    </div>
  )
}
