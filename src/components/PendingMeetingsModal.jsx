export default function PendingMeetingsModal({
  isOpen,
  onClose,
  meetings,
  setSelectedMeetingId,
  setShowPendingList
}) {
  if (!isOpen) return null

  const pendingMeetings = meetings.filter(m => m.syncStatus === 'pending')

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card pending-list-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">Reuniões com pendências</h3>
          <button
            className="btn-close"
            onClick={onClose}
            type="button"
            aria-label="Fechar"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
          {pendingMeetings.length === 0 ? (
            <p>Nenhuma pendência encontrada.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {pendingMeetings.map((meeting) => {
                const [y, mon, d] = meeting.date.split('-').map(Number)
                const formattedDate = new Date(y, mon - 1, d).toLocaleDateString('pt-BR', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric'
                })
                return (
                  <div key={meeting.id} className="pending-item-card-detail" style={{
                    padding: '1rem',
                    border: '1px solid rgba(234, 179, 8, 0.3)',
                    borderRadius: '8px',
                    backgroundColor: 'rgba(234, 179, 8, 0.02)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.5rem'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>{meeting.title}</h4>
                      <span style={{ fontSize: '0.75rem', backgroundColor: 'rgba(234, 179, 8, 0.1)', color: '#eab308', padding: '0.2rem 0.5rem', borderRadius: '4px', fontWeight: 600 }}>
                        {formattedDate} às {meeting.time}
                      </span>
                    </div>
                    <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                      <strong>Erro:</strong> {meeting.syncError}
                    </p>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      style={{ alignSelf: 'flex-end', marginTop: '0.25rem' }}
                      onClick={() => {
                        setSelectedMeetingId(meeting.id)
                        setShowPendingList(false)
                      }}
                    >
                      Ver reunião
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
