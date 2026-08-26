import { useState } from 'react'

export default function ClientDetailsModal({
  isOpen,
  client,
  meetings,
  onClose,
  onUpdateClient,
  onDeleteClient
}) {
  const [editNome, setEditNome] = useState(client?.nome || '')
  const [editTelefone, setEditTelefone] = useState(client?.telefone || '')
  const [editAgencia, setEditAgencia] = useState(client?.agencia || '')
  const [errors, setErrors] = useState({})
  const [submitError, setSubmitError] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (!isOpen || !client) return null

  const handleClose = () => {
    setErrors({})
    setSubmitError(null)
    onClose()
  }

  const cleanPhone = (val) => val.replace(/\D/g, '')

  const formatDateStr = (dateStr) => {
    if (!dateStr) return ''
    const parts = dateStr.split('-')
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`
    }
    return dateStr
  }

  const getNextMeeting = (clientId) => {
    if (!meetings || !clientId) return null
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const clientFutureMeetings = meetings.filter(meeting => {
      const meetingDate = new Date(meeting.date + 'T00:00:00')
      const isFuture = meetingDate >= today
      const hasParticipant = meeting.participantsList.some(p => p.clienteId === clientId && p.statusAtivo !== false)
      return isFuture && hasParticipant
    })
    if (clientFutureMeetings.length === 0) return null
    clientFutureMeetings.sort((a, b) => {
      const dateDiff = new Date(a.date + 'T00:00:00') - new Date(b.date + 'T00:00:00')
      if (dateDiff !== 0) return dateDiff
      return a.time.localeCompare(b.time)
    })
    return clientFutureMeetings[0]
  }

  const handleSaveEdit = async (e) => {
    e.preventDefault()
    setErrors({})
    setSubmitError(null)

    if (!editNome.trim()) {
      setErrors(prev => ({ ...prev, nome: 'Nome é obrigatório.' }))
      return
    }

    const cleanTel = cleanPhone(editTelefone)
    if (!cleanTel) {
      setErrors(prev => ({ ...prev, telefone: 'Telefone é obrigatório.' }))
      return
    }

    if (cleanTel.length !== 10 && cleanTel.length !== 11) {
      setErrors(prev => ({ ...prev, telefone: 'Telefone deve conter 10 ou 11 dígitos.' }))
      return
    }

    setIsSubmitting(true)
    try {
      await onUpdateClient(client.id, {
        nome: editNome,
        telefone: cleanTel,
        agencia: editAgencia
      })
      handleClose()
    } catch (err) {
      setSubmitError(err.message || 'Erro ao atualizar o cliente.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteClick = async () => {
    const nextMeeting = getNextMeeting(client.id)
    if (nextMeeting) {
      setSubmitError('Este cliente possui reuniões futuras. Remova-o dessas reuniões antes de excluir.')
      return
    }

    const confirmed = window.confirm(`Deseja realmente excluir permanentemente o cliente "${client.nome}"? Esta ação não pode ser desfeita.`)
    if (!confirmed) return

    setIsSubmitting(true)
    setSubmitError(null)
    try {
      await onDeleteClient(client.id)
      handleClose()
    } catch (err) {
      setSubmitError(err.message || 'Erro ao excluir o cliente.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="sub-modal-overlay" onClick={handleClose}>
      <div className="sub-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="sub-modal-header">
          <h4 className="sub-modal-title">Ficha do Cliente</h4>
          <button
            className="btn-close"
            onClick={handleClose}
            type="button"
            aria-label="Fechar ficha"
            disabled={isSubmitting}
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="sub-modal-body">
          <form className="participant-form" onSubmit={handleSaveEdit}>
            <div className="form-group">
              <label className="form-label">Nome <span className="required-marker">*</span></label>
              <input
                type="text"
                className={`form-input ${errors.nome ? 'has-error' : ''}`}
                placeholder="Nome completo do cliente"
                value={editNome}
                onChange={(e) => {
                  setEditNome(e.target.value)
                  if (errors.nome) setErrors(prev => ({ ...prev, nome: null }))
                }}
                disabled={isSubmitting}
                required
              />
              {errors.nome && <span className="form-error-msg">{errors.nome}</span>}
            </div>

            <div className="form-group">
              <label className="form-label">Telefone <span className="required-marker">*</span></label>
              <input
                type="tel"
                className={`form-input ${errors.telefone ? 'has-error' : ''}`}
                placeholder="(00) 00000-0000"
                value={editTelefone}
                onChange={(e) => {
                  setEditTelefone(e.target.value)
                  if (errors.telefone) setErrors(prev => ({ ...prev, telefone: null }))
                }}
                disabled={isSubmitting}
                required
              />
              {errors.telefone && <span className="form-error-msg">{errors.telefone}</span>}
            </div>

            <div className="form-group">
              <label className="form-label">Agência</label>
              <input
                type="text"
                className="form-input"
                placeholder="Agência vinculada (opcional)"
                value={editAgencia}
                onChange={(e) => setEditAgencia(e.target.value)}
                disabled={isSubmitting}
              />
            </div>

            {(() => {
              const nextMeeting = getNextMeeting(client.id)
              return (
                <div className="form-group" style={{ marginTop: '1.5rem', borderTop: '1px solid var(--border-color)', paddingTop: '1.25rem' }}>
                  <label className="form-label" style={{ fontWeight: '600', color: 'var(--text-primary)', marginBottom: '0.75rem' }}>Próxima Reunião</label>
                  {nextMeeting ? (
                    <div style={{
                      background: 'var(--bg-secondary)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '8px',
                      padding: '0.88rem 1rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.35rem'
                    }}>
                      <span style={{ fontWeight: '600', fontSize: '0.92rem', color: 'var(--text-primary)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                        {nextMeeting.title}
                      </span>
                      <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" style={{ width: '14px', height: '14px', flexShrink: 0 }}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                        </svg>
                        {formatDateStr(nextMeeting.date)} às {nextMeeting.time}
                      </span>
                    </div>
                  ) : (
                    <span style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                      Nenhuma reunião futura
                    </span>
                  )}
                </div>
              )
            })()}

            {submitError && (
              <div className="form-error-msg submit-error" style={{ marginBottom: '1rem', textAlign: 'center', fontWeight: '500' }}>
                {submitError}
              </div>
            )}

            <div className="form-actions" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <button
                className="btn btn-secondary"
                type="button"
                onClick={handleDeleteClick}
                disabled={isSubmitting}
                style={{ color: 'var(--text-error)', border: '1px solid var(--text-error)', background: 'transparent' }}
              >
                Excluir
              </button>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button
                  className="btn btn-secondary"
                  onClick={handleClose}
                  type="button"
                  disabled={isSubmitting}
                >
                  Cancelar
                </button>
                <button
                  className="btn btn-primary"
                  type="submit"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
