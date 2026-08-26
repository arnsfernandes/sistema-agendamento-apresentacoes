import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../services/supabaseClient'

export default function useAuth() {
  const [user, setUser] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [authMode, setAuthMode] = useState('login')

  // Form states
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loginError, setLoginError] = useState(null)
  const [loginSuccess, setLoginSuccess] = useState(null)
  const [loginLoading, setLoginLoading] = useState(false)
  const [name, setName] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setAuthLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        setAuthMode('update_password')
      }
      setUser(session?.user ?? null)
      setAuthLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  const handleLoginSubmit = useCallback(async (e) => {
    e.preventDefault()
    setLoginError(null)
    setLoginSuccess(null)
    setLoginLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setLoginError(error.message === 'Invalid login credentials' ? 'E-mail ou senha incorretos.' : error.message)
    } else {
      setEmail('')
      setPassword('')
    }
    setLoginLoading(false)
  }, [email, password])

  const handleSignUpSubmit = useCallback(async (e) => {
    e.preventDefault()
    setLoginError(null)
    setLoginSuccess(null)
    setLoginLoading(true)

    let normalizedWhatsapp = null
    if (whatsapp) {
      const cleanWhatsapp = whatsapp.replace(/\D/g, '')
      if (cleanWhatsapp.length !== 11 || cleanWhatsapp[2] !== '9') {
        setLoginError('Informe um número de WhatsApp válido.')
        setLoginLoading(false)
        return
      }
      normalizedWhatsapp = `55${cleanWhatsapp}`
    }

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name: name,
          ...(normalizedWhatsapp ? { whatsapp_number: normalizedWhatsapp } : {})
        }
      }
    })
    if (error) {
      setLoginError(error.message)
    } else {
      setLoginSuccess('Cadastro realizado! Verifique seu e-mail para confirmar sua conta antes de entrar.')
      setAuthMode('login')
      setName('')
      setWhatsapp('')
      setEmail('')
      setPassword('')
    }
    setLoginLoading(false)
  }, [email, password, name, whatsapp])

  const handleForgotPasswordSubmit = useCallback(async (e) => {
    e.preventDefault()
    setLoginError(null)
    setLoginSuccess(null)
    setLoginLoading(true)
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: import.meta.env.VITE_APP_URL,
    })
    if (error) {
      setLoginError(error.message)
    } else {
      setLoginSuccess('E-mail de recuperação enviado com sucesso! Verifique sua caixa de entrada.')
      setAuthMode('login')
      setEmail('')
    }
    setLoginLoading(false)
  }, [email])

  const handleUpdatePasswordSubmit = useCallback(async (e) => {
    e.preventDefault()
    setLoginError(null)
    setLoginSuccess(null)

    if (newPassword !== confirmPassword) {
      setLoginError('As senhas não coincidem.')
      return
    }

    setLoginLoading(true)
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    if (error) {
      setLoginError(error.message)
    } else {
      setLoginSuccess('Senha alterada com sucesso!')
      setNewPassword('')
      setConfirmPassword('')
      setAuthMode('login')
      await supabase.auth.signOut()
    }
    setLoginLoading(false)
  }, [newPassword, confirmPassword])

  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
  }, [])

  return {
    user,
    authLoading,
    authMode,
    setAuthMode,
    email,
    setEmail,
    password,
    setPassword,
    loginError,
    setLoginError,
    loginSuccess,
    setLoginSuccess,
    loginLoading,
    name,
    setName,
    whatsapp,
    setWhatsapp,
    newPassword,
    setNewPassword,
    confirmPassword,
    setConfirmPassword,
    handleLoginSubmit,
    handleSignUpSubmit,
    handleForgotPasswordSubmit,
    handleUpdatePasswordSubmit,
    signOut
  }
}
