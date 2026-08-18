import meetyLogo from '../assets/meety-logo.png'

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
      case 'signup': return 'Criar Conta'
      case 'forgot_password': return 'Recuperar Senha'
      case 'update_password': return 'Criar Nova Senha'
      default: return 'Acesso ao Agendamento'
    }
  }

  const getFormSubtitle = () => {
    switch (authMode) {
      case 'signup': return 'Cadastre-se para gerenciar as apresentações'
      case 'forgot_password': return 'Digite seu e-mail para receber as instruções'
      case 'update_password': return 'Digite e confirme sua nova senha'
      default: return 'Entre na sua conta para organizar e gerenciar suas apresentações.'
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
      case 'signup': return 'Cadastrar'
      case 'forgot_password': return 'Enviar E-mail'
      case 'update_password': return 'Alterar Senha'
      default: return 'Entrar'
    }
  }

  return (
    <div className="login-screen-wrapper">
      <div className="login-card">
        <div className="login-header">
          <img src={meetyLogo} alt="Meety Logo" className="login-logo-img" />
          <h2 className="login-title">{getFormTitle()}</h2>
          <p className="login-subtitle">{getFormSubtitle()}</p>
        </div>
        <form className="login-form" onSubmit={getSubmitHandler()}>
          {authMode === 'signup' && (
            <>
              <div className="form-group">
                <label className="form-label">Nome</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Seu nome"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  disabled={loginLoading}
                />
              </div>
              <div className="form-group">
                <label className="form-label">WhatsApp</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="(11) 99999-9999"
                  value={whatsapp}
                  onChange={handleWhatsappChange}
                  disabled={loginLoading}
                />
              </div>
            </>
          )}
          
          {authMode !== 'update_password' && (
            <div className="form-group">
              <label className="form-label">E-mail</label>
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
          )}

          {authMode !== 'forgot_password' && authMode !== 'update_password' && (
            <div className="form-group">
              <label className="form-label">Senha</label>
              <input
                type="password"
                className="form-input"
                placeholder="Sua senha"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loginLoading}
              />
            </div>
          )}

          {authMode === 'update_password' && (
            <>
              <div className="form-group">
                <label className="form-label">Nova Senha</label>
                <input
                  type="password"
                  className="form-input"
                  placeholder="Sua nova senha"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  disabled={loginLoading}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Confirmar Senha</label>
                <input
                  type="password"
                  className="form-input"
                  placeholder="Confirme a nova senha"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  disabled={loginLoading}
                />
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
            <>
              <p className="login-switch-text">
                Não tem uma conta?{' '}
                <button
                  type="button"
                  className="btn-link"
                  onClick={() => {
                    setAuthMode('signup')
                    setLoginError(null)
                    setLoginSuccess(null)
                  }}
                >
                  Criar conta
                </button>
              </p>
              <p className="login-switch-text" style={{ marginTop: '0.5rem' }}>
                <button
                  type="button"
                  className="btn-link"
                  onClick={() => {
                    setAuthMode('forgot_password')
                    setLoginError(null)
                    setLoginSuccess(null)
                  }}
                >
                  Esqueci minha senha
                </button>
              </p>
            </>
          )}

          {authMode === 'signup' && (
            <p className="login-switch-text">
              Já tem uma conta?{' '}
              <button
                type="button"
                className="btn-link"
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
            <p className="login-switch-text">
              <button
                type="button"
                className="btn-link"
                onClick={() => {
                  setAuthMode('login')
                  setLoginError(null)
                  setLoginSuccess(null)
                }}
              >
                Voltar para Entrar
              </button>
            </p>
          )}
        </form>
      </div>
    </div>
  )
}
