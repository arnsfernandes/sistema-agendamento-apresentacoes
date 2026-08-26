import { useState } from 'react'

export default function AddClientModal({ isOpen, onClose, onAddClient, hasActiveGoogleIntegration }) {
  const [nome, setNome] = useState('')
  const [telefone, setTelefone] = useState('')
  const [agencia, setAgencia] = useState('')
  const [errors, setErrors] = useState({})
  const [submitError, setSubmitError] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (!isOpen) return null

  const handleClose = () => {
    setNome('')
    setTelefone('')
    setAgencia('')
    setErrors({})
    setSubmitError(null)
    onClose()
  }

  const cleanPhone = (val) => val.replace(/\D/g, '')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setErrors({})
    setSubmitError(null)

    if (!nome.trim()) {
      setErrors(prev => ({ ...prev, nome: 'Nome é obrigatório.' }))
      return
    }

    const cleanTel = cleanPhone(telefone)
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
      await onAddClient({ nome, telefone: cleanTel, agencia })
      handleClose()
    } catch (err) {
      setSubmitError(err.message || 'Erro ao cadastrar o cliente.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="sub-modal-overlay" onClick={handleClose}>
      <div className="sub-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="sub-modal-header">
          <h4 className="sub-modal-title">Novo Cliente</h4>
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
          {hasActiveGoogleIntegration ? (
            <form className="participant-form" onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Nome <span className="required-marker">*</span></label>
                <input
                  type="text"
                  className={`form-input ${errors.nome ? 'has-error' : ''}`}
                  placeholder="Nome completo do cliente"
                  value={nome}
                  onChange={(e) => {
                    setNome(e.target.value)
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
                  value={telefone}
                  onChange={(e) => {
                    setTelefone(e.target.value)
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
                  value={agencia}
                  onChange={(e) => setAgencia(e.target.value)}
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
                  {isSubmitting ? 'Salvando...' : 'Cadastrar'}
                </button>
              </div>
            </form>
          ) : (
            <div style={{ textAlign: 'center', padding: '1rem 0' }}>
              <div className="form-error-msg submit-error" style={{ marginBottom: '1.5rem', fontWeight: '500', fontSize: '0.9rem', color: 'var(--text-error)' }}>
                Integração Google inativa. Ative sua conta Google nas Configurações para cadastrar clientes.
              </div>
              <button
                className="btn btn-primary"
                onClick={handleClose}
                type="button"
              >
                Entendi
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
