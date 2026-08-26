import { useState } from 'react'
import { supabase } from '../../services/supabaseClient'

export default function ChangePasswordForm() {
  const [isSenhaHovered, setIsSenhaHovered] = useState(false)
  const [isChangingPassword, setIsChangingPassword] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordSaving, setPasswordSaving] = useState(false)
  const [passwordError, setPasswordError] = useState(null)
  const [passwordSuccess, setPasswordSuccess] = useState(null)

  const handleCancelPasswordChange = () => {
    setIsChangingPassword(false)
    setNewPassword('')
    setConfirmPassword('')
    setPasswordError(null)
    setPasswordSuccess(null)
  }

  const handleSavePassword = async () => {
    setPasswordError(null)
    setPasswordSuccess(null)

    if (newPassword.length < 6) {
      setPasswordError('A senha deve ter no mínimo 6 caracteres.')
      return
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('As senhas não coincidem.')
      return
    }

    setPasswordSaving(true)
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword })
      if (error) {
        setPasswordError(error.message)
      } else {
        setPasswordSuccess('Senha alterada com sucesso!')
        setNewPassword('')
        setConfirmPassword('')
        setIsChangingPassword(false)
      }
    } catch {
      setPasswordError('Erro ao atualizar a senha.')
    } finally {
      setPasswordSaving(false)
    }
  }

  return (
    <>
      <hr style={{ border: 'none', borderTop: '1px solid rgba(255, 255, 255, 0.08)', margin: '2rem 0' }} />

      {!isChangingPassword ? (
        <div>
          <button
            type="button"
            onClick={() => {
              setIsChangingPassword(true)
              setPasswordError(null)
              setPasswordSuccess(null)
            }}
            onMouseEnter={() => setIsSenhaHovered(true)}
            onMouseLeave={() => setIsSenhaHovered(false)}
            style={{
              height: '44px',
              borderRadius: '10px',
              backgroundColor: isSenhaHovered ? '#1e2030' : '#11131F',
              border: isSenhaHovered ? '1px solid rgba(167, 139, 250, 0.45)' : '1px solid rgba(148, 163, 184, 0.24)',
              color: '#E2E8F0',
              padding: '0 16px',
              fontWeight: '600',
              fontSize: '0.9rem',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.15s ease'
            }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="#A78BFA" style={{ width: '16px', height: '16px' }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
            </svg>
            Alterar senha
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: '400px' }}>
          <h4 style={{ fontSize: '0.95rem', fontWeight: '600', color: '#F8FAFC', margin: 0 }}>Alterar Senha</h4>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '13px', fontWeight: '600', color: '#E2E8F0' }}>Nova senha</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              disabled={passwordSaving}
              placeholder="Mínimo 6 caracteres"
              style={{
                width: '100%',
                height: '42px',
                borderRadius: '8px',
                backgroundColor: '#11131F',
                border: '1px solid rgba(148, 163, 184, 0.20)',
                color: '#F8FAFC',
                padding: '0 12px',
                boxSizing: 'border-box',
                outline: 'none'
              }}
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '13px', fontWeight: '600', color: '#E2E8F0' }}>Confirmar nova senha</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={passwordSaving}
              style={{
                width: '100%',
                height: '42px',
                borderRadius: '8px',
                backgroundColor: '#11131F',
                border: '1px solid rgba(148, 163, 184, 0.20)',
                color: '#F8FAFC',
                padding: '0 12px',
                boxSizing: 'border-box',
                outline: 'none'
              }}
            />
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
            <button
              type="button"
              onClick={handleSavePassword}
              disabled={passwordSaving}
              style={{
                height: '40px',
                borderRadius: '8px',
                background: 'linear-gradient(90deg, #6366F1 0%, #7C3AED 100%)',
                color: '#ffffff',
                border: 'none',
                padding: '0 20px',
                fontWeight: '600',
                fontSize: '0.85rem',
                cursor: 'pointer'
              }}
            >
              {passwordSaving ? 'Salvando...' : 'Salvar nova senha'}
            </button>
            <button
              type="button"
              onClick={handleCancelPasswordChange}
              disabled={passwordSaving}
              style={{
                height: '40px',
                borderRadius: '8px',
                backgroundColor: 'transparent',
                border: '1px solid rgba(148, 163, 184, 0.22)',
                color: '#E2E8F0',
                padding: '0 20px',
                fontWeight: '600',
                fontSize: '0.85rem',
                cursor: 'pointer'
              }}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {passwordError && (
        <p style={{ color: '#ef4444', fontSize: '0.875rem', marginTop: '0.5rem', margin: 0 }}>
          {passwordError}
        </p>
      )}
      {passwordSuccess && (
        <p style={{ color: '#10b981', fontSize: '0.875rem', marginTop: '0.5rem', margin: 0 }}>
          {passwordSuccess}
        </p>
      )}
    </>
  )
}
