import { useState } from 'react'

export default function AddParticipantModal({ isOpen, selectedMeeting, onClose, onAdd }) {
  if (!isOpen || !selectedMeeting) return null

  const [nome, setNome] = useState('')
  const [telefone, setTelefone] = useState('')
  const [agencia, setAgencia] = useState('')
  const [observacao, setObservacao] = useState('')
  const [errors, setErrors] = useState({})

  const handleClose = () => {
    setNome('')
    setTelefone('')
    setAgencia('')
    setObservacao('')
    setErrors({})
    onClose()
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    const newErrors = {}

    if (!nome.trim()) {
      newErrors.nome = 'Nome é obrigatório'
    }

    const cleanTel = telefone.replace(/\D/g, '')
    if (!cleanTel) {
      newErrors.telefone = 'Telefone é obrigatório'
    } else if (cleanTel.length !== 10 && cleanTel.length !== 11) {
      newErrors.telefone = 'Telefone deve conter 10 ou 11 dígitos'
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    onAdd({
      nome: nome.trim(),
      telefone: cleanTel,
      agencia: agencia.trim(),
      observacao: observacao.trim()
    })

    // Reset form fields
    setNome('')
    setTelefone('')
    setAgencia('')
    setObservacao('')
    setErrors({})
  }

  return (
    <div className="sub-modal-overlay" onClick={handleClose}>
      <div className="sub-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="sub-modal-header">
          <h4 className="sub-modal-title">Adicionar Participante</h4>
          <button
            className="btn-close"
            onClick={handleClose}
            type="button"
            aria-label="Fechar formulário"
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
              />
              {errors.nome && <span className="form-error-msg">{errors.nome}</span>}
            </div>

            <div className="form-group">
              <label className="form-label">Telefone <span className="required-marker">*</span></label>
              <input
                type="tel"
                className={`form-input ${errors.telefone ? 'has-error' : ''}`}
                placeholder="(00) 00000-0000"
                value={telefone}
                onChange={(e) => {
                  setTelefone(e.target.value)
                  if (errors.telefone) setErrors(prev => ({ ...prev, telefone: null }))
                }}
              />
              {errors.telefone && <span className="form-error-msg">{errors.telefone}</span>}
            </div>

            <div className="form-group">
              <label className="form-label">Agência</label>
              <input
                type="text"
                className="form-input"
                placeholder="Agência vinculada (opcional)"
                value={agencia}
                onChange={(e) => setAgencia(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Observação</label>
              <textarea
                className="form-input form-textarea"
                placeholder="Observações adicionais (opcional)"
                value={observacao}
                onChange={(e) => setObservacao(e.target.value)}
              />
            </div>
            
            <div className="form-actions">
              <button
                className="btn btn-secondary"
                type="button"
                onClick={handleClose}
              >
                Cancelar
              </button>
              <button
                className="btn btn-primary"
                type="submit"
              >
                Adicionar
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
