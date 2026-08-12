import { useEffect, useState } from 'react'
import meetyLogo from '../assets/meety-logo.png'

export default function PrivacyView() {
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('theme') || 'light'
  })

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('theme', theme)
  }, [theme])

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: 'var(--bg-primary)',
      color: 'var(--text-primary)',
      fontFamily: 'Inter, sans-serif',
      transition: 'background-color 0.2s ease, color 0.2s ease',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '2rem 1.5rem'
    }}>
      <header style={{
        maxWidth: '800px',
        width: '100%',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '3rem',
        paddingBottom: '1rem',
        borderBottom: '1px solid var(--border-color)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <img src={meetyLogo} alt="Meety Logo" style={{ height: '32px' }} />
          <span style={{ fontSize: '1.25rem', fontWeight: '700', color: 'var(--text-primary)' }}>Meety</span>
        </div>
        <button
          onClick={() => setTheme(prev => prev === 'light' ? 'dark' : 'light')}
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            color: 'var(--text-primary)',
            padding: '0.5rem 1rem',
            borderRadius: '8px',
            fontSize: '0.85rem',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
        >
          {theme === 'light' ? 'Escuro 🌙' : 'Claro ☀️'}
        </button>
      </header>

      <main style={{
        maxWidth: '800px',
        width: '100%',
        backgroundColor: 'var(--bg-card)',
        border: '1px solid var(--border-color)',
        borderRadius: '16px',
        padding: '2.5rem',
        boxSizing: 'border-box',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
      }}>
        <h1 style={{ fontSize: '2rem', fontWeight: '800', marginBottom: '0.5rem', color: 'var(--text-primary)' }}>
          Política de Privacidade
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '2rem' }}>
          Última atualização: 12 de agosto de 2026
        </p>

        <section style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', lineHeight: '1.6' }}>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: '700', marginBottom: '0.75rem', color: 'var(--text-primary)' }}>
              1. Finalidade do Meety
            </h2>
            <p style={{ color: 'var(--text-secondary)' }}>
              O Meety é uma plataforma interna desenvolvida para facilitar o agendamento e a gestão de apresentações comerciais. O objetivo é permitir que atendentes organizem reuniões de forma integrada com o Google Agenda, otimizando o fluxo de contatos sem a necessidade de acessar diretamente as configurações manuais do calendário do Google.
            </p>
          </div>

          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: '700', marginBottom: '0.75rem', color: 'var(--text-primary)' }}>
              2. Dados do Google Agenda Acessados
            </h2>
            <p style={{ color: 'var(--text-secondary)' }}>
              Para oferecer a sincronização em tempo real, o Meety solicita acesso aos seguintes escopos de dados da API do Google Calendar:
            </p>
            <ul style={{ color: 'var(--text-secondary)', paddingLeft: '1.25rem', marginTop: '0.5rem' }}>
              <li><strong>Leitura de Calendários:</strong> Para obter as agendas disponíveis e permitir que você selecione qual agenda usar.</li>
              <li><strong>Escrita e Alteração de Eventos:</strong> Para criar eventos de reuniões comerciais, adicionar participantes, preencher o link da sala (Google Meet) e gerenciar cancelamentos ou remarcações de horários.</li>
            </ul>
          </div>

          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: '700', marginBottom: '0.75rem', color: 'var(--text-primary)' }}>
              3. Como esses dados são usados
            </h2>
            <p style={{ color: 'var(--text-secondary)' }}>
              Os dados de eventos de calendário lidos e escritos são utilizados exclusivamente para sincronizar a agenda do Meety com o Google Agenda do usuário. O Meety utiliza as credenciais seguras para:
            </p>
            <ul style={{ color: 'var(--text-secondary)', paddingLeft: '1.25rem', marginTop: '0.5rem' }}>
              <li>Criar novas reuniões comerciais.</li>
              <li>Alterar datas e horários de apresentações.</li>
              <li>Inserir salas de conferência do Google Meet.</li>
              <li>Identificar eventos que foram cancelados ou modificados remotamente pelo Google Agenda para refletir as alterações no painel do sistema.</li>
            </ul>
          </div>

          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: '700', marginBottom: '0.75rem', color: 'var(--text-primary)' }}>
              4. Privacidade dos Dados dos Clientes
            </h2>
            <p style={{ color: 'var(--text-secondary)' }}>
              O Meety preza pela privacidade dos seus clientes. As informações internas de clientes e participantes (como telefones, observações de atendimento e histórico de contatos) **não são enviadas ao Google Agenda**. Apenas o título da apresentação, o horário e o e-mail do participante são utilizados para a criação do evento no Google Calendar.
            </p>
          </div>

          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: '700', marginBottom: '0.75rem', color: 'var(--text-primary)' }}>
              5. Proteção de Credenciais e Tokens
            </h2>
            <p style={{ color: 'var(--text-secondary)' }}>
              As permissões OAuth concedidas pelos usuários são armazenadas de forma segura e criptografada utilizando o cofre de chaves do banco de dados (Supabase Vault). Os tokens de acesso são renovados automaticamente e de forma privada por meio de Supabase Edge Functions seguras, sem qualquer exposição a terceiros ou ao frontend do navegador.
            </p>
          </div>

          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: '700', marginBottom: '0.75rem', color: 'var(--text-primary)' }}>
              6. Desconexão da Conta Google
            </h2>
            <p style={{ color: 'var(--text-secondary)' }}>
              A qualquer momento, você pode remover completamente as permissões e desconectar sua conta Google acessando a aba **Configurações** no Meety e clicando em **Desconectar**. Esse processo revoga as credenciais armazenadas e limpa todos os dados de integração salvos no contexto do seu usuário.
            </p>
          </div>

          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: '700', marginBottom: '0.75rem', color: 'var(--text-primary)' }}>
              7. Contato
            </h2>
            <p style={{ color: 'var(--text-secondary)' }}>
              Em caso de dúvidas sobre esta Política de Privacidade ou sobre o uso das permissões do Google Agenda, entre em contato através do e-mail: <a href="mailto:webychatsistema@gmail.com" style={{ color: 'var(--text-accent)', textDecoration: 'none' }}>webychatsistema@gmail.com</a>.
            </p>
          </div>
        </section>
      </main>

      <footer style={{
        marginTop: '3rem',
        color: 'var(--text-muted)',
        fontSize: '0.8rem',
        textAlign: 'center'
      }}>
        <p>&copy; 2026 Meety. Todos os direitos reservados.</p>
      </footer>
    </div>
  )
}
