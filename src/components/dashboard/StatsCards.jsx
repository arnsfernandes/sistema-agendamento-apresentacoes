import { useState } from 'react'

export default function StatsCards({ totalTodayCount, activeParticipantsCount, realClientsCount, futureMeetingsCount }) {
  const [hoveredCard, setHoveredCard] = useState(null)

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginBottom: '2rem' }}>
      {/* Card 1 */}
      <div 
        onMouseEnter={() => setHoveredCard(1)}
        onMouseLeave={() => setHoveredCard(null)}
        style={{ 
          backgroundColor: 'var(--bg-panel)', 
          border: hoveredCard === 1 ? '1px solid rgba(99, 102, 241, 0.55)' : '1px solid rgba(99, 102, 241, 0.35)', 
          borderRadius: '16px', 
          padding: '18px 20px', 
          height: '132px', 
          display: 'flex', 
          flexDirection: 'column', 
          justifyContent: 'space-between', 
          boxSizing: 'border-box', 
          position: 'relative', 
          overflow: 'hidden',
          boxShadow: hoveredCard === 1 ? '0 0 24px rgba(99, 102, 241, 0.12)' : '0 0 20px rgba(99, 102, 241, 0.05)',
          transition: 'border-color 180ms ease, box-shadow 180ms ease'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '10px', backgroundColor: 'rgba(79, 70, 230, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.2} stroke="#6366f1" style={{ width: '20px', height: '20px' }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 2v3M16 2v3" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M16 4H8a3 3 0 00-3 3v8a3 3 0 003 3h5" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 12V7a3 3 0 00-3-3" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 8.5h14" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 11.5h.01M12 11.5h.01M16 11.5h.01M8 14.5h.01M12 14.5h.01" />
              <circle cx="17" cy="17" r="4" stroke="#6366f1" strokeWidth={2.2} fill="var(--bg-panel)" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 15v2h1.5" />
            </svg>
          </div>
          <svg width="72" height="22" style={{ opacity: 0.7 }}>
            <path d="M0,16 Q18,5 36,13 T72,2" fill="none" stroke="#6366f1" strokeWidth="2" />
          </svg>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', marginTop: 'auto' }}>
          <span style={{ fontSize: '13px', color: '#94a3b8', fontWeight: '500' }}>Reuniões hoje</span>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
            <h2 style={{ margin: 0, fontSize: '30px', fontWeight: '700', lineHeight: 1 }}>{totalTodayCount}</h2>
            <span style={{ fontSize: '12px', color: '#64748b' }}>Hoje</span>
          </div>
        </div>
      </div>

      {/* Card 2 */}
      <div 
        onMouseEnter={() => setHoveredCard(2)}
        onMouseLeave={() => setHoveredCard(null)}
        style={{ 
          backgroundColor: 'var(--bg-panel)', 
          border: hoveredCard === 2 ? '1px solid rgba(168, 85, 247, 0.55)' : '1px solid rgba(168, 85, 247, 0.35)', 
          borderRadius: '16px', 
          padding: '18px 20px', 
          height: '132px', 
          display: 'flex', 
          flexDirection: 'column', 
          justifyContent: 'space-between', 
          boxSizing: 'border-box', 
          position: 'relative', 
          overflow: 'hidden',
          boxShadow: hoveredCard === 2 ? '0 0 24px rgba(168, 85, 247, 0.12)' : '0 0 20px rgba(168, 85, 247, 0.05)',
          transition: 'border-color 180ms ease, box-shadow 180ms ease'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '10px', backgroundColor: 'rgba(168, 85, 247, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.2} stroke="#a855f7" style={{ width: '20px', height: '20px' }}>
              <circle cx="15.5" cy="9.5" r="2.5" stroke="#a855f7" strokeWidth={2.2} />
              <path strokeLinecap="round" strokeLinejoin="round" d="M11.5 17a4.5 4.5 0 018 0" />
              <circle cx="8.5" cy="7.5" r="3.2" stroke="#a855f7" strokeWidth={2.2} fill="var(--bg-panel)" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 17a6.5 6.5 0 0111 0" fill="var(--bg-panel)" />
            </svg>
          </div>
          <svg width="72" height="22" style={{ opacity: 0.7 }}>
            <path d="M0,11 Q18,20 36,9 T72,13" fill="none" stroke="#a855f7" strokeWidth="2" />
          </svg>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', marginTop: 'auto' }}>
          <span style={{ fontSize: '13px', color: '#94a3b8', fontWeight: '500' }}>Participantes agendados</span>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
            <h2 style={{ margin: 0, fontSize: '30px', fontWeight: '700', lineHeight: 1 }}>{activeParticipantsCount}</h2>
            <span style={{ fontSize: '12px', color: '#64748b' }}>Hoje</span>
          </div>
        </div>
      </div>

      {/* Card 3 */}
      <div 
        onMouseEnter={() => setHoveredCard(3)}
        onMouseLeave={() => setHoveredCard(null)}
        style={{ 
          backgroundColor: 'var(--bg-panel)', 
          border: hoveredCard === 3 ? '1px solid rgba(59, 130, 246, 0.55)' : '1px solid rgba(59, 130, 246, 0.35)', 
          borderRadius: '16px', 
          padding: '18px 20px', 
          height: '132px', 
          display: 'flex', 
          flexDirection: 'column', 
          justifyContent: 'space-between', 
          boxSizing: 'border-box', 
          position: 'relative', 
          overflow: 'hidden',
          boxShadow: hoveredCard === 3 ? '0 0 24px rgba(59, 130, 246, 0.12)' : '0 0 20px rgba(59, 130, 246, 0.05)',
          transition: 'border-color 180ms ease, box-shadow 180ms ease'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '10px', backgroundColor: 'rgba(59, 130, 246, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="#3b82f6" style={{ width: '18px', height: '18px' }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479" />
            </svg>
          </div>
          <svg width="72" height="22" style={{ opacity: 0.7 }}>
            <path d="M0,20 Q18,5 36,16 T72,7" fill="none" stroke="#3b82f6" strokeWidth="2" />
          </svg>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', marginTop: 'auto' }}>
          <span style={{ fontSize: '13px', color: '#94a3b8', fontWeight: '500' }}>Clientes ativos</span>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
            <h2 style={{ margin: 0, fontSize: '30px', fontWeight: '700', lineHeight: 1 }}>{realClientsCount}</h2>
            <span style={{ fontSize: '12px', color: '#64748b' }}>Cadastrados</span>
          </div>
        </div>
      </div>

      {/* Card 4 */}
      <div 
        onMouseEnter={() => setHoveredCard(4)}
        onMouseLeave={() => setHoveredCard(null)}
        style={{ 
          backgroundColor: 'var(--bg-panel)', 
          border: hoveredCard === 4 ? '1px solid rgba(251, 191, 36, 0.55)' : '1px solid rgba(251, 191, 36, 0.35)', 
          borderRadius: '16px', 
          padding: '18px 20px', 
          height: '132px', 
          display: 'flex', 
          flexDirection: 'column', 
          justifyContent: 'space-between', 
          boxSizing: 'border-box', 
          position: 'relative', 
          overflow: 'hidden',
          boxShadow: hoveredCard === 4 ? '0 0 24px rgba(251, 191, 36, 0.1)' : '0 0 20px rgba(251, 191, 36, 0.04)',
          transition: 'border-color 180ms ease, box-shadow 180ms ease'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '10px', backgroundColor: 'rgba(251, 191, 36, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="#fbbf24" style={{ width: '18px', height: '18px' }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25" />
            </svg>
          </div>
          <svg width="72" height="22" style={{ opacity: 0.7 }}>
            <path d="M0,13 Q18,5 36,18 T72,11" fill="none" stroke="#fbbf24" strokeWidth="2" />
          </svg>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', marginTop: 'auto' }}>
          <span style={{ fontSize: '13px', color: '#94a3b8', fontWeight: '500' }}>Reuniões futuras</span>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
            <h2 style={{ margin: 0, fontSize: '30px', fontWeight: '700', lineHeight: 1 }}>{futureMeetingsCount}</h2>
            <span style={{ fontSize: '12px', color: '#64748b' }}>Próximos dias</span>
          </div>
        </div>
      </div>
    </div>
  )
}
