import { useState, useEffect } from 'react'
import { supabase } from '../../services/supabaseClient'
import AvatarSection from './AvatarSection'
import ChangePasswordForm from './ChangePasswordForm'

export default function AccountSettings({ user }) {
  const [focusedInput, setFocusedInput] = useState(null)
  const [isEditing, setIsEditing] = useState(false)
  const [newName, setNewName] = useState(user?.user_metadata?.name || '')
  const [savedWhatsapp, setSavedWhatsapp] = useState('')
  const [newWhatsapp, setNewWhatsapp] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [errorMsg, setErrorMsg] = useState(null)
  const [successMsg, setSuccessMsg] = useState(null)

  const [avatarLoading, setAvatarLoading] = useState(false)
  const [avatarError, setAvatarError] = useState(null)

  const formatWhatsapp = (val) => {
    if (!val) return ''
    let clean = val.replace(/\D/g, '')
    if (clean.startsWith('55') && clean.length === 13) {
      clean = clean.slice(2)
    }
    if (clean.length > 7) {
      return `(${clean.slice(0, 2)}) ${clean.slice(2, 7)}-${clean.slice(7, 11)}`
    }
    if (clean.length > 2) {
      return `(${clean.slice(0, 2)}) ${clean.slice(2)}`
    }
    return clean ? `(${clean}` : ''
  }

  const getInitials = (name) => {
    if (!name) return '?'
    const parts = name.trim().split(' ')
    if (parts.length === 1) return parts[0].substring(0, 1).toUpperCase()
    return (parts[0].substring(0, 1) + parts[parts.length - 1].substring(0, 1)).toUpperCase()
  }

  const handleEdit = () => {
    setIsEditing(true)
    setErrorMsg(null)
    setSuccessMsg(null)
  }

  const handleWhatsappChange = (e) => {
    let value = e.target.value.replace(/\D/g, '')
    if (value.startsWith('55') && value.length === 13) {
      value = value.slice(2)
    }
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
    setNewWhatsapp(formatted || value)
  }

  const handleCancel = () => {
    setIsEditing(false)
    setNewName(user?.user_metadata?.name || '')
    setNewWhatsapp(formatWhatsapp(savedWhatsapp))
    setErrorMsg(null)
  }

  const handleSave = async () => {
    setErrorMsg(null)
    setSuccessMsg(null)
    setIsSaving(true)

    let normalizedWhatsapp = null
    if (newWhatsapp) {
      const cleanWhatsapp = newWhatsapp.replace(/\D/g, '')
      if (cleanWhatsapp.length !== 11 || cleanWhatsapp[2] !== '9') {
        setErrorMsg('Informe um número de WhatsApp válido.')
        setIsSaving(false)
        return
      }
      normalizedWhatsapp = `55${cleanWhatsapp}`
    }

    try {
      const { error: authError } = await supabase.auth.updateUser({
        data: { 
          name: newName
        }
      })
      if (authError) throw authError

      if (normalizedWhatsapp) {
        const { error: dbError } = await supabase
          .from('usuario_whatsapp')
          .upsert({
            user_id: user.id,
            whatsapp_number: normalizedWhatsapp,
            updated_at: new Date().toISOString()
          })
        if (dbError) throw dbError
        setSavedWhatsapp(normalizedWhatsapp)
      } else {
        const { error: dbError } = await supabase
          .from('usuario_whatsapp')
          .delete()
          .eq('user_id', user.id)
        if (dbError) throw dbError
        setSavedWhatsapp('')
      }

      setSuccessMsg('Dados atualizados com sucesso!')
      setIsEditing(false)
    } catch (err) {
      setErrorMsg(err?.message || 'Erro ao atualizar os dados.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleAvatarUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    setAvatarError(null)

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      setAvatarError('Apenas arquivos JPG, PNG e WebP são permitidos.')
      return
    }

    const maxSize = 2 * 1024 * 1024
    if (file.size > maxSize) {
      setAvatarError('O tamanho da imagem deve ser menor que 2MB.')
      return
    }

    setAvatarLoading(true)
    try {
      const fileExt = file.name.split('.').pop().toLowerCase()
      const fileName = `${user.id}.${fileExt}`

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, { upsert: true })

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName)

      const oldAvatarUrl = user?.user_metadata?.avatar_url

      const { error: updateError } = await supabase.auth.updateUser({
        data: { avatar_url: publicUrl }
      })

      if (updateError) throw updateError

      if (oldAvatarUrl) {
        try {
          const oldFileName = oldAvatarUrl.split('/').pop().split('?')[0]
          if (oldFileName !== fileName) {
            const { error: removeError } = await supabase.storage.from('avatars').remove([oldFileName])
            if (removeError) {
              console.error('Erro ao limpar avatar antigo:', removeError.message)
            }
          }
        } catch (cleanupErr) {
          console.error('Erro ao limpar avatar antigo:', cleanupErr)
        }
      }
    } catch (err) {
      setAvatarError(err.message || 'Erro ao enviar a imagem de perfil.')
    } finally {
      setAvatarLoading(false)
      e.target.value = ''
    }
  }

  const handleAvatarRemove = async () => {
    setAvatarError(null)
    setAvatarLoading(true)
    try {
      const oldAvatarUrl = user?.user_metadata?.avatar_url
      if (!oldAvatarUrl) return

      const oldFileName = oldAvatarUrl.split('/').pop().split('?')[0]

      const { error: removeError } = await supabase.storage.from('avatars').remove([oldFileName])
      if (removeError) throw removeError

      const { error: updateError } = await supabase.auth.updateUser({
        data: { avatar_url: null }
      })
      if (updateError) throw updateError
    } catch (err) {
      setAvatarError(err.message || 'Erro ao remover a imagem de perfil.')
    } finally {
      setAvatarLoading(false)
    }
  }

  useEffect(() => {
    setNewName(user?.user_metadata?.name || '')
    const fetchWhatsappNumber = async () => {
      if (!user) return
      try {
        const { data, error } = await supabase
          .from('usuario_whatsapp')
          .select('whatsapp_number')
          .eq('user_id', user.id)
          .maybeSingle()
        if (error) throw error
        if (data && data.whatsapp_number) {
          setSavedWhatsapp(data.whatsapp_number)
          setNewWhatsapp(formatWhatsapp(data.whatsapp_number))
        } else {
          setSavedWhatsapp('')
          setNewWhatsapp('')
        }
      } catch (err) {
        console.error('Erro ao buscar whatsapp_number:', err)
      }
    }
    fetchWhatsappNumber()
  }, [user])

  return (
    <div className="settings-section-card" style={{
      backgroundColor: '#0B0C16',
      border: '1px solid rgba(124, 92, 255, 0.28)',
      boxShadow: '0 0 24px rgba(124, 92, 255, 0.06)',
      borderRadius: '18px',
      padding: '28px',
      boxSizing: 'border-box'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1.5rem' }}>
        <div style={{
          width: '42px',
          height: '42px',
          borderRadius: '50%',
          backgroundColor: 'rgba(124, 92, 255, 0.15)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#a855f7',
          flexShrink: 0
        }}>
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" style={{ width: '20px', height: '20px' }}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
          </svg>
        </div>
        <div>
          <h3 className="settings-section-title" style={{ fontSize: '20px', fontWeight: '700', color: '#F8FAFC', margin: 0, letterSpacing: 'normal', textTransform: 'none' }}>Minha Conta</h3>
          <p className="settings-section-subtitle" style={{ fontSize: '14px', color: '#94A3B8', margin: 0 }}>Informações básicas do seu perfil de usuário.</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '220px 1px 1fr', gap: '32px', marginTop: '1.5rem', alignItems: 'start' }}>
        {/* Coluna Esquerda: Foto */}
        <AvatarSection
          user={user}
          avatarLoading={avatarLoading}
          avatarError={avatarError}
          handleAvatarUpload={handleAvatarUpload}
          handleAvatarRemove={handleAvatarRemove}
          getInitials={getInitials}
        />

        {/* Divisor vertical */}
        <div style={{ width: '1px', alignSelf: 'stretch', backgroundColor: 'rgba(255, 255, 255, 0.08)' }} />

        {/* Coluna Direita: Dados */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', width: '100%' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '13px', fontWeight: '600', color: '#E2E8F0' }}>Nome</label>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              backgroundColor: '#11131F',
              border: focusedInput === 'nome' ? '1px solid #6366F1' : '1px solid rgba(148, 163, 184, 0.20)',
              borderRadius: '10px',
              height: '52px',
              padding: '0 16px',
              transition: 'all 0.15s ease',
              boxShadow: focusedInput === 'nome' ? '0 0 0 3px rgba(99, 102, 241, 0.10)' : 'none'
            }}>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                disabled={!isEditing || isSaving}
                onFocus={() => setFocusedInput('nome')}
                onBlur={() => setFocusedInput(null)}
                style={{
                  width: '100%',
                  height: '100%',
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  color: '#F8FAFC',
                  fontSize: '15px'
                }}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '13px', fontWeight: '600', color: '#E2E8F0' }}>WhatsApp</label>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              backgroundColor: '#11131F',
              border: focusedInput === 'whatsapp' ? '1px solid #6366F1' : '1px solid rgba(148, 163, 184, 0.20)',
              borderRadius: '10px',
              height: '52px',
              padding: '0 16px',
              transition: 'all 0.15s ease',
              boxShadow: focusedInput === 'whatsapp' ? '0 0 0 3px rgba(99, 102, 241, 0.10)' : 'none'
            }}>
              <input
                type="text"
                value={newWhatsapp}
                onChange={handleWhatsappChange}
                disabled={!isEditing || isSaving}
                placeholder="(00) 90000-0000"
                onFocus={() => setFocusedInput('whatsapp')}
                onBlur={() => setFocusedInput(null)}
                style={{
                  width: '100%',
                  height: '100%',
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  color: '#F8FAFC',
                  fontSize: '15px'
                }}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '13px', fontWeight: '600', color: '#E2E8F0' }}>E-mail</label>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              backgroundColor: '#11131F',
              border: focusedInput === 'email' ? '1px solid #6366F1' : '1px solid rgba(148, 163, 184, 0.20)',
              borderRadius: '10px',
              height: '52px',
              padding: '0 16px',
              transition: 'all 0.15s ease',
              boxShadow: focusedInput === 'email' ? '0 0 0 3px rgba(99, 102, 241, 0.10)' : 'none',
              opacity: 0.6
            }}>
              <input
                type="email"
                value={user?.email || ''}
                readOnly
                disabled
                onFocus={() => setFocusedInput('email')}
                onBlur={() => setFocusedInput(null)}
                style={{
                  width: '100%',
                  height: '100%',
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  color: '#F8FAFC',
                  fontSize: '15px',
                  cursor: 'not-allowed'
                }}
              />
            </div>
          </div>

          {errorMsg && (
            <p style={{ color: '#ef4444', fontSize: '0.875rem', margin: 0 }}>
              {errorMsg}
            </p>
          )}
          {successMsg && (
            <p style={{ color: '#10b981', fontSize: '0.875rem', margin: 0 }}>
              {successMsg}
            </p>
          )}

          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
            {!isEditing ? (
              <button
                type="button"
                onClick={handleEdit}
                style={{
                  height: '48px',
                  borderRadius: '10px',
                  background: 'linear-gradient(90deg, #6366F1 0%, #7C3AED 100%)',
                  color: '#ffffff',
                  border: 'none',
                  padding: '0 24px',
                  fontWeight: '600',
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                  boxShadow: '0 0 16px rgba(124, 58, 237, 0.25)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                Editar dados
              </button>
            ) : (
              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={isSaving}
                  style={{
                    height: '48px',
                    borderRadius: '10px',
                    background: 'linear-gradient(90deg, #6366F1 0%, #7C3AED 100%)',
                    color: '#ffffff',
                    border: 'none',
                    padding: '0 24px',
                    fontWeight: '600',
                    fontSize: '0.9rem',
                    cursor: 'pointer',
                    boxShadow: '0 0 16px rgba(124, 58, 237, 0.25)'
                  }}
                >
                  {isSaving ? 'Salvando...' : 'Salvar alterações'}
                </button>
                <button
                  type="button"
                  onClick={handleCancel}
                  disabled={isSaving}
                  style={{
                    height: '48px',
                    borderRadius: '10px',
                    backgroundColor: 'transparent',
                    border: '1px solid rgba(148, 163, 184, 0.22)',
                    color: '#E2E8F0',
                    padding: '0 24px',
                    fontWeight: '600',
                    fontSize: '0.9rem',
                    cursor: 'pointer'
                  }}
                >
                  Cancelar
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <ChangePasswordForm />
    </div>
  )
}
