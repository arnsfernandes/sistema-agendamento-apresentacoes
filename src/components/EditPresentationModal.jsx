import { useState, useEffect, useRef } from 'react'

export default function EditPresentationModal({
  isOpen,
  onClose,
  onSave,
  presentation,
}) {
  const [title, setTitle] = useState('')
  const [date, setDate] = useState('')
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [errors, setErrors] = useState({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState(null)

  // Evita resetar campos se presentation mudar com o modal já aberto
  const prevOpenRef = useRef(false)

  useEffect(() => {
    if (isOpen && !prevOpenRef.current) {
      setTitle(presentation?.title || '')
      setDate(presentation?.date || '')
      setStartTime(presentation?.time ? presentation.time.slice(0, 5) : '')
      setEndTime(presentation?.timeEnd ? presentation.timeEnd.slice(0, 5) : '')
      setErrors({})
      setIsSubmitting(false)
      setSubmitError(null)
    }
    prevOpenRef.current = isOpen
  }, [isOpen, presentation])

  const handleClose = () => {
    setTitle('')
    setDate('')
    setStartTime('')
    setEndTime('')
    setErrors({})
    setIsSubmitting(false)
    setSubmitError(null)
    onClose()
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (isSubmitting) return

    if (!presentation || !presentation.id) {
      setSubmitError('Apresentação inválida para edição.')
      return
    }

    const newErrors = {}

    if (!title.trim()) {
      newErrors.title = 'O título é obrigatório.'
    } else if (title.length > 80) {
      newErrors.title = 'O título deve ter no máximo 80 caracteres.'
    }

    if (!date) {
      newErrors.date = 'A data é obrigatória.'
    }

    if (!startTime) {
      newErrors.startTime = 'O horário inicial é obrigatório.'
    }

    if (!endTime) {
      newErrors.endTime = 'O horário final é obrigatório.'
    }

    if (startTime && endTime && endTime <= startTime) {
      newErrors.endTime = 'O horário final deve ser posterior ao horário inicial.'
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    setSubmitError(null)
    setIsSubmitting(true)

    try {
      await onSave({
        presentationId: presentation.id,
        title: title.trim(),
        date,
        startTime,
        endTime,
        etag: presentation.etag || null
      })
      handleClose()
    } catch (err) {
      setSubmitError(err.message || 'Não foi possível salvar as alterações.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleOverlayClick = () => {
    if (isSubmitting) return
    handleClose()
  }

  if (!isOpen) return null

  return (
    <div className="modal-overlay" onClick={handleOverlayClick}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">Editar Apresentação Comercial</h3>
          <button
            className="btn-close"
            onClick={handleClose}
            type="button"
            aria-label="Fechar modal"
            disabled={isSubmitting}
          >
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {submitError && (
            <div className="meeting-error-badge" style={{ marginTop: 0 }}>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="error-icon">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span>{submitError}</span>
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Título da Apresentação *</label>
            <input
              type="text"
              className={`form-input ${errors.title ? 'error' : ''}`}
              placeholder="Ex: Apresentação VetCare Premium"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value)
                setErrors(prev => ({ ...prev, title: null }))
              }}
              maxLength={80}
              disabled={isSubmitting}
            />
            {errors.title && <span className="form-error-msg">{errors.title}</span>}
          </div>

          <div className="form-group">
            <label className="form-label">Data *</label>
            <input
              type="date"
              className={`form-input ${errors.date ? 'error' : ''}`}
              value={date}
              onChange={(e) => {
                setDate(e.target.value)
                setErrors(prev => ({ ...prev, date: null }))
              }}
              disabled={isSubmitting}
            />
            {errors.date && <span className="form-error-msg">{errors.date}</span>}
          </div>

          <div style={{ display: 'flex', gap: '1rem' }}>
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">Horário Inicial *</label>
              <input
                type="time"
                className={`form-input ${errors.startTime ? 'error' : ''}`}
                value={startTime}
                onChange={(e) => {
                  setStartTime(e.target.value)
                  setErrors(prev => ({ ...prev, startTime: null }))
                }}
                disabled={isSubmitting}
              />
              {errors.startTime && <span className="form-error-msg">{errors.startTime}</span>}
            </div>

            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">Horário Final *</label>
              <input
                type="time"
                className={`form-input ${errors.endTime ? 'error' : ''}`}
                value={endTime}
                onChange={(e) => {
                  setEndTime(e.target.value)
                  setErrors(prev => ({ ...prev, endTime: null }))
                }}
                disabled={isSubmitting}
              />
              {errors.endTime && <span className="form-error-msg">{errors.endTime}</span>}
            </div>
          </div>

          <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Salvando...' : 'Salvar Alterações'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
