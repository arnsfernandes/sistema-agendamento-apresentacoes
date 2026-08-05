import { useState, useEffect } from 'react'

export default function MoveParticipantsModal({
  isOpen,
  sourceMeeting,
  futureMeetings,
  onClose,
  onMove,
  onDeleteAll,
  isProcessing
}) {
  const [selectedTargetMeetingId, setSelectedTargetMeetingId] = useState(null)

  // Limpa o ID selecionado sempre que o modal abre, fecha ou muda a reunião de origem
  useEffect(() => {
    setSelectedTargetMeetingId(null)
  }, [isOpen, sourceMeeting])

  if (!isOpen || !sourceMeeting) return null

  // Filtra as apresentações futuras para remover a atual
  const availableMeetings = futureMeetings.filter(m => m.id !== sourceMeeting.id)

  const handleSave = () => {
    if (!selectedTargetMeetingId) return
    onMove(selectedTargetMeetingId)
    setSelectedTargetMeetingId(null)
  }

  const formatMeetingDate = (dateStr) => {
    const [sYear, sMonth, sDay] = dateStr.split('-').map(Number)
    const sDate = new Date(sYear, sMonth - 1, sDay)
    return sDate.toLocaleDateString('pt-BR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    })
  }

  return (
    <div className="sub-modal-overlay" onClick={() => { if (!isProcessing) onClose(); }}>
      <div className="sub-modal-card reschedule-modal" onClick={(e) => e.stopPropagation()}>
        <div className="sub-modal-header">
          <h4 className="sub-modal-title">Mover Participantes</h4>
          <button
            className="btn-close"
            onClick={onClose}
            type="button"
            aria-label="Fechar modal"
            disabled={isProcessing}
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="sub-modal-body">
          <p className="reschedule-intro">
            Selecione uma apresentação de destino para transferir todos os participantes ativos de <strong>{sourceMeeting.title}</strong>:
          </p>

          <div
            className="warning-box"
            style={{
              margin: '1rem 0',
              padding: '0.8rem',
              backgroundColor: 'rgba(245, 158, 11, 0.1)',
              border: '1px solid rgba(245, 158, 11, 0.3)',
              borderRadius: '8px',
              color: '#d97706',
              fontSize: '0.82rem',
              lineHeight: '1.4'
            }}
          >
            <strong>Atenção:</strong> Ao transferir os participantes, as observações e o status de envio de mensagem de cada um serão perdidos. Os clientes cadastrados não serão excluídos.
          </div>

          <div className="reschedule-meetings-list">
            {availableMeetings.length > 0 ? (
              availableMeetings.map((meeting) => {
                // Bloqueia se qualquer cliente da origem já estiver no destino (comparando clienteId)
                const hasOverlap = meeting.participantsList.some(tp =>
                  sourceMeeting.participantsList.some(sp => sp.clienteId === tp.clienteId)
                )
                const isSelected = selectedTargetMeetingId === meeting.id

                return (
                  <div
                    key={meeting.id}
                    className={`reschedule-option-card ${hasOverlap ? 'disabled' : ''} ${isSelected ? 'selected' : ''}`}
                    onClick={() => {
                      if (!hasOverlap && !isProcessing) {
                        setSelectedTargetMeetingId(meeting.id)
                      }
                    }}
                  >
                    <div className="reschedule-option-info">
                      <span className="reschedule-option-date">
                        {formatMeetingDate(meeting.date)} às {meeting.time}
                      </span>
                      <span className="reschedule-option-title">{meeting.title}</span>
                      <span className="reschedule-option-count">
                        {meeting.participantsList.length} {meeting.participantsList.length === 1 ? 'participante' : 'participantes'}
                      </span>
                    </div>

                    {hasOverlap ? (
                      <span className="reschedule-status-badge already-active" style={{ backgroundColor: '#ef4444', color: '#fff' }}>
                        Conflito
                      </span>
                    ) : (
                      <div className={`reschedule-checkbox ${isSelected ? 'checked' : ''}`}>
                        {isSelected && (
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                          </svg>
                        )}
                      </div>
                    )}
                  </div>
                )
              })
            ) : (
              <p className="no-future-meetings">Nenhuma apresentação futura disponível para transferência.</p>
            )}
          </div>

          <div className="sub-modal-footer" style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', justifyContent: 'space-between', alignItems: 'center' }}>
            <button
              className="btn btn-secondary"
              type="button"
              onClick={onDeleteAll}
              disabled={isProcessing}
              style={{ color: 'var(--text-error)', border: '1px solid rgba(239, 68, 68, 0.3)' }}
            >
              Excluir apresentação e participações
            </button>
            <button
              className="btn btn-primary"
              type="button"
              disabled={!selectedTargetMeetingId || isProcessing}
              onClick={handleSave}
            >
              {isProcessing ? 'Processando...' : 'Confirmar e mover'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
