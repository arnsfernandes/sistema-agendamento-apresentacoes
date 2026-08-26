import { useState } from 'react'

export default function AuthView({
  authMode,
  setAuthMode,
  name,
  setName,
  email,
  setEmail,
  password,
  setPassword,
  whatsapp,
  setWhatsapp,
  newPassword,
  setNewPassword,
  confirmPassword,
  setConfirmPassword,
  loginError,
  setLoginError,
  loginSuccess,
  setLoginSuccess,
  loginLoading,
  handleLoginSubmit,
  handleSignUpSubmit,
  handleForgotPasswordSubmit,
  handleUpdatePasswordSubmit
}) {
  const [showPwd, setShowPwd] = useState(false)
  const [showConfirmPwd, setShowConfirmPwd] = useState(false)

  const handleWhatsappChange = (e) => {
    let value = e.target.value.replace(/\D/g, '')
    if (value.length > 11) value = value.slice(0, 11)
    
    let formatted = ''
    if (value.length > 0) {
      formatted += `(${value.slice(0, 2)}`
    }
    if (value.length > 2) {
      formatted += `) ${value.slice(2, 7)}`
    }
    if (value.length > 7) {
      formatted += `-${value.slice(7, 11)}`
    }
    setWhatsapp(formatted || value)
  }

  const getFormTitle = () => {
    switch (authMode) {
      case 'signup': return 'Crie sua conta'
      case 'forgot_password': return 'Recupere seu acesso'
      case 'update_password': return 'Criar Nova Senha'
      default: return 'Entre na sua conta'
    }
  }

  const getFormSubtitle = () => {
    switch (authMode) {
      case 'signup': return 'É rápido e fácil começar.'
      case 'forgot_password': return 'Informe seu e-mail para receber as instruções de recuperação.'
      case 'update_password': return 'Digite e confirme sua nova senha'
      default: return 'Acesse sua agenda, clientes e reuniões.'
    }
  }

  const getSubmitHandler = () => {
    switch (authMode) {
      case 'signup': return handleSignUpSubmit
      case 'forgot_password': return handleForgotPasswordSubmit
      case 'update_password': return handleUpdatePasswordSubmit
      default: return handleLoginSubmit
    }
  }

  const getSubmitLabel = () => {
    if (loginLoading) return 'Carregando...'
    switch (authMode) {
      case 'signup': return 'Criar conta'
      case 'forgot_password': return 'Enviar instruções'
      case 'update_password': return 'Alterar Senha'
      default: return 'Entrar'
    }
  }

  return (
    <div className="auth-screen-layout">
      {/* Left Column: Branding and Benefits */}
      <div className="auth-left-branding">
        {/* Meety Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', height: '40px', marginBottom: '40px' }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
            <path d="M4 5V19L10 12L14 16L20 5V19" stroke="url(#logoGradAuth)" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
            <defs>
              <linearGradient id="logoGradAuth" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#6366f1" />
                <stop offset="100%" stopColor="#a855f7" />
              </linearGradient>
            </defs>
          </svg>
          <span style={{ color: '#F8FAFC', fontWeight: 700, fontSize: '24px', fontFamily: "'Outfit', sans-serif", lineHeight: 1 }}>Meety</span>
        </div>

        <h1 className="auth-left-title">
          Organize suas reuniões em um <br />
          <span className="auth-highlight-text">só lugar</span>
        </h1>
        <p className="auth-left-subtitle">
          Agenda, clientes e automações conectados para facilitar seu dia.
        </p>

        {/* Benefits List */}
        <div className="auth-benefits-list">
          {/* Benefit 1 */}
          <div className="auth-benefit-item">
            <div className="auth-benefit-icon" style={{ backgroundColor: 'rgba(99, 102, 241, 0.1)', border: '1px solid rgba(99, 102, 241, 0.2)' }}>
              <svg style={{ width: '20px', height: '20px', color: '#6366F1' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div className="auth-benefit-content">
              <h4 className="auth-benefit-title">Agenda integrada</h4>
              <p className="auth-benefit-desc">Sincronize com o Google Agenda e gerencie suas reuniões.</p>
            </div>
          </div>

          {/* Benefit 2 */}
          <div className="auth-benefit-item">
            <div className="auth-benefit-icon" style={{ backgroundColor: 'rgba(168, 85, 247, 0.1)', border: '1px solid rgba(168, 85, 247, 0.2)' }}>
              <svg style={{ width: '20px', height: '20px', color: '#A855F7' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 005.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div className="auth-benefit-content">
              <h4 className="auth-benefit-title">Clientes organizados</h4>
              <p className="auth-benefit-desc">Tenha todos os seus clientes e histórico sempre à mão.</p>
            </div>
          </div>

          {/* Benefit 3 */}
          <div className="auth-benefit-item">
            <div className="auth-benefit-icon" style={{ backgroundColor: 'rgba(6, 182, 212, 0.1)', border: '1px solid rgba(6, 182, 212, 0.2)' }}>
              <svg style={{ width: '20px', height: '20px', color: '#06B6D4' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
            </div>
            <div className="auth-benefit-content">
              <h4 className="auth-benefit-title">Agente de IA no WhatsApp</h4>
              <p className="auth-benefit-desc">Automatize agendamentos e lembretes com o nosso agente inteligente.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Right Column: Form Container */}
      <div className="auth-right-form">
        <div className="auth-form-card">
          <div className="auth-form-header">
            <h2 className="auth-form-title">{getFormTitle()}</h2>
            <p className="auth-form-subtitle">{getFormSubtitle()}</p>
          </div>

          <form className="auth-form" onSubmit={getSubmitHandler()}>
            {authMode === 'signup' && (
              <>
                <div className="form-group">
                  <label className="form-label">Nome completo</label>
                  <div className="form-input-container">
                    <span className="form-input-icon">
                      <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </span>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Seu nome completo"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      disabled={loginLoading}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">WhatsApp</label>
                  <div className="form-input-container">
                    <span className="form-input-icon">
                      <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                    </span>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="(11) 99999-9999"
                      value={whatsapp}
                      onChange={handleWhatsappChange}
                      disabled={loginLoading}
                    />
                  </div>
                </div>
              </>
            )}

            {authMode !== 'update_password' && (
              <div className="form-group">
                <label className="form-label">E-mail</label>
                <div className="form-input-container">
                  <span className="form-input-icon">
                    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </span>
                  <input
                    type="email"
                    className="form-input"
                    placeholder="seu-email@dominio.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={loginLoading}
                  />
                </div>
              </div>
            )}

            {authMode !== 'forgot_password' && authMode !== 'update_password' && (
              <div className="form-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <label className="form-label" style={{ margin: 0 }}>Senha</label>
                  {authMode === 'login' && (
                    <button
                      type="button"
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#3b82f6',
                        fontSize: '0.8rem',
                        fontWeight: '500',
                        cursor: 'pointer',
                        padding: 0
                      }}
                      onClick={() => {
                        setAuthMode('forgot_password')
                        setLoginError(null)
                        setLoginSuccess(null)
                      }}
                    >
                      Esqueci minha senha
                    </button>
                  )}
                </div>
                <div className="form-input-container">
                  <span className="form-input-icon">
                    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </span>
                  <input
                    type={showPwd ? 'text' : 'password'}
                    className="form-input"
                    placeholder="Sua senha"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={loginLoading}
                  />
                  <button
                    type="button"
                    className="form-input-eye"
                    onClick={() => setShowPwd(!showPwd)}
                  >
                    {showPwd ? (
                      <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                      </svg>
                    ) : (
                      <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
            )}

            {authMode === 'update_password' && (
              <>
                <div className="form-group">
                  <label className="form-label">Nova Senha</label>
                  <div className="form-input-container">
                    <span className="form-input-icon">
                      <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                    </span>
                    <input
                      type={showPwd ? 'text' : 'password'}
                      className="form-input"
                      placeholder="Sua nova senha"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                      disabled={loginLoading}
                    />
                    <button
                      type="button"
                      className="form-input-eye"
                      onClick={() => setShowPwd(!showPwd)}
                    >
                      {showPwd ? (
                        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                        </svg>
                      ) : (
                        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Confirmar Senha</label>
                  <div className="form-input-container">
                    <span className="form-input-icon">
                      <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                    </span>
                    <input
                      type={showConfirmPwd ? 'text' : 'password'}
                      className="form-input"
                      placeholder="Confirme a nova senha"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      disabled={loginLoading}
                    />
                    <button
                      type="button"
                      className="form-input-eye"
                      onClick={() => setShowConfirmPwd(!showConfirmPwd)}
                    >
                      {showConfirmPwd ? (
                        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                        </svg>
                      ) : (
                        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>
              </>
            )}

            {loginError && <span className="login-error-msg">{loginError}</span>}
            {loginSuccess && <span className="login-success-msg">{loginSuccess}</span>}

            <button
              className="btn btn-primary btn-login"
              type="submit"
              disabled={loginLoading}
            >
              {getSubmitLabel()}
            </button>

            {authMode === 'login' && (
              <p className="login-switch-text" style={{ marginTop: '1.5rem', color: '#94A3B8' }}>
                Ainda não tem uma conta?{' '}
                <button
                  type="button"
                  className="btn-link"
                  style={{ color: '#3b82f6', fontWeight: '600' }}
                  onClick={() => {
                    setAuthMode('signup')
                    setLoginError(null)
                    setLoginSuccess(null)
                  }}
                >
                  Criar conta
                </button>
              </p>
            )}

            {authMode === 'signup' && (
              <p className="login-switch-text" style={{ marginTop: '1.5rem', color: '#94A3B8' }}>
                Já tem uma conta?{' '}
                <button
                  type="button"
                  className="btn-link"
                  style={{ color: '#3b82f6', fontWeight: '600' }}
                  onClick={() => {
                    setAuthMode('login')
                    setLoginError(null)
                    setLoginSuccess(null)
                  }}
                >
                  Entrar
                </button>
              </p>
            )}

            {authMode === 'forgot_password' && (
              <p className="login-switch-text" style={{ marginTop: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                <button
                  type="button"
                  className="btn-link"
                  style={{ color: '#3b82f6', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px' }}
                  onClick={() => {
                    setAuthMode('login')
                    setLoginError(null)
                    setLoginSuccess(null)
                  }}
                >
                  ← Voltar para o login
                </button>
              </p>
            )}
          </form>
        </div>
      </div>
    </div>
  )
}
