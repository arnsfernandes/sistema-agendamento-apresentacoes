import { useState, useCallback } from 'react'

export default function useMessages() {
  const [customMessages, setCustomMessages] = useState({})
  const [showMessageModal, setShowMessageModal] = useState(false)
  const [messageCopied, setMessageCopied] = useState(false)

  const getDefaultMessage = useCallback((meeting, formattedDate) => {
    if (!meeting) return ''
    const timeWithoutSeconds = meeting.time ? meeting.time.slice(0, 5) : ''
    return `Olá! 😊 Passando para confirmar nossa reunião no dia ${formattedDate}, às ${timeWithoutSeconds}. Link do Meet: ${meeting.meetLink || ''}`
  }, [])

  const resetMessages = useCallback(() => {
    setShowMessageModal(false)
    setMessageCopied(false)
  }, [])

  return {
    customMessages,
    setCustomMessages,
    showMessageModal,
    setShowMessageModal,
    messageCopied,
    setMessageCopied,
    getDefaultMessage,
    resetMessages
  }
}
