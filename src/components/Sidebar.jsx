import meetyLogo from '../assets/meety-logo.png'
import iconCalendario from '../assets/icon-calendario.png'
import iconClientes from '../assets/icon-clientes.png'
import iconConfig from '../assets/icon-config.png'
import iconCriarApresentacao from '../assets/icon-criar-apresentacao.png'
import iconResumo from '../assets/icon-resumo.png'
import iconSair from '../assets/icon-sair.png'

const navigationItems = [
  {
    id: 'calendario',
    label: 'Calendário',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
        <foreignObject width="24" height="24">
          <div style={{
            width: '100%',
            height: '100%',
            backgroundColor: 'currentColor',
            WebkitMaskImage: `url(${iconCalendario})`,
            maskImage: `url(${iconCalendario})`,
            WebkitMaskSize: 'contain',
            maskSize: 'contain',
            WebkitMaskRepeat: 'no-repeat',
            maskRepeat: 'no-repeat'
          }} />
        </foreignObject>
      </svg>
    )
  },
  {
    id: 'clientes',
    label: 'Clientes',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
        <foreignObject width="24" height="24">
          <div style={{
            width: '100%',
            height: '100%',
            backgroundColor: 'currentColor',
            WebkitMaskImage: `url(${iconClientes})`,
            maskImage: `url(${iconClientes})`,
            WebkitMaskSize: 'contain',
            maskSize: 'contain',
            WebkitMaskRepeat: 'no-repeat',
            maskRepeat: 'no-repeat'
          }} />
        </foreignObject>
      </svg>
    )
  },
  {
    id: 'configuracoes',
    label: 'Configurações',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
        <foreignObject width="24" height="24">
          <div style={{
            width: '100%',
            height: '100%',
            backgroundColor: 'currentColor',
            WebkitMaskImage: `url(${iconConfig})`,
            maskImage: `url(${iconConfig})`,
            WebkitMaskSize: 'contain',
            maskSize: 'contain',
            WebkitMaskRepeat: 'no-repeat',
            maskRepeat: 'no-repeat'
          }} />
        </foreignObject>
      </svg>
    )
  }
]

export default function Sidebar({
  activeTab,
  setActiveTab,
  setSelectedMeetingId,
  setShowMeetLink,
  setMeetCopied,
  resetMessageStates,
  openPresentationModal,
  meetings,
  setShowPendingList,
  handleLogout,
  user
}) {
  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <img src={meetyLogo} alt="Meety Logo" className="sidebar-logo" />
      </div>

      {(() => {
        const name = user?.user_metadata?.name
        return (
          <div className="sidebar-greeting" style={{ padding: '0.25rem 1.5rem 0.25rem 1.5rem', marginBottom: '1.5rem' }}>
            <div style={{ fontWeight: '600', fontSize: '0.95rem', color: 'var(--text-primary)' }}>
              Olá{name ? `, ${name}` : ''}
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
              Gerencie todas as suas reuniões aqui.
            </div>
          </div>
        )
      })()}

      <nav className="sidebar-menu">
        {/* Calendário */}
        {navigationItems.slice(0, 1).map((item) => (
          <button
            key={item.id}
            type="button"
            className={`menu-item ${activeTab === item.id ? 'active' : ''}`}
            onClick={() => {
              setActiveTab(item.id)
              setSelectedMeetingId(null)
              setShowMeetLink(false)
              setMeetCopied(false)
              resetMessageStates()
            }}
          >
            <span className="menu-icon">{item.icon}</span>
            <span className="menu-label">{item.label}</span>
          </button>
        ))}

        {/* Botões de Ação Exclusivos do Desktop no Meio do Menu */}
        <div className="desktop-only" style={{ flexDirection: 'column', gap: '0.5rem' }}>
          <button
            type="button"
            className="menu-item"
            onClick={() => openPresentationModal()}
          >
            <span className="menu-icon">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                <foreignObject width="24" height="24">
                  <div style={{
                    width: '100%',
                    height: '100%',
                    backgroundColor: 'currentColor',
                    WebkitMaskImage: `url(${iconCriarApresentacao})`,
                    maskImage: `url(${iconCriarApresentacao})`,
                    WebkitMaskSize: 'contain',
                    maskSize: 'contain',
                    WebkitMaskRepeat: 'no-repeat',
                    maskRepeat: 'no-repeat'
                  }} />
                </foreignObject>
              </svg>
            </span>
            <span className="menu-label">Criar apresentação</span>
          </button>
          <button
            type="button"
            className={`menu-item ${activeTab === 'resumo' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('resumo')
              setSelectedMeetingId(null)
              setShowMeetLink(false)
              setMeetCopied(false)
              resetMessageStates()
            }}
          >
            <span className="menu-icon">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                <foreignObject width="24" height="24">
                  <div style={{
                    width: '100%',
                    height: '100%',
                    backgroundColor: 'currentColor',
                    WebkitMaskImage: `url(${iconResumo})`,
                    maskImage: `url(${iconResumo})`,
                    WebkitMaskSize: 'contain',
                    maskSize: 'contain',
                    WebkitMaskRepeat: 'no-repeat',
                    maskRepeat: 'no-repeat'
                  }} />
                </foreignObject>
              </svg>
            </span>
            <span className="menu-label">Resumo da semana</span>
          </button>
        </div>

        {/* Clientes e Configurações */}
        {navigationItems.slice(1).map((item) => (
          <button
            key={item.id}
            type="button"
            className={`menu-item ${activeTab === item.id ? 'active' : ''}`}
            onClick={() => {
              setActiveTab(item.id)
              setSelectedMeetingId(null)
              setShowMeetLink(false)
              setMeetCopied(false)
              resetMessageStates()
            }}
          >
            <span className="menu-icon">{item.icon}</span>
            <span className="menu-label">{item.label}</span>
          </button>
        ))}

        {(() => {
          const pendingCount = meetings.filter(m => m.syncStatus === 'pending').length
          if (pendingCount === 0) return null
          return (
            <button
              type="button"
              className="menu-item pending-menu-item"
              onClick={() => setShowPendingList(true)}
            >
              <span className="menu-icon">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                </svg>
              </span>
              <span className="menu-label">
                {pendingCount === 1 ? '1 ação necessária' : `${pendingCount} ações necessárias`}
              </span>
            </button>
          )
        })()}
        
        <button
          type="button"
          className="menu-item logout-menu-item"
          onClick={handleLogout}
          style={{ marginTop: 'auto' }}
        >
          <span className="menu-icon">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
              <foreignObject width="24" height="24">
                <div style={{
                  width: '100%',
                  height: '100%',
                  backgroundColor: 'currentColor',
                  WebkitMaskImage: `url(${iconSair})`,
                  maskImage: `url(${iconSair})`,
                  WebkitMaskSize: 'contain',
                  maskSize: 'contain',
                  WebkitMaskRepeat: 'no-repeat',
                  maskRepeat: 'no-repeat'
                }} />
              </foreignObject>
            </svg>
          </span>
          <span className="menu-label">Sair</span>
        </button>
      </nav>
    </aside>
  )
}
