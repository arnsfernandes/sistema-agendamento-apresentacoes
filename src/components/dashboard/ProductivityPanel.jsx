import { useState } from 'react'

export default function ProductivityPanel({ onNavigate }) {
  const [hovered, setHovered] = useState(false)

  return (
    <div 
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ 
        backgroundColor: '#0b0c16', 
        border: hovered ? '1px solid rgba(124, 92, 255, 0.52)' : '1px solid rgba(124, 92, 255, 0.28)', 
        borderRadius: '20px', 
        padding: '24px', 
        display: 'flex', 
        flexDirection: 'column', 
        gap: '1.5rem',
        boxShadow: hovered ? '0 0 24px rgba(124, 92, 255, 0.1)' : '0 0 20px rgba(124, 92, 255, 0.04)',
        transition: 'border-color 180ms ease, box-shadow 180ms ease',
        boxSizing: 'border-box'
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="#94a3b8" style={{ width: '20px', height: '20px' }}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.281m5.94 2.28l-2.28 5.941" />
          </svg>
          Produtividade
        </h3>
        <select style={{
          backgroundColor: '#111322',
          border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: '6px',
          padding: '0.3rem 0.6rem',
          color: '#94a3b8',
          fontSize: '0.8rem',
          fontWeight: '500',
          outline: 'none',
          cursor: 'pointer'
        }}>
          <option>Esta semana</option>
          <option>Este mês</option>
        </select>
      </div>

      {/* 4 Stats Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
        {/* Stat 1: Reuniões Realizadas */}
        <div style={{
          backgroundColor: '#07080F',
          border: '1px solid rgba(255,255,255,0.03)',
          borderRadius: '12px',
          padding: '14px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: '8px',
            backgroundColor: 'rgba(124, 92, 255, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#7C5CFF',
            flexShrink: 0
          }}>
            <svg style={{ width: '18px', height: '18px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '1.4rem', fontWeight: '700', color: '#F8FAFC', lineHeight: 1.1 }}>12</span>
            <span style={{ fontSize: '0.72rem', color: '#94A3B8', marginTop: '3px' }}>Reuniões realizadas</span>
            <span style={{ fontSize: '0.62rem', color: '#10B981', marginTop: '2px', fontWeight: '600' }}>+20% vs. sem. passada ↗</span>
          </div>
        </div>

        {/* Stat 2: Participantes Atendidos */}
        <div style={{
          backgroundColor: '#07080F',
          border: '1px solid rgba(255,255,255,0.03)',
          borderRadius: '12px',
          padding: '14px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: '8px',
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#3B82F6',
            flexShrink: 0
          }}>
            <svg style={{ width: '18px', height: '18px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 005.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '1.4rem', fontWeight: '700', color: '#F8FAFC', lineHeight: 1.1 }}>27</span>
            <span style={{ fontSize: '0.72rem', color: '#94A3B8', marginTop: '3px' }}>Part. atendidos</span>
            <span style={{ fontSize: '0.62rem', color: '#10B981', marginTop: '2px', fontWeight: '600' }}>+12% vs. sem. passada ↗</span>
          </div>
        </div>

        {/* Stat 3: Clientes Atendidos */}
        <div style={{
          backgroundColor: '#07080F',
          border: '1px solid rgba(255,255,255,0.03)',
          borderRadius: '12px',
          padding: '14px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: '8px',
            backgroundColor: 'rgba(16, 185, 129, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#10B981',
            flexShrink: 0
          }}>
            <svg style={{ width: '18px', height: '18px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '1.4rem', fontWeight: '700', color: '#F8FAFC', lineHeight: 1.1 }}>15</span>
            <span style={{ fontSize: '0.72rem', color: '#94A3B8', marginTop: '3px' }}>Clientes atendidos</span>
            <span style={{ fontSize: '0.62rem', color: '#10B981', marginTop: '2px', fontWeight: '600' }}>+15% vs. sem. passada ↗</span>
          </div>
        </div>

        {/* Stat 4: Horas em Reuniões */}
        <div style={{
          backgroundColor: '#07080F',
          border: '1px solid rgba(255,255,255,0.03)',
          borderRadius: '12px',
          padding: '14px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: '8px',
            backgroundColor: 'rgba(251, 191, 36, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#FBBF24',
            flexShrink: 0
          }}>
            <svg style={{ width: '18px', height: '18px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '1.4rem', fontWeight: '700', color: '#F8FAFC', lineHeight: 1.1 }}>18h 30m</span>
            <span style={{ fontSize: '0.72rem', color: '#94A3B8', marginTop: '3px' }}>Horas em reuniões</span>
            <span style={{ fontSize: '0.62rem', color: '#10B981', marginTop: '2px', fontWeight: '600' }}>+8% vs. sem. passada ↗</span>
          </div>
        </div>
      </div>

      {/* Area Chart visual decoration */}
      <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <svg viewBox="0 0 500 120" style={{ width: '100%', height: 'auto', overflow: 'visible' }}>
          <defs>
            <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#7C5CFF" stopOpacity="0.25"/>
              <stop offset="100%" stopColor="#7C5CFF" stopOpacity="0"/>
            </linearGradient>
          </defs>
          <path d="M 0 100 Q 50 90 83 80 T 166 85 T 250 82 T 333 75 T 416 40 T 500 80 L 500 120 L 0 120 Z" fill="url(#chartGrad)" />
          <path d="M 0 100 Q 50 90 83 80 T 166 85 T 250 82 T 333 75 T 416 40 T 500 80" fill="none" stroke="#7C5CFF" strokeWidth="2.5" strokeLinecap="round" />
          <circle cx="416" cy="40" r="5" fill="#7C5CFF" stroke="#ffffff" strokeWidth="1.5" style={{ filter: 'drop-shadow(0 0 4px #7C5CFF)' }} />
        </svg>
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0 6px', color: '#64748B', fontSize: '0.72rem', fontWeight: '600' }}>
          <span>Seg</span>
          <span>Ter</span>
          <span>Qua</span>
          <span>Qui</span>
          <span>Sex</span>
          <span>Sáb</span>
          <span>Dom</span>
        </div>
      </div>

      <button
        onClick={() => onNavigate('calendario')}
        style={{
          marginTop: 'auto',
          background: 'none',
          border: 'none',
          color: '#7C5CFF',
          fontSize: '0.85rem',
          fontWeight: '600',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.25rem'
        }}
      >
        Ver relatório completo <span style={{ fontSize: '1.1rem', fontWeight: '500' }}>→</span>
      </button>
    </div>
  )
}
