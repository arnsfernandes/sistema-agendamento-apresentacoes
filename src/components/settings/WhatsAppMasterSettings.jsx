import { useState, useEffect } from 'react'
import { supabase } from '../../services/supabaseClient'

export default function WhatsAppMasterSettings({ activeSubTab }) {
  const [whatsappStatus, setWhatsappStatus] = useState(null)
  const [whatsappLoading, setWhatsappLoading] = useState(false)
  const [whatsappError, setWhatsappError] = useState(null)

  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [logoutError, setLogoutError] = useState(null)
  const [isPairing, setIsPairing] = useState(false)

  const [isDisconnecting, setIsDisconnecting] = useState(false)
  const [disconnectError, setDisconnectError] = useState(null)
  const [disconnectSuccess, setDisconnectSuccess] = useState(null)

  const [qrCodeString, setQrCodeString] = useState(null)
  const [qrLoading, setQrLoading] = useState(false)
  const [qrError, setQrError] = useState(null)

  const handleWhatsappDisconnect = async () => {
    const confirmDisconnect = window.confirm("Tem certeza que deseja desconectar completamente o WhatsApp? O serviço de envio de mensagens ficará offline até que um novo pareamento seja iniciado.");
    if (!confirmDisconnect) return

    setIsDisconnecting(true)
    setDisconnectError(null)
    setDisconnectSuccess(null)
    try {
      const { error } = await supabase.functions.invoke('whatsapp-admin', {
        body: { action: 'disconnect' }
      })
      if (error) throw error

      setWhatsappStatus({ connected: false, number: null, name: null })
      setIsPairing(false)
      setQrCodeString(null)
      setDisconnectSuccess("Desconectado com sucesso.")
    } catch (err) {
      console.error('Erro ao desconectar WhatsApp:', err)
      setDisconnectError(err.message || 'Erro ao realizar a desconexão.')
    } finally {
      setIsDisconnecting(false)
    }
  }

  const fetchWhatsappStatus = async () => {
    setWhatsappLoading(true)
    setWhatsappError(null)
    try {
      const { data, error } = await supabase.functions.invoke('whatsapp-admin', {
        body: { action: 'status' }
      })
      if (error) throw error
      setWhatsappStatus(data)
      if (data && data.connected) {
        setIsPairing(false)
        setQrCodeString(null)
      }
    } catch (err) {
      console.error('Erro ao consultar status do WhatsApp:', err)
      setWhatsappError(err.message || 'Erro ao carregar o status.')
    } finally {
      setWhatsappLoading(false)
    }
  }

  const fetchQrCode = async () => {
    setQrError(null)
    try {
      const { data, error } = await supabase.functions.invoke('whatsapp-admin', {
        body: { action: 'qr' }
      })
      if (error) throw error
      if (data && data.available && data.qr) {
        setQrCodeString(data.qr)
        return true
      }
      return false
    } catch (err) {
      console.error('Erro ao buscar QR Code:', err)
      setQrError(err.message || 'Erro ao carregar o QR Code.')
      return false
    }
  }

  const handleWhatsappLogout = async () => {
    const confirmLogout = window.confirm("Tem certeza que deseja trocar o número? O WhatsApp atual será desconectado e você precisará escanear um novo QR Code.");
    if (!confirmLogout) return

    setIsLoggingOut(true)
    setLogoutError(null)
    setQrCodeString(null)
    try {
      const { error } = await supabase.functions.invoke('whatsapp-admin', {
        body: { action: 'logout' }
      })
      if (error) throw error
      
      setWhatsappStatus({ connected: false, number: null, name: null })
      setIsPairing(true)
    } catch (err) {
      console.error('Erro ao desconectar WhatsApp:', err)
      setLogoutError(err.message || 'Erro ao realizar o logout.')
    } finally {
      setIsLoggingOut(false)
    }
  }

  const handleStartPairing = async () => {
    setIsLoggingOut(true)
    setLogoutError(null)
    setQrCodeString(null)
    try {
      const { error } = await supabase.functions.invoke('whatsapp-admin', {
        body: { action: 'logout' }
      })
      if (error) throw error
      
      setWhatsappStatus({ connected: false, number: null, name: null })
      setIsPairing(true)
    } catch (err) {
      console.error('Erro ao iniciar conexão do WhatsApp:', err)
      setLogoutError(err.message || 'Erro ao iniciar a conexão.')
    } finally {
      setIsLoggingOut(false)
    }
  }

  useEffect(() => {
    if (activeSubTab === 'whatsapp') {
      fetchWhatsappStatus()
    }
  }, [activeSubTab])

  useEffect(() => {
    let intervalId = null
    
    if (activeSubTab === 'whatsapp' && isPairing && !qrCodeString) {
      setQrLoading(true)
      const poll = async () => {
        const success = await fetchQrCode()
        if (success) {
          setQrLoading(false)
          clearInterval(intervalId)
        }
      }
      
      poll()
      intervalId = setInterval(poll, 3000)
    }

    return () => {
      if (intervalId) clearInterval(intervalId)
    }
  }, [activeSubTab, isPairing, qrCodeString])

  useEffect(() => {
    let intervalId = null

    if (activeSubTab === 'whatsapp' && isPairing) {
      const pollStatus = async () => {
        try {
          const { data, error } = await supabase.functions.invoke('whatsapp-admin', {
            body: { action: 'status' }
          })
          if (error) throw error
          if (data && data.connected) {
            setWhatsappStatus(data)
            setIsPairing(false)
            setQrCodeString(null)
          }
        } catch (err) {
          console.error('Erro no polling de status do WhatsApp:', err)
        }
      }

      intervalId = setInterval(pollStatus, 4000)
    }

    return () => {
      if (intervalId) clearInterval(intervalId)
    }
  }, [activeSubTab, isPairing])

  return (
    <div className="settings-section-card">
      <h3 className="settings-section-title">WhatsApp Master</h3>
      <p className="settings-section-subtitle">
        Gerencie o número de WhatsApp usado pelo Meety para o envio automático de mensagens.
      </p>

      <div style={{ marginTop: '1.5rem' }}>
        {whatsappLoading ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            <div className="loading-spinner" style={{ width: '20px', height: '20px', borderWidth: '2px' }}></div>
            <span>Carregando status do WhatsApp...</span>
          </div>
        ) : whatsappError ? (
          <div>
            <p style={{ color: 'var(--text-error)', fontSize: '0.9rem', margin: 0 }}>
              {whatsappError}
            </p>
            <button
              type="button"
              className="btn btn-secondary"
              style={{ marginTop: '1rem' }}
              onClick={fetchWhatsappStatus}
            >
              Tentar novamente
            </button>
          </div>
        ) : whatsappStatus ? (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
              <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Status da conexão:</span>
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                padding: '0.25rem 0.75rem',
                borderRadius: '50px',
                fontSize: '0.85rem',
                fontWeight: '600',
                backgroundColor: whatsappStatus.connected ? 'rgba(16, 185, 129, 0.1)' : 'rgba(107, 114, 128, 0.1)',
                color: whatsappStatus.connected ? '#10b981' : 'var(--text-secondary)'
              }}>
                {whatsappStatus.connected ? 'Conectado' : 'Desconectado'}
              </span>
            </div>

            {whatsappStatus.connected && (
              <div style={{ marginTop: '1rem' }}>
                {whatsappStatus.number && (
                  <div style={{ fontSize: '0.9rem', color: 'var(--text-primary)', marginBottom: '1rem' }}>
                    <strong>Número conectado:</strong> {whatsappStatus.number}
                  </div>
                )}
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={handleWhatsappLogout}
                    disabled={isLoggingOut || isDisconnecting}
                  >
                    {isLoggingOut ? 'Processando...' : 'Trocar número'}
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    style={{ backgroundColor: 'var(--text-error, #ef4444)', borderColor: 'var(--text-error, #ef4444)', color: '#ffffff' }}
                    onClick={handleWhatsappDisconnect}
                    disabled={isLoggingOut || isDisconnecting}
                  >
                    {isDisconnecting ? 'Desconectando...' : 'Desconectar'}
                  </button>
                  {(isLoggingOut || isDisconnecting) && (
                    <div className="loading-spinner" style={{ width: '16px', height: '16px', borderWidth: '2px' }}></div>
                  )}
                </div>
                {logoutError && (
                  <p style={{ color: 'var(--text-error)', fontSize: '0.85rem', marginTop: '0.5rem', marginBottom: 0 }}>
                    {logoutError}
                  </p>
                )}
                {disconnectError && (
                  <p style={{ color: 'var(--text-error)', fontSize: '0.85rem', marginTop: '0.5rem', marginBottom: 0 }}>
                    {disconnectError}
                  </p>
                )}
                {disconnectSuccess && (
                  <p style={{ color: '#10b981', fontSize: '0.85rem', marginTop: '0.5rem', marginBottom: 0 }}>
                    {disconnectSuccess}
                  </p>
                )}
              </div>
            )}

            {!whatsappStatus.connected && !isPairing && (
              <div style={{ marginTop: '1rem' }}>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
                  Nenhum WhatsApp está conectado.
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={handleStartPairing}
                    disabled={isLoggingOut}
                  >
                    {isLoggingOut ? 'Iniciando...' : 'Conectar número'}
                  </button>
                  {isLoggingOut && (
                    <div className="loading-spinner" style={{ width: '16px', height: '16px', borderWidth: '2px' }}></div>
                  )}
                </div>
                {logoutError && (
                  <p style={{ color: 'var(--text-error)', fontSize: '0.85rem', marginTop: '0.5rem', marginBottom: 0 }}>
                    {logoutError}
                  </p>
                )}
              </div>
            )}

            {isPairing && (
              <div style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'flex-start' }}>
                <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                  Status: <strong>Aguardando pareamento...</strong>
                </div>

                {qrLoading && !qrCodeString && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                    <div className="loading-spinner" style={{ width: '18px', height: '18px', borderWidth: '2px' }}></div>
                    <span>Gerando QR Code...</span>
                  </div>
                )}

                {qrError && (
                  <p style={{ color: 'var(--text-error)', fontSize: '0.85rem', margin: 0 }}>
                    {qrError}
                  </p>
                )}

                {qrCodeString && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'flex-start' }}>
                    <div style={{
                      padding: '1rem',
                      backgroundColor: '#ffffff',
                      borderRadius: '8px',
                      border: '1px solid var(--border-color)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <img
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(qrCodeString)}`}
                        alt="WhatsApp Master QR Code"
                        style={{ width: '180px', height: '180px' }}
                      />
                    </div>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0, maxWidth: '320px', lineHeight: '1.4' }}>
                      Abra o WhatsApp no novo celular e escaneie este QR Code em <strong>Aparelhos conectados</strong>.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  )
}
