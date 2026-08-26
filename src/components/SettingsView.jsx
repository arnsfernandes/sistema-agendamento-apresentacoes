import { useState } from 'react'
import AppearanceSettings from './settings/AppearanceSettings'
import MessageReminderSettings from './settings/MessageReminderSettings'
import AccountSettings from './settings/AccountSettings'
import GoogleCalendarSettings from './settings/GoogleCalendarSettings'
import WhatsAppMasterSettings from './settings/WhatsAppMasterSettings'

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
  activeCalendarId,
  handleSaveCalendar,
  isSavingCalendar,
  savingCalendarError,
  savingCalendarSuccess
}) {
  const [activeSubTab, setActiveSubTab] = useState('conta')

  return (
    <div className="view-container" style={{
      backgroundColor: 'var(--bg-primary)',
      border: 'none',
      padding: '2.5rem',
      boxSizing: 'border-box',
      display: 'flex',
      flexDirection: 'column',
      minHeight: '100vh',
      color: 'var(--text-primary)'
    }}>
      <div className="view-header" style={{ flexShrink: 0, marginBottom: '1.5rem' }}>
        <h1 className="view-title" style={{
          color: 'var(--text-primary)',
          fontSize: '32px',
          fontWeight: '700',
          background: 'none',
          WebkitBackgroundClip: 'unset',
          WebkitTextFillColor: 'var(--text-primary)'
        }}>Configurações</h1>
        <p className="view-description" style={{ color: 'var(--text-secondary)' }}>Gerencie as preferências da aplicação, incluindo o tema de exibição e os dados da sua conta.</p>
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
            onClick={() => {
              setActiveSubTab(tab.id)
            }}
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
        <AccountSettings user={user} />
      )}

      {activeSubTab === 'aparencia' && (
        <AppearanceSettings theme={theme} setTheme={setTheme} />
      )}

      {activeSubTab === 'messages' && (
        <MessageReminderSettings user={user} />
      )}

      {activeSubTab === 'google' && (
        <GoogleCalendarSettings
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
          activeCalendarId={activeCalendarId}
          handleSaveCalendar={handleSaveCalendar}
          isSavingCalendar={isSavingCalendar}
          savingCalendarError={savingCalendarError}
          savingCalendarSuccess={savingCalendarSuccess}
        />
      )}

      {activeSubTab === 'whatsapp' && (
        <WhatsAppMasterSettings activeSubTab={activeSubTab} />
      )}
    </div>
  )
}
