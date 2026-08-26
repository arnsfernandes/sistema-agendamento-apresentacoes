import { useState, useEffect } from 'react'

export default function AddParticipantModal({ isOpen, selectedMeeting, editingParticipant, onClose, onAdd, onFindClient }) {
  const [nome, setNome] = useState('')
  const [telefone, setTelefone] = useState('')
  const [agencia, setAgencia] = useState('')
  const [observacao, setObservacao] = useState('')
  const [errors, setErrors] = useState({})
  const [foundClient, setFoundClient] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState(null)

  useEffect(() => {
    if (!isOpen || !selectedMeeting) return
    if (editingParticipant) {
      setNome(editingParticipant.nome)
      setTelefone(editingParticipant.telefone)
      setAgencia(editingParticipant.agencia || '')
      setObservacao(editingParticipant.observacao || '')
    } else {
      setNome('')
      setTelefone('')
      setAgencia('')
      setObservacao('')
    }
    setErrors({})
    setFoundClient(null)
    setIsSubmitting(false)
    setSubmitError(null)
  }, [editingParticipant, isOpen, selectedMeeting])

  const handleClose = () => {
    setNome('')
    setTelefone('')
    setAgencia('')
    setObservacao('')
    setErrors({})
    setFoundClient(null)
    setIsSubmitting(false)
    setSubmitError(null)
    onClose()
  }

  const handlePhoneChange = async (val) => {
    setTelefone(val)
    const cleanTel = val.replace(/\D/g, '')

    // Clear previous error
    setErrors(prev => ({ ...prev, telefone: null }))

    if (!cleanTel) {
      setFoundClient(null)
      return
    }

    // Check duplicate in current meeting (exclude the participant currently being edited)
    const isDuplicate = selectedMeeting.participantsList.some(
      p => p.telefone === cleanTel && (!editingParticipant || p.id !== editingParticipant.id)
    )
    if (isDuplicate) {
      setErrors(prev => ({ ...prev, telefone: 'Este cliente já está cadastrado nesta reunião.' }))
      setFoundClient(null)
      return
    }

    if (cleanTel.length === 10 || cleanTel.length === 11) {
      try {
        const found = await onFindClient(cleanTel)
        if (found) {
          setFoundClient(found)
        } else {
          setFoundClient(null)
        }
      } catch {
        setFoundClient(null)
      }
    } else {
      setFoundClient(null)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (isSubmitting) return
    const newErrors = {}

    if (!nome.trim()) {
      newErrors.nome = 'Nome é obrigatório'
    }

    const cleanTel = telefone.replace(/\D/g, '')
    if (!cleanTel) {
      newErrors.telefone = 'Telefone é obrigatório'
    } else if (cleanTel.length !== 10 && cleanTel.length !== 11) {
      newErrors.telefone = 'Telefone deve conter 10 ou 11 dígitos'
    } else {
      // Final check for duplicates (exclude the participant currently being edited)
      const isDuplicate = selectedMeeting.participantsList.some(
        p => p.telefone === cleanTel && (!editingParticipant || p.id !== editingParticipant.id)
      )
      if (isDuplicate) {
        newErrors.telefone = 'Este cliente já está cadastrado nesta reunião.'
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    setSubmitError(null)
    setIsSubmitting(true)

    try {
      await onAdd({
        nome: nome.trim(),
        telefone: cleanTel,
        agencia: agencia.trim(),
        observacao: observacao.trim()
      })

      // Reset form fields only on success
      setNome('')
      setTelefone('')
      setAgencia('')
      setObservacao('')
      setErrors({})
      setFoundClient(null)
    } catch (err) {
      setSubmitError(err.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen || !selectedMeeting) return null

  return (
    <div className="sub-modal-overlay" onClick={handleClose}>
      <div className="sub-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="sub-modal-header">
          <h4 className="sub-modal-title">
            {editingParticipant ? 'Editar Participante' : 'Adicionar Participante'}
          </h4>
          <button
            className="btn-close"
            onClick={handleClose}
            type="button"
            aria-label="Fechar formulário"
            disabled={isSubmitting}
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="sub-modal-body">
          <form className="participant-form" onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Reunião</label>
              <input
                type="text"
                className="form-input"
                value={selectedMeeting.title}
                disabled
              />
            </div>
            
            <div className="form-group">
              <label className="form-label">Telefone <span className="required-marker">*</span></label>
              <input
                type="tel"
                className={`form-input ${errors.telefone ? 'has-error' : ''}`}
                placeholder="(00) 00000-0000"
                value={telefone}
                onChange={(e) => handlePhoneChange(e.target.value)}
                disabled={isSubmitting}
              />
              {errors.telefone && <span className="form-error-msg">{errors.telefone}</span>}

              {foundClient && (
                <div className="found-client-tip">
                  <div className="found-client-info">
                    <span>Cliente encontrado: <strong>{foundClient.nome}</strong>{foundClient.agencia ? ` (${foundClient.agencia})` : ''}</span>
                  </div>
                  <button
                    type="button"
                    className="btn-use-client"
                    onClick={() => {
                      setNome(foundClient.nome)
                      if (foundClient.agencia) {
                        setAgencia(foundClient.agencia)
                      }
                      setFoundClient(null)
                    }}
                    disabled={isSubmitting}
                  >
                    Usar este cliente
                  </button>
                </div>
              )}
            </div>

            <div className="form-group">
              <label className="form-label">Nome <span className="required-marker">*</span></label>
              <input
                type="text"
                className={`form-input ${errors.nome ? 'has-error' : ''}`}
                placeholder="Nome completo do participante"
                value={nome}
                onChange={(e) => {
                  setNome(e.target.value)
                  if (errors.nome) setErrors(prev => ({ ...prev, nome: null }))
                }}
                disabled={isSubmitting}
              />
              {errors.nome && <span className="form-error-msg">{errors.nome}</span>}
            </div>

            <div className="form-group">
              <label className="form-label">Agência</label>
              <input
                type="text"
                className="form-input"
                placeholder="Agência vinculada (opcional)"
                value={agencia}
                onChange={(e) => setAgencia(e.target.value)}
                disabled={isSubmitting}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Observação</label>
              <textarea
                className="form-input form-textarea"
                placeholder="Observações adicionais (opcional)"
                value={observacao}
                onChange={(e) => setObservacao(e.target.value)}
                disabled={isSubmitting}
              />
            </div>
            
            {submitError && (
              <div className="form-error-msg submit-error" style={{ marginBottom: '1rem', textAlign: 'center', fontWeight: '500' }}>
                {submitError}
              </div>
            )}

            <div className="form-actions">
              <button
                className="btn btn-secondary"
                type="button"
                onClick={handleClose}
                disabled={isSubmitting}
              >
                Cancelar
              </button>
              <button
                className="btn btn-primary"
                type="submit"
                disabled={isSubmitting || (!!errors.telefone && errors.telefone.includes('já está cadastrado'))}
              >
                {isSubmitting ? 'Salvando...' : (editingParticipant ? 'Salvar' : 'Adicionar')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
