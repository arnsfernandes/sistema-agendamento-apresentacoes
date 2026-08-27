import { useState } from 'react'

export default function ProductivityPanel() {
  const [hovered, setHovered] = useState(false)

  return (
    <div 
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ 
        backgroundColor: 'var(--bg-panel)', 
        border: hovered ? '1px solid var(--border-accent-strong)' : '1px solid var(--border-accent)', 
        borderRadius: '20px', 
        padding: '24px', 
        display: 'flex', 
        flexDirection: 'column', 
        gap: '1.5rem',
        boxShadow: 'var(--shadow-card)',
        transition: 'border-color 180ms ease, box-shadow 180ms ease',
        boxSizing: 'border-box'
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-primary)' }}>
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="#94a3b8" style={{ width: '20px', height: '20px' }}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.281m5.94 2.28l-2.28 5.941" />
          </svg>
          Produtividade
        </h3>
      </div>

      {/* Neutral Productivity Info State */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '3rem 1.5rem',
        border: '1px dashed var(--border-color)',
        borderRadius: '12px',
        backgroundColor: 'var(--bg-primary)',
        color: 'var(--text-secondary)',
        textAlign: 'center',
        gap: '12px',
        flexGrow: 1,
        marginBlock: '10px'
      }}>
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" style={{ width: '40px', height: '40px', color: 'var(--text-muted)' }}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v16.5m0-16.5L12 12.75M3.75 3L12 3M20.25 21V4.5m0 16.5l-7.5-7.5M20.25 21H12.75" />
        </svg>
        <div>
          <h4 style={{ margin: '0 0 6px 0', fontSize: '0.95rem', fontWeight: '600', color: 'var(--text-primary)' }}>Relatório de Produtividade</h4>
          <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
            Os dados consolidados de reuniões realizadas, horas acumuladas e estatísticas comparativas serão gerados automaticamente conforme o uso e histórico de reuniões realizadas no Meety.
          </p>
        </div>
      </div>
    </div>
  )
}
