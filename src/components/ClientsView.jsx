import { useState } from 'react'
import AddClientModal from './clients/AddClientModal'
import ClientDetailsModal from './clients/ClientDetailsModal'

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
  const [selectedViewClient, setSelectedViewClient] = useState(null)

  const handleOpenModal = () => {
    setIsModalOpen(true)
  }

  const handleClose = () => {
    setIsModalOpen(false)
  }

  const handleOpenFicha = (client) => {
    setSelectedViewClient(client)
  }

  const handleCloseFicha = () => {
    setSelectedViewClient(null)
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
    <div className="clients-page-wrapper" style={{
      backgroundColor: '#07080f',
      minHeight: '100vh',
      width: '100%',
      padding: '2rem 3rem',
      boxSizing: 'border-box',
      overflowY: 'auto'
    }}>
      <div className="view-container" style={{
        backgroundColor: '#0B0C16',
        border: '1px solid rgba(124, 92, 255, 0.22)',
        borderRadius: '20px',
        padding: '32px',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        gap: '24px'
      }}>
        <div className="view-header" style={{ marginBottom: '8px' }}>
          <h1 className="view-title" style={{
            fontSize: '32px',
            fontWeight: '700',
            color: '#F8FAFC',
            background: 'none',
            WebkitBackgroundClip: 'unset',
            WebkitTextFillColor: '#F8FAFC',
            opacity: 1,
            margin: '0 0 8px 0'
          }}>Clientes</h1>
          <p className="view-description" style={{ color: '#94A3B8', fontSize: '16px', margin: 0 }}>Lista de clientes e contatos comerciais consolidados a partir dos agendamentos.</p>
        </div>

      <div className="client-search-wrapper" style={{ display: 'flex', gap: '1rem', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
        <div className="search-input-container" style={{
          flexGrow: 1,
          maxWidth: '500px',
          margin: 0,
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          backgroundColor: '#11131F',
          border: '1px solid rgba(148,163,184,0.22)',
          borderRadius: '10px',
          height: '52px',
          padding: '0 16px'
        }}>
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="#a855f7" className="search-icon" style={{ width: '20px', height: '20px', marginRight: '10px' }}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.637 10.637z" />
          </svg>
          <input
            type="text"
            className="client-search-input"
            placeholder="Pesquisar por nome, telefone ou agência..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              background: 'none',
              border: 'none',
              color: '#F8FAFC',
              outline: 'none',
              width: '100%',
              fontSize: '0.95rem'
            }}
          />
        </div>

        <button
          type="button"
          onClick={handleOpenModal}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
            background: 'linear-gradient(90deg, #6366F1 0%, #7C3AED 100%)',
            color: '#ffffff',
            height: '52px',
            borderRadius: '10px',
            border: 'none',
            padding: '0 24px',
            fontWeight: '600',
            cursor: 'pointer',
            boxShadow: '0 0 16px rgba(124, 58, 237, 0.25)',
            transition: 'all 0.2s ease'
          }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" style={{ width: '16px', height: '16px' }}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Novo cliente
        </button>
      </div>

      <div className="clients-table-container" style={{
        backgroundColor: '#0D0F1A',
        border: '1px solid rgba(124, 92, 255, 0.55)',
        borderRadius: '16px',
        boxShadow: '0 0 24px rgba(124, 92, 255, 0.08)',
        minHeight: '400px',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}>
        {/* Table Header */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1.2fr 1fr 1fr 40px',
          padding: '16px 24px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          color: '#94A3B8',
          fontSize: '12px',
          fontWeight: '600',
          letterSpacing: '0.05em'
        }}>
          <div>NOME</div>
          <div>TELEFONE</div>
          <div>AGÊNCIA</div>
          <div></div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
          {filteredClients.length > 0 ? (
            filteredClients.map((client) => {
              const initials = client.nome ? client.nome.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : 'C';
              return (
                <div
                  key={client.id || client.telefone}
                  onClick={() => handleOpenFicha(client)}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1.2fr 1fr 1fr 40px',
                    alignItems: 'center',
                    height: '72px',
                    padding: '0 24px',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
                    cursor: 'pointer',
                    transition: 'background-color 0.2s ease'
                  }}
                  className="client-row-hover"
                >
                  {/* Nome col */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, #7C3AED 0%, #6366F1 100%)',
                      color: '#ffffff',
                      fontWeight: '700',
                      fontSize: '13px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      {initials}
                    </div>
                    <span style={{ color: '#F8FAFC', fontWeight: '500', fontSize: '15px' }}>{client.nome}</span>
                  </div>

                  {/* Telefone col */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#CBD5E1', fontSize: '14px' }}>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="#a855f7" style={{ width: '16px', height: '16px', flexShrink: 0 }}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.622C2.25 14.502 8.498 21.75 16.378 21.75c1.657 0 3.255-.7 4.225-2.072 1.074-1.517.925-3.612-.416-4.953l-1.07-1.071a1.914 1.914 0 00-2.707 0l-.6.6a1.107 1.107 0 01-1.46.104l-3.327-2.327a1.107 1.107 0 01-.104-1.46l.6-.6a1.914 1.914 0 000-2.707L11.07 2.25c-1.341-1.34-3.436-1.19-4.953-.116C4.74 3.103 2.25 5.568 2.25 6.622z" />
                    </svg>
                    <span>{client.telefone}</span>
                  </div>

                  {/* Agência col */}
                  <div style={{ color: '#94A3B8', fontSize: '14px' }}>
                    {client.agencia || '—'}
                  </div>

                  {/* Três pontos menu col */}
                  <div style={{ display: 'flex', justifyContent: 'flex-end', color: '#94A3B8' }}>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" style={{ width: '20px', height: '20px' }}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 12.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 18.75a.75.75 0 110-1.5.75.75 0 010 1.5z" />
                    </svg>
                  </div>
                </div>
              );
            })
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexGrow: 1, padding: '40px', color: '#94A3B8' }}>
              Nenhum cliente encontrado para os termos da busca.
            </div>
          )}
        </div>
      </div>

      <AddClientModal
        isOpen={isModalOpen}
        onClose={handleClose}
        onAddClient={onAddClient}
        hasActiveGoogleIntegration={hasActiveGoogleIntegration}
      />

      <ClientDetailsModal
        isOpen={!!selectedViewClient}
        client={selectedViewClient}
        meetings={meetings}
        onClose={handleCloseFicha}
        onUpdateClient={onUpdateClient}
        onDeleteClient={onDeleteClient}
      />
      </div>
    </div>
  )
}
