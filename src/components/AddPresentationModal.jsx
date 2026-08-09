import { useState, useEffect, useRef } from 'react'

const DAYS_OF_WEEK = [
  { value: 'MO', label: 'S' },
  { value: 'TU', label: 'T' },
  { value: 'WE', label: 'Q' },
  { value: 'TH', label: 'Q' },
  { value: 'FR', label: 'S' },
  { value: 'SA', label: 'S' },
  { value: 'SU', label: 'D' }
]

export default function AddPresentationModal({ isOpen, onClose, onCreate, initialDate }) {
  const [title, setTitle] = useState('')
  const [date, setDate] = useState('')
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [isRecurring, setIsRecurring] = useState(false)
  const [recurringDays, setRecurringDays] = useState([])
  const [recurrenceEndOption, setRecurrenceEndOption] = useState('never')
  const [recurrenceEndDate, setRecurrenceEndDate] = useState('')
  const [errors, setErrors] = useState({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState(null)
  // Evita resetar campos se initialDate mudar com o modal já aberto
  const prevOpenRef = useRef(false)

  useEffect(() => {
    if (isOpen && !prevOpenRef.current) {
      setTitle('')
      setDate(initialDate || '')
      setStartTime('')
      setEndTime('')
      setIsRecurring(false)
      setRecurringDays([])
      setRecurrenceEndOption('never')
      setRecurrenceEndDate('')
      setErrors({})
      setIsSubmitting(false)
      setSubmitError(null)
    }
    prevOpenRef.current = isOpen
  }, [isOpen, initialDate])

  const handleClose = () => {
    setTitle('')
    setDate('')
    setStartTime('')
    setEndTime('')
    setIsRecurring(false)
    setRecurringDays([])
    setRecurrenceEndOption('never')
    setRecurrenceEndDate('')
    setErrors({})
    setIsSubmitting(false)
    setSubmitError(null)
    onClose()
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (isSubmitting) return

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

    if (isRecurring) {
      if (recurringDays.length === 0) {
        newErrors.recurringDays = 'Selecione pelo menos um dia da semana.'
      }
      if (recurrenceEndOption === 'date') {
        if (!recurrenceEndDate) {
          newErrors.recurrenceEndDate = 'A data de término é obrigatória.'
        } else if (date && recurrenceEndDate <= date) {
          newErrors.recurrenceEndDate = 'A data de término deve ser posterior à data inicial.'
        }
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    setSubmitError(null)
    setIsSubmitting(true)

    try {
      await onCreate({
        title: title.trim(),
        date,
        startTime,
        endTime,
        isRecurring,
        recurringDays,
        recurrenceEndOption,
        recurrenceEndDate: recurrenceEndOption === 'date' ? recurrenceEndDate : null
      })
      handleClose()
    } catch (err) {
      setSubmitError(err.message || 'Não foi possível criar a apresentação.')
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
          <h3 className="modal-title">Nova Apresentação Comercial</h3>
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

          <div className="recurring-checkbox-container">
            <input
              type="checkbox"
              id="isRecurring"
              checked={isRecurring}
              onChange={(e) => setIsRecurring(e.target.checked)}
              disabled={isSubmitting}
            />
            <label htmlFor="isRecurring" className="form-label" style={{ margin: 0, cursor: 'pointer', fontWeight: 500 }}>
              Reunião recorrente
            </label>
          </div>

          {isRecurring && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', padding: '1rem', border: '1px solid var(--border-color)', borderRadius: '12px', background: 'rgba(255,255,255,0.02)' }}>
              <div className="form-group">
                <label className="form-label">Repetir nos dias da semana *</label>
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem' }}>
                  {DAYS_OF_WEEK.map(day => {
                    const isSelected = recurringDays.includes(day.value)
                    return (
                      <button
                        key={day.value}
                        type="button"
                        onClick={() => {
                          setRecurringDays(prev => 
                            prev.includes(day.value) 
                              ? prev.filter(d => d !== day.value)
                              : [...prev, day.value]
                          )
                          setErrors(prev => ({ ...prev, recurringDays: null }))
                        }}
                        style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '50%',
                          border: '1px solid ' + (isSelected ? 'var(--text-accent)' : 'var(--border-color)'),
                          background: isSelected ? 'var(--accent-glow)' : 'transparent',
                          color: isSelected ? 'var(--text-accent)' : 'var(--text-secondary)',
                          fontWeight: '600',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          transition: 'all 0.2s ease'
                        }}
                        disabled={isSubmitting}
                      >
                        {day.label}
                      </button>
                    )
                  })}
                </div>
                {errors.recurringDays && <span className="form-error-msg">{errors.recurringDays}</span>}
              </div>

              <div className="form-group">
                <label className="form-label">Término da recorrência</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.25rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                    <input
                      type="radio"
                      name="recurrenceEndOption"
                      value="never"
                      checked={recurrenceEndOption === 'never'}
                      onChange={() => setRecurrenceEndOption('never')}
                      disabled={isSubmitting}
                      style={{ width: 'auto' }}
                    />
                    Sem data para terminar
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                    <input
                      type="radio"
                      name="recurrenceEndOption"
                      value="date"
                      checked={recurrenceEndOption === 'date'}
                      onChange={() => setRecurrenceEndOption('date')}
                      disabled={isSubmitting}
                      style={{ width: 'auto' }}
                    />
                    Termina em uma data
                  </label>
                </div>
              </div>

              {recurrenceEndOption === 'date' && (
                <div className="form-group">
                  <label className="form-label">Data de Término *</label>
                  <input
                    type="date"
                    className={`form-input ${errors.recurrenceEndDate ? 'error' : ''}`}
                    value={recurrenceEndDate}
                    onChange={(e) => {
                      setRecurrenceEndDate(e.target.value)
                      setErrors(prev => ({ ...prev, recurrenceEndDate: null }))
                    }}
                    disabled={isSubmitting}
                  />
                  {errors.recurrenceEndDate && <span className="form-error-msg">{errors.recurrenceEndDate}</span>}
                </div>
              )}
            </div>
          )}

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
              {isSubmitting ? 'Criando...' : 'Criar Apresentação'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
