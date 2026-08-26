
import StatsCards from './dashboard/StatsCards'
import TodaySchedulePanel from './dashboard/TodaySchedulePanel'
import ProductivityPanel from './dashboard/ProductivityPanel'

export default function DashboardView({
  user,
  meetings = [],
  clients = [],
  onNavigate,
  openPresentationModal,
  setSelectedMeetingId
}) {
  const getFirstName = (name) => {
    if (!name) return 'Arnaldo'
    const cleanName = name.replace(/\badmin\b/gi, '').trim()
    return cleanName.split(' ')[0] || 'Arnaldo'
  }
  const firstName = getFirstName(user?.user_metadata?.name || user?.email?.split('@')[0])

  // Data processing (Real Data)
  const todayStr = new Date().toLocaleDateString('en-CA') // YYYY-MM-DD
  const realTodayMeetings = meetings.filter(m => m.date === todayStr && m.participacoes && m.participacoes.some(p => p.status === 'ativo'))
  
  // Mock Data for High-Fidelity display if real data is empty
  const mockTodayMeetings = [
    { id: 'mock-1', titulo: 'Reunião de alinhamento', date: todayStr, horario: '09:00:00', duration: '60 min', participacoes: [{ nome: 'Ronaldo' }, { nome: 'Camila' }], syncStatus: 'synced' },
    { id: 'mock-2', titulo: 'Apresentação comercial', date: todayStr, horario: '11:30:00', duration: '60 min', participacoes: [{ nome: 'Fernanda' }], syncStatus: 'pending' },
    { id: 'mock-3', titulo: 'Revisão de proposta', date: todayStr, horario: '14:00:00', duration: '60 min', participacoes: [{ nome: 'Gustavo' }, { nome: 'Ana' }], syncStatus: 'synced' },
    { id: 'mock-4', titulo: 'Follow-up', date: todayStr, horario: '16:30:00', duration: '45 min', participacoes: [{ nome: 'Marcos' }], syncStatus: 'rescheduled' }
  ]

  const displayTodayMeetings = realTodayMeetings.length > 0 ? realTodayMeetings : mockTodayMeetings
  const totalTodayCount = realTodayMeetings.length

  // Future meetings calculation
  const futureMeetings = meetings.filter(m => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const mDate = new Date(m.date + 'T00:00:00')
    return mDate >= today
  })

  const realAgendadosCount = futureMeetings.reduce((acc, m) => acc + (m.participacoes ? m.participacoes.length : 0), 0)
  const displayAgendadosCount = realAgendadosCount > 0 ? realAgendadosCount : 9

  const realClientsCount = clients.length
  const displayClientsCount = realClientsCount > 0 ? realClientsCount : 28

  return (
    <div className="dashboard-content" style={{
      backgroundColor: '#07080f',
      color: '#ffffff',
      fontFamily: "'Outfit', sans-serif",
      padding: '2.5rem',
      height: '100vh',
      overflowY: 'auto',
      boxSizing: 'border-box'
    }}>
      {/* Top Header Grid */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ 
            fontSize: '36px', 
            fontWeight: '700', 
            margin: '0 0 6px 0', 
            lineHeight: '1.1',
            color: '#F8FAFC'
          }}>
            Olá, <span style={{ 
              background: 'linear-gradient(90deg, #A855F7 0%, #6366F1 100%)', 
              WebkitBackgroundClip: 'text', 
              WebkitTextFillColor: 'transparent',
              display: 'inline-block'
            }}>{firstName}</span>
            <span style={{ marginLeft: '8px' }}>👋</span>
          </h1>
          <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.95rem' }}>
            {totalTodayCount === 0 ? (
              "Você não tem reuniões agendadas para hoje."
            ) : totalTodayCount === 1 ? (
              <>Você tem <span style={{ color: '#ffffff', fontWeight: '500' }}>1 reunião agendada</span> para hoje.</>
            ) : (
              <>Você tem <span style={{ color: '#ffffff', fontWeight: '500' }}>{totalTodayCount} reuniões agendadas</span> para hoje.</>
            )}
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {/* Nova Reunião CTA */}
          <button
            onClick={openPresentationModal}
            style={{
              padding: '0 1.5rem',
              height: '42px',
              borderRadius: '10px',
              backgroundColor: '#4f46e6',
              border: 'none',
              color: '#ffffff',
              fontSize: '0.9rem',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(79, 70, 230, 0.3)'
            }}
          >
            <span style={{ fontSize: '1.2rem', fontWeight: '400' }}>+</span> Nova reunião
          </button>
        </div>
      </div>

      {/* featured banner */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '1.75rem 2rem',
        borderRadius: '16px',
        backgroundColor: '#0b0c16',
        border: '1px solid rgba(79, 70, 230, 0.15)',
        marginBottom: '2rem',
        boxShadow: 'inset 0 0 20px rgba(79, 70, 230, 0.05)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '14px',
            backgroundColor: 'rgba(79, 70, 230, 0.12)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative'
          }}>
            {/* Glow effect behind icon */}
            <div style={{ position: 'absolute', width: '30px', height: '30px', borderRadius: '50%', backgroundColor: '#4f46e6', filter: 'blur(15px)', opacity: 0.6 }} />
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="#6366f1" style={{ width: '32px', height: '32px', position: 'relative' }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5m-9-6h.008v.008H12v-.008zM12 15h.008v.008H12V15zm0 2.25h.008v.008H12v-.008z" />
            </svg>
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: '600' }}>Seu dia, resumido</h3>
            <p style={{ margin: '0.3rem 0 0 0', fontSize: '0.9rem', color: '#94a3b8' }}>
              Você está com a agenda equilibrada. <span style={{ color: '#ffffff' }}>Boa produtividade!</span>
            </p>
          </div>
        </div>
        <button
          onClick={() => onNavigate('calendario')}
          style={{
            padding: '0.65rem 1.25rem',
            borderRadius: '8px',
            backgroundColor: '#111322',
            border: '1px solid rgba(255,255,255,0.08)',
            color: '#ffffff',
            fontSize: '0.85rem',
            fontWeight: '600',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            transition: 'background-color 0.2s'
          }}
        >
          Ver agenda <span style={{ fontSize: '1.1rem', lineHeight: 1 }}>→</span>
        </button>
      </div>

      {/* Info Stats Cards Row */}
      <StatsCards 
        totalTodayCount={totalTodayCount}
        displayAgendadosCount={displayAgendadosCount}
        displayClientsCount={displayClientsCount}
      />

      {/* Main Sections Grid layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '20px', alignItems: 'start' }}>
        {/* Box 1: Agenda de hoje */}
        <TodaySchedulePanel 
          displayTodayMeetings={displayTodayMeetings}
          onNavigate={onNavigate}
          setSelectedMeetingId={setSelectedMeetingId}
        />

        {/* Box 3: Produtividade */}
        <ProductivityPanel 
          onNavigate={onNavigate}
        />
      </div>
    </div>
  )
}
