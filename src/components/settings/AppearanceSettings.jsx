import { useState } from 'react'

export default function AppearanceSettings({ theme, setTheme }) {
  const [hoveredCard, setHoveredCard] = useState(null)

  return (
    <div className="settings-section-card" style={{
      backgroundColor: 'var(--bg-panel)',
      border: '1px solid var(--border-accent)',
      boxShadow: 'var(--shadow-card)',
      borderRadius: '18px',
      padding: '28px',
      boxSizing: 'border-box'
    }}>
      <h3 className="settings-section-title" style={{ fontSize: '20px', fontWeight: '700', color: 'var(--text-primary)', margin: '0 0 8px 0', letterSpacing: 'normal', textTransform: 'none' }}>Preferência de Tema</h3>
      <p className="settings-section-subtitle" style={{ fontSize: '14px', color: 'var(--text-secondary)', margin: '0 0 24px 0' }}>Escolha entre a aparência Clara ou Escura para a interface da plataforma.</p>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
        {[
          {
            id: 'light',
            title: 'Claro',
            description: 'Interface em tons claros, ideal para ambientes bem iluminados.',
            icon: (
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" style={{ width: '24px', height: '24px' }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
              </svg>
            )
          },
          {
            id: 'dark',
            title: 'Escuro',
            description: 'Interface escura, moderna e confortável para leitura.',
            icon: (
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" style={{ width: '24px', height: '24px' }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" />
              </svg>
            )
          },
          {
            id: 'system',
            title: 'Automático',
            description: 'Ajusta o tema dinamicamente conforme o sistema operacional.',
            icon: (
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" style={{ width: '24px', height: '24px' }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 17.25v1.007a3 3 0 01-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0115 18.257V17.25m6-12V15a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 15V5.25A2.25 2.25 0 015.25 3h13.5A2.25 2.25 0 0121 5.25z" />
              </svg>
            )
          }
        ].map((opt) => {
          const isSelected = theme === opt.id;
          const isHovered = hoveredCard === opt.id;
          return (
            <div
              key={opt.id}
              onClick={() => setTheme(opt.id)}
              onMouseEnter={() => setHoveredCard(opt.id)}
              onMouseLeave={() => setHoveredCard(null)}
              style={{
                backgroundColor: 'var(--bg-card)',
                border: isSelected ? '2px solid var(--accent-color)' : (isHovered ? '1px solid var(--border-accent-strong)' : '1px solid var(--border-color)'),
                boxShadow: isSelected ? '0 0 16px rgba(129, 140, 248, 0.15)' : 'none',
                borderRadius: '12px',
                padding: '24px',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                position: 'relative',
                boxSizing: 'border-box',
                transition: 'all 0.18s ease'
              }}
            >
              {isSelected && (
                <span style={{
                  position: 'absolute',
                  top: '12px',
                  right: '12px',
                  backgroundColor: 'var(--accent-glow)',
                  border: '1px solid var(--accent-color)',
                  color: 'var(--accent-color)',
                  fontSize: '11px',
                  fontWeight: '700',
                  padding: '2px 8px',
                  borderRadius: '20px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em'
                }}>
                  Ativo
                </span>
              )}
              <div style={{
                width: '44px',
                height: '44px',
                borderRadius: '10px',
                backgroundColor: isSelected ? 'var(--accent-glow)' : 'var(--bg-elevated)',
                color: isSelected ? 'var(--accent-color)' : 'var(--text-muted)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.18s ease'
              }}>
                {opt.icon}
              </div>
              <div>
                <h4 style={{ color: 'var(--text-primary)', fontSize: '16px', fontWeight: '600', margin: '0 0 4px 0' }}>{opt.title}</h4>
                <p style={{ color: 'var(--text-secondary)', fontSize: '13px', margin: 0, lineHeight: '1.4' }}>{opt.description}</p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
