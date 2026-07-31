import { useState } from 'react'
import './App.css'

function App() {
  const [activeTab, setActiveTab] = useState('calendario')

  const navigationItems = [
    {
      id: 'calendario',
      label: 'Calendário',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5m-9-6h.008v.008H12v-.008zM12 15h.008v.008H12V15zm0 2.25h.008v.008H12v-.008zM9.75 15h.008v.008H9.75V15zm0 2.25h.008v.008H9.75v-.008zM7.5 15h.008v.008H7.5V15zm0 2.25h.008v.008H7.5v-.008zm6.75-4.5h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008V15zm0 2.25h.008v.008h-.008v-.008zm2.25-4.5h.008v.008H16.5v-.008zm0 2.25h.008v.008H16.5V15z" />
        </svg>
      )
    },
    {
      id: 'clientes',
      label: 'Clientes',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.109A11.386 11.386 0 0110.089 20M3 11.627a1.125 1.125 0 011.083-1.127h4.374c.56 0 1.04.388 1.125.941a11.322 11.322 0 004.122 6.556m-8.622-6.37a1.125 1.125 0 00-1.083 1.127V18.5c0 .54.406.991.94 1.036A11.478 11.478 0 0010.089 20m-7.089-8.373a11.42 11.42 0 007.089 8.373m0 0l.092.012a9.39 9.39 0 005.105-1.503M10.089 20a11.385 11.385 0 01-5.111-1.503m10.092-2.118a8.967 8.967 0 00-3.07-5.07M12.188 8.75a3 3 0 116 0 3 3 0 01-6 0zM1.5 9.75a3 3 0 116 0 3 3 0 01-6 0zM12.251 14.75a3.75 3.75 0 016.75 0V15h-6.75v-.25z" />
        </svg>
      )
    },
    {
      id: 'configuracoes',
      label: 'Configurações',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.43l-1.003.828c-.293.241-.438.613-.43.992a7.723 7.723 0 010 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.43l1.004-.827c.292-.24.437-.613.43-.991a6.936 6.936 0 010-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      )
    }
  ]

  const renderContent = () => {
    switch (activeTab) {
      case 'calendario':
        return (
          <div className="view-container">
            <h1 className="view-title">Calendário</h1>
            <p className="view-description">Visualização e agendamentos de apresentações comerciais.</p>
          </div>
        )
      case 'clientes':
        return (
          <div className="view-container">
            <h1 className="view-title">Clientes</h1>
            <p className="view-description">Lista de clientes e contatos comerciais.</p>
          </div>
        )
      case 'configuracoes':
        return (
          <div className="view-container">
            <h1 className="view-title">Configurações</h1>
            <p className="view-description">Configurações da conta, integrações e preferências.</p>
          </div>
        )
      default:
        return null
    }
  }

  return (
    <div className="dashboard-layout">
      {/* Sidebar Navigation */}
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="brand-logo">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <span className="brand-name">Scheduling</span>
        </div>

        <nav className="sidebar-menu">
          {navigationItems.map((item) => (
            <button
              key={item.id}
              className={`menu-item ${activeTab === item.id ? 'active' : ''}`}
              onClick={() => setActiveTab(item.id)}
            >
              <span className="menu-icon">{item.icon}</span>
              <span className="menu-label">{item.label}</span>
            </button>
          ))}
        </nav>
      </aside>

      {/* Main Content Area */}
      <main className="main-content">
        <header className="content-header">
          <span className="badge">Em desenvolvimento</span>
        </header>
        <section className="content-body">
          {renderContent()}
        </section>
      </main>
    </div>
  )
}

export default App
