import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../services/supabaseClient'

const navigationPrincipal = [
  {
    id: 'agenda',
    label: 'Início',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
      </svg>
    )
  },
  {
    id: 'clientes',
    label: 'Clientes',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
      </svg>
    )
  },
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
    id: 'configuracoes',
    label: 'Ajustes',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75" />
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
  handleLogout,
  user,
  collapsed,
  setCollapsed
}) {
  const userName = user?.user_metadata?.name || 'Arnaldo Fernandes'
  const [btnHovered, setBtnHovered] = useState(false)
  const [chatLoading, setChatLoading] = useState(false)
  const [hasPhone, setHasPhone] = useState(false)
  const [phoneLoading, setPhoneLoading] = useState(true)

  const checkPhone = useCallback(async () => {
    if (!user) return
    try {
      const { data } = await supabase
        .from('usuario_whatsapp')
        .select('whatsapp_number')
        .eq('user_id', user.id)
        .maybeSingle()
      
      if (data && data.whatsapp_number) {
        setHasPhone(true)
      } else {
        setHasPhone(false)
      }
    } catch (err) {
      console.error('Erro ao verificar telefone:', err)
    } finally {
      setPhoneLoading(false)
    }
  }, [user])

  useEffect(() => {
    checkPhone()
  }, [activeTab, checkPhone])

  useEffect(() => {
    const handleUpdate = () => {
      checkPhone()
    }
    window.addEventListener('whatsapp_number_updated', handleUpdate)
    return () => window.removeEventListener('whatsapp_number_updated', handleUpdate)
  }, [checkPhone])

  const handleOpenAgentChat = async () => {
    setChatLoading(true)
    try {
      const { data, error } = await supabase.functions.invoke('whatsapp-master-info')
      if (error) throw error
      if (data && data.whatsapp_number) {
        const cleanedNumber = data.whatsapp_number.replace(/\D/g, '')
        if (!cleanedNumber) {
          window.alert('Número do Agente de IA está em formato inválido ou vazio.')
          return
        }
        const message = encodeURIComponent('Olá')
        const url = `https://wa.me/${cleanedNumber}?text=${message}`
        const newWindow = window.open(url, '_blank', 'noopener,noreferrer')
        if (newWindow) newWindow.opener = null
      } else {
        window.alert('Não foi possível obter o número de WhatsApp do Agente de IA.')
      }
    } catch (err) {
      console.error('Erro ao buscar o número master do WhatsApp:', err)
      window.alert('Serviço indisponível temporariamente. Não foi possível conectar ao Agente de IA.')
    } finally {
      setChatLoading(false)
    }
  }

  // Custom Initials for Avatar Icon
  const getInitials = (name) => {
    return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
  }

  return (
    <aside className="sidebar" style={{
      width: collapsed ? '84px' : '260px',
      backgroundColor: 'var(--bg-panel)',
      borderRight: '1px solid var(--border-color)',
      display: 'flex',
      flexDirection: 'column',
      padding: collapsed ? '28px 14px 1.75rem 14px' : '28px 28px 1.75rem 28px',
      boxSizing: 'border-box',
      height: '100vh',
      flexShrink: 0,
      transition: 'width 200ms ease, padding 200ms ease'
    }}>
      {/* Brand logo header with collapsing sidebar arrow visual element */}
      <div className="sidebar-brand" style={{
        display: 'flex',
        flexDirection: collapsed ? 'column' : 'row',
        alignItems: 'center',
        justifyContent: collapsed ? 'center' : 'space-between',
        marginBottom: '36px',
        gap: collapsed ? '14px' : '0',
        height: 'auto',
        padding: '0'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', height: '40px' }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
            <path d="M4 5V19L10 12L14 16L20 5V19" stroke="url(#logoGrad)" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
            <defs>
              <linearGradient id="logoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#6366f1" />
                <stop offset="100%" stopColor="#a855f7" />
              </linearGradient>
            </defs>
          </svg>
          {!collapsed && <span style={{ color: 'var(--text-primary)', fontWeight: 700, fontSize: '24px', fontFamily: "'Outfit', sans-serif", lineHeight: 1 }}>Meety</span>}
        </div>
        {/* Toggle Collapse Chevron from mockup */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          style={{
            background: 'none',
            border: 'none',
            color: '#94A3B8',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            padding: 0,
            transform: collapsed ? 'rotate(180deg)' : 'none',
            transition: 'transform 200ms ease'
          }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" style={{ width: '18px', height: '18px' }}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
        </button>
      </div>

      <nav style={{ display: 'flex', flexDirection: 'column', gap: '2rem', flexGrow: 1, overflowY: 'auto' }}>
        <div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            {navigationPrincipal.map((item) => {
              const isActive = activeTab === item.id;
              const isAgendaActive = isActive && item.id === 'agenda';
              return (
                <button
                  key={item.id}
                  type="button"
                  className={`menu-item ${isActive ? 'active' : ''}`}
                  onClick={() => {
                    setActiveTab(item.id)
                    setSelectedMeetingId(null)
                    setShowMeetLink(false)
                    setMeetCopied(false)
                    resetMessageStates()
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: collapsed ? 'center' : 'flex-start',
                    gap: collapsed ? '0' : '0.75rem',
                    padding: collapsed ? '0' : '0 16px',
                    height: '46px',
                    border: 'none',
                    borderRadius: '10px',
                    backgroundColor: isAgendaActive
                      ? 'var(--accent-glow)'
                      : (isActive ? 'var(--accent-hover)' : 'transparent'),
                    color: isAgendaActive ? 'var(--text-primary)' : (isActive ? 'var(--text-primary)' : 'var(--text-muted)'),
                    fontSize: '0.9rem',
                    fontWeight: isAgendaActive ? '600' : '500',
                    cursor: 'pointer',
                    textAlign: 'left',
                    width: '100%',
                    position: 'relative',
                    transition: 'background-color 0.2s, color 0.2s'
                  }}
                >
                  {isAgendaActive && (
                    <div style={{
                      position: 'absolute',
                      left: 0,
                      top: '6px',
                      bottom: '6px',
                      width: '3px',
                      backgroundColor: 'var(--accent-color)',
                      borderRadius: '1.5px'
                    }} />
                  )}
                  <span className="menu-icon" style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '20px',
                    height: '20px',
                    color: isAgendaActive ? 'var(--accent-color)' : (isActive ? 'var(--accent-color)' : 'var(--text-muted)'),
                    flexShrink: 0
                  }}>{item.icon}</span>
                  {!collapsed && <span className="menu-label">{item.label}</span>}
                </button>
              )
            })}
          </div>
        </div>

        {/* IA Agent widget banner */}
        {!collapsed && (
          <div style={{
            marginTop: 'auto',
            backgroundColor: 'var(--bg-elevated)',
            border: '1px solid var(--border-accent)',
            boxShadow: 'var(--shadow-card)',
            borderRadius: '12px',
            padding: '1.1rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.75rem',
            position: 'relative'
          }}>
            {/* WhatsApp/Chat icon decor */}
            <div style={{
              position: 'absolute',
              top: '-12px',
              left: '12px',
              width: '24px',
              height: '24px',
              borderRadius: '50%',
              backgroundColor: 'rgba(16, 185, 129, 0.15)',
              border: '1px solid rgba(16, 185, 129, 0.28)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="#10b981" style={{ width: '12px', height: '12px' }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <div style={{ marginTop: '0.2rem' }}>
              <h4 style={{ margin: 0, fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-primary)' }}>Agente de IA</h4>
              <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.72rem', color: 'var(--text-secondary)', lineHeight: '1.3' }}>
                {phoneLoading ? 'Verificando cadastro...' : (hasPhone ? 'Seu assistente no WhatsApp para reuniões, clientes e agendamentos.' : 'Cadastre seu WhatsApp para usar o Agente de IA.')}
              </p>
            </div>
            <button
              onClick={hasPhone ? handleOpenAgentChat : () => setActiveTab('configuracoes')}
              disabled={chatLoading || phoneLoading}
              onMouseEnter={() => setBtnHovered(true)}
              onMouseLeave={() => setBtnHovered(false)}
              style={{
                width: '100%',
                padding: '0.5rem 0',
                borderRadius: '6px',
                backgroundColor: (chatLoading || phoneLoading) ? 'var(--bg-elevated)' : (btnHovered ? 'rgba(16, 185, 129, 0.18)' : 'rgba(16, 185, 129, 0.1)'),
                border: (chatLoading || phoneLoading) ? '1px solid var(--border-color)' : '1px solid #10b981',
                boxShadow: (chatLoading || phoneLoading) ? 'none' : (btnHovered ? '0 0 12px rgba(16, 185, 129, 0.3)' : '0 0 8px rgba(16, 185, 129, 0.15)'),
                color: (chatLoading || phoneLoading) ? 'var(--text-muted)' : '#10b981',
                fontSize: '0.75rem',
                fontWeight: '600',
                cursor: (chatLoading || phoneLoading) ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              {chatLoading ? 'Carregando...' : (hasPhone ? 'Abrir conversa' : 'Configurar WhatsApp')}
            </button>
          </div>
        )}
      </nav>

      {/* Bottom Profile block */}
      <div style={{
        marginTop: collapsed ? 'auto' : '1.25rem',
        paddingTop: '1.25rem',
        borderTop: '1px solid var(--border-color)',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem'
      }}>
        {/* User Info (informative only, no click) */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: collapsed ? '0' : '0.75rem',
          justifyContent: collapsed ? 'center' : 'flex-start'
        }}>
          <div style={{
            width: '38px',
            height: '38px',
            borderRadius: '50%',
            backgroundColor: '#4f46e6',
            color: '#ffffff',
            fontSize: '0.85rem',
            fontWeight: '700',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            {getInitials(userName)}
          </div>
          {!collapsed && (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '0.88rem', fontWeight: '600', color: 'var(--text-primary)' }}>{userName}</span>
            </div>
          )}
        </div>

        {/* Sair action separated by divider */}
        {!collapsed && <div style={{ borderTop: '1px solid var(--border-color)', margin: '0.2rem 0' }} />}

        <div style={{ display: 'flex', justifyContent: collapsed ? 'center' : 'flex-start' }}>
          <button
            onClick={handleLogout}
            className="sidebar-logout-btn"
            style={{
              background: 'none',
              border: 'none',
              color: '#ef4444cc',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontSize: '0.85rem',
              fontWeight: '600',
              padding: '0.4rem 0.6rem',
              borderRadius: '6px',
              width: collapsed ? '38px' : '100%',
              justifyContent: collapsed ? 'center' : 'flex-start',
              transition: 'all 150ms ease'
            }}
            title="Sair da conta"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" style={{ width: '16px', height: '16px' }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
            </svg>
            {!collapsed && <span>Sair</span>}
          </button>
        </div>
      </div>
    </aside>
  )
}
