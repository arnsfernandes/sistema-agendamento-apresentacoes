import { useState } from 'react'
import { getStatusDetails } from '../../utils/statusHelper'

export default function TodaySchedulePanel({ displayTodayMeetings, onNavigate, setSelectedMeetingId }) {
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
        height: '100%',
        boxSizing: 'border-box'
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="#94a3b8" style={{ width: '20px', height: '20px' }}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25" />
          </svg>
          Agenda de hoje
        </h3>
        <button
          onClick={() => onNavigate('calendario')}
          style={{
            fontSize: '0.8rem',
            color: '#94a3b8',
            backgroundColor: '#111322',
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: '6px',
            padding: '0.4rem 0.8rem',
            cursor: 'pointer',
            fontWeight: '500',
            display: 'flex',
            alignItems: 'center',
            gap: '0.3rem'
          }}
        >
          Abrir agenda
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" style={{ width: '12px', height: '12px' }}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
          </svg>
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
        {displayTodayMeetings.map((m, index) => {
          const partsText = m.participacoes && m.participacoes.length > 0
            ? m.participacoes.map(p => p.nome).join(', ')
            : 'Sem participantes'

          const statusDetails = getStatusDetails(m)
          const pillBg = statusDetails.bg
          const pillColor = statusDetails.color
          const pillLabel = statusDetails.label
          const dotColor = statusDetails.color

          const isLast = index === displayTodayMeetings.length - 1;

          return (
            <div
              key={m.id}
              onClick={() => setSelectedMeetingId && setSelectedMeetingId(m.id)}
              className="dashboard-meeting-row"
              style={{
                display: 'grid',
                gridTemplateColumns: '70px 18px 1fr auto',
                gap: '12px',
                alignItems: 'center',
                paddingBlock: '14px',
                borderBottom: isLast ? 'none' : '1px solid rgba(255,255,255,0.04)',
                cursor: 'pointer'
              }}
            >
              {/* 1. Horário & Duração */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <span style={{ fontSize: '16px', fontWeight: '600', color: '#ffffff', lineHeight: 1.2 }}>
                  {m.horario ? m.horario.slice(0, 5) : '00:00'}
                </span>
                <span style={{ fontSize: '12px', color: '#64748b' }}>
                  {m.duration || '60 min'}
                </span>
              </div>

              {/* 2. Status Dot/Visual Indicator */}
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: dotColor }} />
              </div>

              {/* 3. Main content (Title & Participants) */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', overflow: 'hidden' }}>
                <h4 style={{
                  margin: 0,
                  fontSize: '0.95rem',
                  fontWeight: '600',
                  color: '#ffffff',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                  lineHeight: 1.3
                }}>
                  {m.titulo}
                </h4>
                <span style={{ fontSize: '13px', color: '#94a3b8' }}>
                  {partsText}
                </span>
              </div>

              {/* 4. Status Badge & Menu */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span style={{
                  fontSize: '0.75rem',
                  fontWeight: '600',
                  padding: '0.25rem 0.6rem',
                  borderRadius: '6px',
                  backgroundColor: pillBg,
                  color: pillColor
                }}>{pillLabel}</span>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                  }}
                  style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '0.25rem' }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" style={{ width: '16px', height: '16px' }}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 12.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 18.75a.75.75 0 110-1.5.75.75 0 010 1.5z" />
                  </svg>
                </button>
              </div>
            </div>
          )
        })}
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
        Ver agenda completa <span style={{ fontSize: '1.1rem', fontWeight: '500' }}>→</span>
      </button>
    </div>
  )
}
