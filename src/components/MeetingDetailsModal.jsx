import { isPresentationPast, hasPresentationStarted } from '../utils/dateUtils'

export default function MeetingDetailsModal({
  selectedMeeting,
  formattedMeetingDate,
  onClose,
  showMeetLink,
  setShowMeetLink,
  meetCopied,
  setMeetCopied,
  onVerMensagem,
  onEditPresentation,
  onDeletePresentation,
  isDeletingPresentation,
  onAddParticipant,
  onEditParticipant,
  onCancelParticipant,
  onReactivateParticipant,
  onRescheduleParticipant,
  meetingErrorMsg,
  onFixSchedule,
  isFixingSchedule,
}) {
  if (!selectedMeeting) return null

  const isPast = isPresentationPast(selectedMeeting)
  const hasStarted = hasPresentationStarted(selectedMeeting)
  const isGoogleDeleted = selectedMeeting.syncStatus === 'google_deleted'
  const isPending = selectedMeeting.syncStatus === 'pending'

  return (
    <div className="modal-overlay" onClick={() => { if (!isDeletingPresentation) onClose(); }}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">Detalhes da Reunião</h3>
          <button
            className="btn-close"
            onClick={onClose}
            type="button"
            aria-label="Fechar modal"
            disabled={isDeletingPresentation}
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
              <span>{selectedMeeting.time}{selectedMeeting.timeEnd ? ` - ${selectedMeeting.timeEnd}` : ''}</span>
            </div>
          </div>

          {isGoogleDeleted && (
            <div className="meeting-error-badge">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="error-icon">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
              <span>Excluída no Google Agenda</span>
              {selectedMeeting.syncError && (
                <span style={{ display: 'block', marginTop: '4px', fontSize: '0.82em', opacity: 0.85 }}>
                  {selectedMeeting.syncError}
                </span>
              )}
            </div>
          )}

          {isPending && (
            <div className="meeting-error-badge warning" style={{ borderColor: 'var(--warning-border, #eab308)', backgroundColor: 'var(--warning-bg, rgba(234, 179, 8, 0.1))', display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'flex-start' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="error-icon" style={{ color: '#eab308' }}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                </svg>
                <span style={{ color: '#eab308', fontWeight: 600 }}>Ação necessária</span>
              </div>
              {selectedMeeting.syncError && (
                <span style={{ display: 'block', fontSize: '0.88em', opacity: 0.9, color: 'var(--text-primary)' }}>
                  {selectedMeeting.syncError.includes('meia-noite')
                    ? 'A reunião atravessa a meia-noite. Corrija o horário para continuar.'
                    : selectedMeeting.syncError}
                </span>
              )}
              {selectedMeeting.syncError?.includes('meia-noite') && (
                <button
                  type="button"
                  className="btn btn-warning-light"
                  style={{ marginTop: '0.25rem', padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}
                  onClick={() => onFixSchedule(selectedMeeting.id)}
                  disabled={isFixingSchedule}
                >
                  {isFixingSchedule ? 'Carregando...' : 'Corrigir horário'}
                </button>
              )}
            </div>
          )}

          <div className="modal-actions">
            {!isGoogleDeleted && !isPending && (
              <button
                className="btn btn-secondary"
                type="button"
                onClick={() => setShowMeetLink(true)}
                disabled={isDeletingPresentation}
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="btn-icon">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
                </svg>
                Ver link do Meet
              </button>
            )}
            {!isPending && (
              <button
                className="btn btn-secondary"
                type="button"
                onClick={onVerMensagem}
                disabled={isDeletingPresentation}
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="btn-icon">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
                </svg>
                Ver mensagem
              </button>
            )}
            {!isPending && !hasStarted && (
              <button
                className="btn btn-secondary"
                type="button"
                onClick={onEditPresentation}
                disabled={isDeletingPresentation || isGoogleDeleted}
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="btn-icon">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                </svg>
                Editar apresentação
              </button>
            )}
            {!hasStarted && (
              <button
                className="btn btn-secondary"
                type="button"
                onClick={() => onDeletePresentation(selectedMeeting.id)}
                disabled={isDeletingPresentation || isGoogleDeleted}
                style={{ color: 'var(--text-error)' }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="btn-icon">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                </svg>
                {isDeletingPresentation ? 'Excluindo...' : 'Excluir apresentação'}
              </button>
            )}
            {!isPast && !isPending && (
              <button
                className="btn btn-primary"
                type="button"
                onClick={onAddParticipant}
                disabled={isDeletingPresentation}
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="btn-icon">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zM4 19.235v-.11a6.375 6.375 0 0112.75 0v.109A12.318 10.374 21c-2.331 0-4.512-.645-6.374-1.766z" />
                </svg>
                Adicionar participante
              </button>
            )}
          </div>

          {!isGoogleDeleted && meetingErrorMsg && (
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
