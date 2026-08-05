import { useState } from 'react'
import { formatMeetingDate } from '../utils/dateUtils'

export default function RescheduleParticipantModal({
  isOpen,
  participant,
  futureMeetings,
  onClose,
  onReschedule
}) {
  const [selectedTargetMeetingId, setSelectedTargetMeetingId] = useState(null)

  if (!isOpen || !participant) return null

  const handleSave = () => {
    if (!selectedTargetMeetingId) return
    onReschedule(selectedTargetMeetingId)
    setSelectedTargetMeetingId(null)
  }

  return (
    <div className="sub-modal-overlay" onClick={onClose}>
      <div className="sub-modal-card reschedule-modal" onClick={(e) => e.stopPropagation()}>
        <div className="sub-modal-header">
          <h4 className="sub-modal-title">Remarcar Participante</h4>
          <button
            className="btn-close"
            onClick={onClose}
            type="button"
            aria-label="Fechar modal de remarcação"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="sub-modal-body">
          <p className="reschedule-intro">
            Selecione uma reunião futura para transferir o participante <strong>{participant.nome}</strong>:
          </p>

          <div className="reschedule-meetings-list">
            {futureMeetings.length > 0 ? (
              futureMeetings.map((meeting) => {
                const isAlreadyActive = meeting.participantsList.some(
                  (p) => p.telefone === participant.telefone && p.statusAtivo
                )
                const isSelected = selectedTargetMeetingId === meeting.id

                return (
                  <div
                    key={meeting.id}
                    className={`reschedule-option-card ${isAlreadyActive ? 'disabled' : ''} ${isSelected ? 'selected' : ''}`}
                    onClick={() => {
                      if (!isAlreadyActive) {
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

                    {isAlreadyActive ? (
                      <span className="reschedule-status-badge already-active">
                        Já ativo
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
              <p className="no-future-meetings">Nenhuma reunião futura disponível para remarcação.</p>
            )}
          </div>

          <div className="sub-modal-footer">
            <button
              className="btn btn-secondary"
              type="button"
              onClick={onClose}
            >
              Cancelar
            </button>
            <button
              className="btn btn-primary"
              type="button"
              disabled={!selectedTargetMeetingId}
              onClick={handleSave}
            >
              Confirmar Remarcação
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
