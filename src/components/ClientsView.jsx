import { useState } from 'react'

export default function ClientsView({
  clients,
  meetings,
  onAddClient,
  onUpdateClient,
  onDeleteClient,
  hasActiveGoogleIntegration
}) {
  const [searchTerm, setSearchTerm] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [nome, setNome] = useState('')
  const [telefone, setTelefone] = useState('')
  const [agencia, setAgencia] = useState('')
  const [errors, setErrors] = useState({})
  const [submitError, setSubmitError] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Edit Ficha state
  const [selectedViewClient, setSelectedViewClient] = useState(null)
  const [editNome, setEditNome] = useState('')
  const [editTelefone, setEditTelefone] = useState('')
  const [editAgencia, setEditAgencia] = useState('')

  const handleOpenModal = () => {
    setErrors({})
    setSubmitError(null)
    if (!hasActiveGoogleIntegration) {
      setSubmitError('Integração Google inativa. Ative sua conta Google nas Configurações para cadastrar clientes.')
    }
    setIsModalOpen(true)
  }

  const handleClose = () => {
    setNome('')
    setTelefone('')
    setAgencia('')
    setErrors({})
    setSubmitError(null)
    setIsModalOpen(false)
  }

  const handleOpenFicha = (client) => {
    setSelectedViewClient(client)
    setEditNome(client.nome)
    setEditTelefone(client.telefone)
    setEditAgencia(client.agencia || '')
    setErrors({})
    setSubmitError(null)
  }

  const handleCloseFicha = () => {
    setSelectedViewClient(null)
    setEditNome('')
    setEditTelefone('')
    setEditAgencia('')
    setErrors({})
    setSubmitError(null)
  }

  const formatDateStr = (dateStr) => {
    if (!dateStr) return ''
    const parts = dateStr.split('-')
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`
    }
    return dateStr
  }

  const getNextMeeting = (clientId) => {
    if (!meetings || !clientId) return null
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const clientFutureMeetings = meetings.filter(meeting => {
      const meetingDate = new Date(meeting.date + 'T00:00:00')
      const isFuture = meetingDate >= today
      const hasParticipant = meeting.participantsList.some(p => p.clienteId === clientId && p.statusAtivo !== false)
      return isFuture && hasParticipant
    })
    if (clientFutureMeetings.length === 0) return null
    clientFutureMeetings.sort((a, b) => {
      const dateDiff = new Date(a.date + 'T00:00:00') - new Date(b.date + 'T00:00:00')
      if (dateDiff !== 0) return dateDiff
      return a.time.localeCompare(b.time)
    })
    return clientFutureMeetings[0]
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

  const handleSaveEdit = async (e) => {
    e.preventDefault()
    setErrors({})
    setSubmitError(null)

    if (!editNome.trim()) {
      setErrors(prev => ({ ...prev, nome: 'Nome é obrigatório.' }))
      return
    }

    const cleanTel = cleanPhone(editTelefone)
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
      await onUpdateClient(selectedViewClient.id, {
        nome: editNome,
        telefone: cleanTel,
        agencia: editAgencia
      })
      handleCloseFicha()
    } catch (err) {
      setSubmitError(err.message || 'Erro ao atualizar o cliente.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteClick = async () => {
    const nextMeeting = getNextMeeting(selectedViewClient.id)
    if (nextMeeting) {
      setSubmitError('Este cliente possui reuniões futuras. Remova-o dessas reuniões antes de excluir.')
      return
    }

    const confirmed = window.confirm(`Deseja realmente excluir permanentemente o cliente "${selectedViewClient.nome}"? Esta ação não pode ser desfeita.`)
    if (!confirmed) return

    setIsSubmitting(true)
    setSubmitError(null)
    try {
      await onDeleteClient(selectedViewClient.id)
      handleCloseFicha()
    } catch (err) {
      setSubmitError(err.message || 'Erro ao excluir o cliente.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const filteredClients = (clients || []).filter((client) => {
    const term = searchTerm.toLowerCase()
    return (
      client.nome.toLowerCase().includes(term) ||
      client.telefone.replace(/\D/g, '').includes(term) ||
      (client.agencia || '').toLowerCase().includes(term)
    )
  })

  return (
    <div className="view-container">
      <div className="view-header">
        <h1 className="view-title">Clientes</h1>
        <p className="view-description">Lista de clientes e contatos comerciais consolidados a partir dos agendamentos.</p>
      </div>

      <div className="client-search-wrapper" style={{ display: 'flex', gap: '1rem', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
        <div className="search-input-container" style={{ flexGrow: 1, maxWidth: '500px', margin: 0 }}>
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="search-icon">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.637 10.637z" />
          </svg>
          <input
            type="text"
            className="client-search-input"
            placeholder="Pesquisar por nome, telefone ou agência..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <button
          type="button"
          className="btn btn-primary"
          onClick={handleOpenModal}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" style={{ width: '16px', height: '16px' }}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Novo cliente
        </button>
      </div>

      <div className="clients-table-container">
        {filteredClients.length > 0 ? (
          <table className="clients-table">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Telefone</th>
                <th>Agência</th>
              </tr>
            </thead>
            <tbody>
              {filteredClients.map((client) => (
                <tr
                  key={client.id || client.telefone}
                  onClick={() => handleOpenFicha(client)}
                  style={{ cursor: 'pointer' }}
                >
                  <td>
                    <span className="client-table-name">{client.nome}</span>
                  </td>
                  <td>
                    <span className="client-table-phone">{client.telefone}</span>
                  </td>
                  <td>
                    {client.agencia ? (
                      <span className="client-table-agency">{client.agencia}</span>
                    ) : (
                      <span className="client-table-agency-empty">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="no-clients-found">
            <p>Nenhum cliente encontrado para os termos da busca.</p>
          </div>
        )}
      </div>

      {/* Modal Novo Cliente */}
      {isModalOpen && (
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
                    {submitError}
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
      )}

      {/* Modal Ficha do Cliente (Visualização e Edição) */}
      {selectedViewClient && (
        <div className="sub-modal-overlay" onClick={handleCloseFicha}>
          <div className="sub-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="sub-modal-header">
              <h4 className="sub-modal-title">Ficha do Cliente</h4>
              <button
                className="btn-close"
                onClick={handleCloseFicha}
                type="button"
                aria-label="Fechar ficha"
                disabled={isSubmitting}
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="sub-modal-body">
              <form className="participant-form" onSubmit={handleSaveEdit}>
                <div className="form-group">
                  <label className="form-label">Nome <span className="required-marker">*</span></label>
                  <input
                    type="text"
                    className={`form-input ${errors.nome ? 'has-error' : ''}`}
                    placeholder="Nome completo do cliente"
                    value={editNome}
                    onChange={(e) => {
                      setEditNome(e.target.value)
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
                    value={editTelefone}
                    onChange={(e) => {
                      setEditTelefone(e.target.value)
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
                    value={editAgencia}
                    onChange={(e) => setEditAgencia(e.target.value)}
                    disabled={isSubmitting}
                  />
                </div>

                {(() => {
                  const nextMeeting = getNextMeeting(selectedViewClient.id)
                  return (
                    <div className="form-group" style={{ marginTop: '1.5rem', borderTop: '1px solid var(--border-color)', paddingTop: '1.25rem' }}>
                      <label className="form-label" style={{ fontWeight: '600', color: 'var(--text-primary)', marginBottom: '0.75rem' }}>Próxima Reunião</label>
                      {nextMeeting ? (
                        <div style={{
                          background: 'var(--bg-secondary)',
                          border: '1px solid var(--border-color)',
                          borderRadius: '8px',
                          padding: '0.88rem 1rem',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '0.35rem'
                        }}>
                          <span style={{ fontWeight: '600', fontSize: '0.92rem', color: 'var(--text-primary)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                            {nextMeeting.title}
                          </span>
                          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" style={{ width: '14px', height: '14px', flexShrink: 0 }}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                            </svg>
                            {formatDateStr(nextMeeting.date)} às {nextMeeting.time}
                          </span>
                        </div>
                      ) : (
                        <span style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                          Nenhuma reunião futura
                        </span>
                      )}
                    </div>
                  )
                })()}

                {submitError && (
                  <div className="form-error-msg submit-error" style={{ marginBottom: '1rem', textAlign: 'center', fontWeight: '500' }}>
                    {submitError}
                  </div>
                )}

                <div className="form-actions" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <button
                    className="btn btn-secondary"
                    type="button"
                    onClick={handleDeleteClick}
                    disabled={isSubmitting}
                    style={{ color: 'var(--text-error)', border: '1px solid var(--text-error)', background: 'transparent' }}
                  >
                    Excluir
                  </button>
                  <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <button
                      className="btn btn-secondary"
                      onClick={handleCloseFicha}
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
                      {isSubmitting ? 'Salvando...' : 'Salvar'}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
