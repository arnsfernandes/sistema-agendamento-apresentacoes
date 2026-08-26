import { useState, useEffect } from 'react'
import { supabase } from '../../services/supabaseClient'

export default function MessageReminderSettings({ user }) {
  const [isEditingMessage, setIsEditingMessage] = useState(false)
  const [tempReminderMessage, setTempReminderMessage] = useState('')
  const [tempReminderWithoutParticipants, setTempReminderWithoutParticipants] = useState(false)
  const [textareaFocused, setTextareaFocused] = useState(false)

  const defaultReminderTemplate = "Olá! Este é um lembrete da sua reunião agendada para o dia {data}, às {hora}.\n\nParticipantes confirmados:\n{participantes}\n\nPara acessar a reunião:\n{meet}"
  const [reminderMessage, setReminderMessage] = useState(user?.user_metadata?.custom_reminder_message || defaultReminderTemplate)
  const [reminderWithoutParticipants, setReminderWithoutParticipants] = useState(!!user?.user_metadata?.reminder_without_participants)
  const [isSavingMessage, setIsSavingMessage] = useState(false)
  const [messageError, setMessageError] = useState(null)
  const [messageSuccess, setMessageSuccess] = useState(null)

  const handleStartEditMessage = () => {
    setIsEditingMessage(true)
    setTempReminderMessage(reminderMessage)
    setTempReminderWithoutParticipants(reminderWithoutParticipants)
    setMessageSuccess(null)
    setMessageError(null)
  }

  const handleCancelEditMessage = () => {
    setIsEditingMessage(false)
    setReminderMessage(tempReminderMessage)
    setReminderWithoutParticipants(tempReminderWithoutParticipants)
    setMessageSuccess(null)
    setMessageError(null)
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
      setIsEditingMessage(false)
    } catch (err) {
      console.error('Erro ao salvar configurações de mensagem:', err)
      setMessageError(err.message || 'Erro ao salvar as configurações.')
    } finally {
      setIsSavingMessage(false)
    }
  }

  useEffect(() => {
    if (user) {
      setReminderMessage(user?.user_metadata?.custom_reminder_message || defaultReminderTemplate)
      setReminderWithoutParticipants(!!user?.user_metadata?.reminder_without_participants)
    }
  }, [user])

  return (
    <div className="settings-section-card" style={{
      backgroundColor: '#0B0C16',
      border: '1px solid rgba(124, 92, 255, 0.28)',
      boxShadow: '0 0 24px rgba(124, 92, 255, 0.06)',
      borderRadius: '18px',
      padding: '28px',
      boxSizing: 'border-box',
      display: 'flex',
      flexDirection: 'column',
      gap: '24px'
    }}>
      <div>
        <h3 className="settings-section-title" style={{ fontSize: '20px', fontWeight: '700', color: '#F8FAFC', margin: '0 0 8px 0', letterSpacing: 'normal', textTransform: 'none' }}>Lembrete automático</h3>
        <p className="settings-section-subtitle" style={{ fontSize: '14px', color: '#94A3B8', margin: 0 }}>Essa mensagem é usada pelo sistema para enviar lembretes automáticos de reuniões agendadas.</p>
      </div>

      {/* Bloco Mensagem do lembrete */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        padding: '20px',
        backgroundColor: '#11131F',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: '12px'
      }}>
        <label style={{ color: '#E2E8F0', fontSize: '14px', fontWeight: '600' }}>Mensagem do lembrete</label>
        <textarea
          value={reminderMessage}
          onChange={(e) => setReminderMessage(e.target.value)}
          disabled={!isEditingMessage || isSavingMessage}
          onFocus={() => setTextareaFocused(true)}
          onBlur={() => setTextareaFocused(false)}
          placeholder="Escreva a mensagem de lembrete..."
          style={{
            width: '100%',
            minHeight: '180px',
            fontFamily: 'inherit',
            fontSize: '0.95rem',
            lineHeight: '1.6',
            padding: '16px',
            resize: 'vertical',
            borderRadius: '10px',
            border: textareaFocused ? '1px solid #6366F1' : '1px solid rgba(148, 163, 184, 0.20)',
            backgroundColor: '#0D0F1A',
            color: '#F8FAFC',
            outline: 'none',
            boxShadow: textareaFocused ? '0 0 0 3px rgba(99, 102, 241, 0.10)' : 'none',
            boxSizing: 'border-box',
            transition: 'all 0.15s ease'
          }}
        />
      </div>

      {/* Bloco Regras de envio */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '20px',
        backgroundColor: '#11131F',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: '12px'
      }}>
        <input
          type="checkbox"
          id="reminder-without-participants"
          checked={reminderWithoutParticipants}
          onChange={(e) => setReminderWithoutParticipants(e.target.checked)}
          disabled={!isEditingMessage || isSavingMessage}
          style={{
            width: '20px',
            height: '20px',
            cursor: isEditingMessage ? 'pointer' : 'default',
            accentColor: '#6366F1'
          }}
        />
        <label
          htmlFor="reminder-without-participants"
          style={{
            fontSize: '14px',
            color: '#E2E8F0',
            fontWeight: '600',
            cursor: isEditingMessage ? 'pointer' : 'default',
            userSelect: 'none'
          }}
        >
          Enviar lembrete mesmo sem participantes confirmados
        </label>
      </div>

      {/* Bloco de ações */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {!isEditingMessage ? (
            <button
              type="button"
              onClick={handleStartEditMessage}
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
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" style={{ width: '16px', height: '16px' }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
              </svg>
              Editar mensagem
            </button>
          ) : (
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                type="button"
                onClick={handleSaveMessage}
                disabled={isSavingMessage}
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
                  boxShadow: '0 0 16px rgba(124, 58, 237, 0.25)'
                }}
              >
                {isSavingMessage ? 'Salvando...' : 'Salvar alterações'}
              </button>
              <button
                type="button"
                onClick={handleCancelEditMessage}
                disabled={isSavingMessage}
                style={{
                  height: '48px',
                  borderRadius: '10px',
                  backgroundColor: 'transparent',
                  border: '1px solid rgba(148, 163, 184, 0.22)',
                  color: '#E2E8F0',
                  padding: '0 24px',
                  fontWeight: '600',
                  fontSize: '0.9rem',
                  cursor: 'pointer'
                }}
              >
                Cancelar
              </button>
            </div>
          )}
        </div>

        {messageSuccess && (
          <p style={{ color: '#10b981', fontSize: '0.875rem', margin: 0, marginTop: '4px' }}>
            {messageSuccess}
          </p>
        )}
        {messageError && (
          <p style={{ color: '#ef4444', fontSize: '0.875rem', margin: 0, marginTop: '4px' }}>
            {messageError}
          </p>
        )}
      </div>
    </div>
  )
}
