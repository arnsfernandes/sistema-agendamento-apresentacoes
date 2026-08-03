export default function MeetingDetailsModal({
  selectedMeeting,
  formattedMeetingDate,
  onClose,
  showMeetLink,
  setShowMeetLink,
  meetCopied,
  setMeetCopied,
  onVerMensagem,
  onAddParticipant,
  onEditParticipant,
  onCancelParticipant,
  onReactivateParticipant,
  onRescheduleParticipant,
  meetingErrorMsg
}) {
  if (!selectedMeeting) return null

  const now = new Date()
  const meetingDate = new Date(`${selectedMeeting.date}T${selectedMeeting.time}:00`)
  const isPast = meetingDate < now

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">Detalhes da Reunião</h3>
          <button
            className="btn-close"
            onClick={onClose}
            type="button"
            aria-label="Fechar modal"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="modal-body">
          <h2 className="modal-meeting-title">{selectedMeeting.title}</h2>
          
          <div className="modal-meta-info">
            <div className="meta-item">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5m-9-6h.008v.008H12v-.008zM12 15h.008v.008H12V15zm0 2.25h.008v.008H12v-.008zM9.75 15h.008v.008H9.75V15zm0 2.25h.008v.008H9.75v-.008zM7.5 15h.008v.008H7.5V15zm0 2.25h.008v.008H7.5v-.008zm6.75-4.5h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008V15zm0 2.25h.008v.008h-.008v-.008zm2.25-4.5h.008v.008H16.5v-.008zm0 2.25h.008v.008H16.5V15z" />
              </svg>
              <span>{formattedMeetingDate}</span>
            </div>
            <div className="meta-item">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{selectedMeeting.time}</span>
            </div>
          </div>

          <div className="modal-actions">
            <button
              className="btn btn-secondary"
              type="button"
              onClick={() => setShowMeetLink(true)}
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="btn-icon">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
              </svg>
              Ver link do Meet
            </button>
            <button
              className="btn btn-secondary"
              type="button"
              onClick={onVerMensagem}
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="btn-icon">
                <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
              </svg>
              Ver mensagem
            </button>
            {!isPast && (
              <button
                className="btn btn-primary"
                type="button"
                onClick={onAddParticipant}
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="btn-icon">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zM4 19.235v-.11a6.375 6.375 0 0112.75 0v.109A12.318 10.374 21c-2.331 0-4.512-.645-6.374-1.766z" />
                </svg>
                Adicionar participante
              </button>
            )}
          </div>

          {meetingErrorMsg && (
            <div className="meeting-error-badge">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="error-icon">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
              <span>{meetingErrorMsg}</span>
            </div>
          )}

          {showMeetLink && (
            <div className="meet-link-section">
              {selectedMeeting.meetLink ? (
                <div className="meet-link-container">
                  <a
                    href={selectedMeeting.meetLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="meet-link-url"
                  >
                    {selectedMeeting.meetLink}
                  </a>
                  <button
                    className={`btn-copy ${meetCopied ? 'copied' : ''}`}
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(selectedMeeting.meetLink)
                      setMeetCopied(true)
                    }}
                  >
                    {meetCopied ? 'Link copiado' : 'Copiar'}
                  </button>
                </div>
              ) : (
                <div className="meet-link-not-found">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="error-icon">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                  </svg>
                  <span>Link do Meet não encontrado</span>
                </div>
              )}
            </div>
          )}

          <div className="modal-participants-section">
            <h4 className="participants-section-title">
              Participantes ({selectedMeeting.participantsList.length})
            </h4>
            {selectedMeeting.participantsList.length > 0 ? (
              <div className="participants-list">
                {selectedMeeting.participantsList.map((participant) => (
                  <div key={participant.id} className={`participant-item-card ${!participant.statusAtivo ? 'cancelled' : ''}`}>
                    <div className="participant-item-header">
                      <div className="participant-item-identity">
                        <span className="participant-item-name">{participant.nome}</span>
                        {!participant.statusAtivo && (
                          <span className="cancelled-badge">Cancelado</span>
                        )}
                      </div>
                      <div className="participant-item-actions">
                        {participant.agencia && (
                          <span className="participant-item-agency">{participant.agencia}</span>
                        )}
                        {!isPast && (
                          <>
                            {participant.statusAtivo ? (
                              <>
                                <button
                                  type="button"
                                  className="btn-edit-participant"
                                  onClick={() => onEditParticipant(participant)}
                                >
                                  Editar
                                </button>
                                <button
                                  type="button"
                                  className="btn-reschedule-participant"
                                  onClick={() => onRescheduleParticipant(participant)}
                                >
                                  Remarcar
                                </button>
                                <button
                                  type="button"
                                  className="btn-cancel-participant"
                                  onClick={() => {
                                    if (window.confirm('Deseja realmente cancelar este participante?')) {
                                      onCancelParticipant(participant.id)
                                    }
                                  }}
                                >
                                  Cancelar
                                </button>
                              </>
                            ) : (
                              <button
                                type="button"
                                className="btn-reactivate-participant"
                                onClick={() => {
                                  if (window.confirm('Deseja realmente reativar este participante?')) {
                                    onReactivateParticipant(participant.id)
                                  }
                                }}
                              >
                                Reativar
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                    <div className="participant-item-details">
                      <span className="participant-item-phone">{participant.telefone}</span>
                      {participant.observacao && (
                        <p className="participant-item-obs">{participant.observacao}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="no-participants-message">Nenhum participante cadastrado</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
