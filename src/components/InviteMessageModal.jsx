export default function InviteMessageModal({
  isOpen,
  onClose,
  selectedMeeting,
  customMessages,
  setCustomMessages,
  messageCopied,
  setMessageCopied,
  getDefaultMessage,
  formattedMeetingDate
}) {
  if (!isOpen || !selectedMeeting) return null

  const handleClose = () => {
    onClose()
  }

  const messageText = customMessages[selectedMeeting.id] !== undefined
    ? customMessages[selectedMeeting.id]
    : getDefaultMessage(selectedMeeting, formattedMeetingDate)

  const handleTextChange = (e) => {
    const val = e.target.value
    setCustomMessages((prev) => ({
      ...prev,
      [selectedMeeting.id]: val
    }))
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(messageText)
    setMessageCopied(true)
  }

  return (
    <div className="sub-modal-overlay" onClick={handleClose}>
      <div className="sub-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="sub-modal-header">
          <h4 className="sub-modal-title">Mensagem de Convite</h4>
          <button
            className="btn-close"
            onClick={handleClose}
            type="button"
            aria-label="Fechar modal de mensagem"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="sub-modal-body">
          <textarea
            className="message-textarea"
            value={messageText}
            onChange={handleTextChange}
          />
          
          <button
            className={`btn btn-primary ${messageCopied ? 'copied' : ''}`}
            type="button"
            onClick={handleCopy}
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="btn-icon">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            {messageCopied ? 'Mensagem copiada' : 'Copiar mensagem'}
          </button>
        </div>
      </div>
    </div>
  )
}
