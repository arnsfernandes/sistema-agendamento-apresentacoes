import React from 'react'

export default function DeletePresentationModal({ isOpen, onClose, onDelete, isDeleting }) {
  if (!isOpen) return null

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '400px' }}>
        <div className="modal-header">
          <h3 className="modal-title">Excluir apresentação recorrente</h3>
          <button className="btn-close" onClick={onClose} type="button" aria-label="Fechar" disabled={isDeleting}>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1.5rem 1rem' }}>
          <p style={{ margin: 0, fontSize: '0.95rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            Esta apresentação faz parte de uma série recorrente. Como deseja excluí-la?
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.5rem' }}>
            <button
              className="btn btn-secondary"
              type="button"
              onClick={() => onDelete('occurrence')}
              disabled={isDeleting}
              style={{ justifyContent: 'center', fontWeight: 600 }}
            >
              Somente esta ocorrência
            </button>
            <button
              className="btn btn-primary"
              type="button"
              onClick={() => onDelete('series')}
              disabled={isDeleting}
              style={{ justifyContent: 'center', fontWeight: 600, backgroundColor: 'var(--text-error)', borderColor: 'var(--text-error)' }}
            >
              Toda a série
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
