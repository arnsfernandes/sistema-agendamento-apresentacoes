import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function formatarTelefone(tel: string): string {
  const limpo = tel.replace(/\D/g, '')
  let semPais = limpo
  if (limpo.startsWith('55') && limpo.length > 10) {
    semPais = limpo.slice(2)
  }
  if (semPais.length === 11) {
    return `(${semPais.slice(0, 2)}) ${semPais.slice(2, 7)}-${semPais.slice(7)}`
  }
  if (semPais.length === 10) {
    return `(${semPais.slice(0, 2)}) ${semPais.slice(2, 6)}-${semPais.slice(6)}`
  }
  return tel
}

function formatarData(dataStr: string): string {
  const partes = dataStr.split('-')
  if (partes.length === 3) {
    return `${partes[2]}/${partes[1]}/${partes[0]}`
  }
  return dataStr
}

function formatarHorario(horarioStr: string): string {
  const partes = horarioStr.split(':')
  if (partes.length >= 2) {
    return `${partes[0]}:${partes[1]}`
  }
  return horarioStr
}

function validarNumeroDestino(whatsappNumber: any): boolean {
  if (typeof whatsappNumber !== 'string') return false
  const limpo = whatsappNumber.replace(/\D/g, '')
  const numberRegex = /^55\d{10,11}$/
  return numberRegex.test(limpo)
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const envSecret = Deno.env.get('LEMBRETES_CRON_SECRET')
    const reqSecret = req.headers.get('x-cron-secret')

    const cleanEnv = envSecret ? envSecret.replace(/\s/g, '') : ''
    const cleanReq = reqSecret ? reqSecret.replace(/\s/g, '') : ''

    if (!cleanEnv || cleanReq !== cleanEnv) {
      return Response.json(
        { error: 'Acesso não autorizado.' },
        { status: 401, headers: corsHeaders }
      )
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error('Configuração incompleta do servidor.')
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey)

    const { data: reservadas, error: rpcError } = await supabaseAdmin.rpc(
      'reservar_apresentacoes_para_lembrete',
      { p_limite: 10 }
    )

    if (rpcError) {
      console.error('Erro ao reservar apresentações:', rpcError.message || 'Erro desconhecido')
      return Response.json(
        { error: 'Não foi possível reservar as apresentações para envio.' },
        { status: 500, headers: corsHeaders }
      )
    }

    const { data: reservadasPessoais, error: rpcPessoaisError } = await supabaseAdmin.rpc(
      'reservar_lembretes_pessoais',
      { p_limite: 10 }
    )

    if (rpcPessoaisError) {
      console.error('Erro ao reservar lembretes pessoais:', rpcPessoaisError.message || 'Erro desconhecido')
      return Response.json(
        { error: 'Não foi possível reservar os lembretes pessoais para envio.' },
        { status: 500, headers: corsHeaders }
      )
    }

    let _serverUrl = ""
    let _token = ""
    let integrationValida = false

    if ((reservadas && reservadas.length > 0) || (reservadasPessoais && reservadasPessoais.length > 0)) {
      const { data: activeIntegrationList, error: queryError } = await supabaseAdmin.rpc(
        'obter_whatsapp_integracao_ativa'
      )

      if (queryError) {
        console.error('Erro na RPC obter_whatsapp_integracao_ativa:', queryError.message || 'Erro desconhecido')
      } else {
        const activeIntegration = activeIntegrationList?.[0] || null
        if (activeIntegration) {
          const { server_url, token: integrationToken } = activeIntegration
          if (server_url && integrationToken) {
            try {
              const parsedUrl = new URL(server_url)
              if (parsedUrl.protocol === 'https:' && parsedUrl.hostname.endsWith('.up.railway.app')) {
                _serverUrl = server_url
                _token = integrationToken
                integrationValida = true
              } else {
                console.error('Configuração de integração inválida: URL deve ser HTTPS e o domínio deve ser Railway.')
              }
            } catch (urlErr: any) {
              console.error('Erro ao analisar URL da integração:', urlErr.message || 'Erro desconhecido')
            }
          }
        }
      }
    }

    const defaultReminderTemplate = "Olá! Este é um lembrete da sua reunião agendada para o dia {data}, às {hora}.\n\nParticipantes confirmados:\n{participantes}\n\nPara acessar a reunião:\n{meet}"
    const resultados: Array<{
      presentationId: number
      userEncontrado: boolean
      hasWhatsapp: boolean
      hasCustomTemplate: boolean
      reminderWithoutParticipants: boolean
      countActiveParticipants: number
      elegivel: boolean
      mensagemMontada: boolean
      destinoValido: boolean
      envioRealizado: boolean
      messageId: string | null
    }> = []

    for (const pres of (reservadas || [])) {
      try {
        const { data: userData, error: userError } = await supabaseAdmin.auth.admin.getUserById(
          pres.user_id
        )

        const user = userData?.user
        const found = !!(user && !userError)
        
        const { data: dbUserWhatsapp, error: dbUserWhatsappError } = await supabaseAdmin
          .from('usuario_whatsapp')
          .select('whatsapp_number')
          .eq('user_id', pres.user_id)
          .maybeSingle()

        const dbWhatsappNumber = !dbUserWhatsappError && dbUserWhatsapp ? dbUserWhatsapp.whatsapp_number : null

        let hasWhatsapp = !!dbWhatsappNumber
        let hasCustomTemplate = false
        let reminderWithoutParticipants = false
        let _template = defaultReminderTemplate

        if (found && user) {
          const meta = user.user_metadata || {}
          hasCustomTemplate = !!meta.custom_reminder_message
          _template = meta.custom_reminder_message || defaultReminderTemplate
          reminderWithoutParticipants = !!meta.reminder_without_participants
        }

        // Buscar participantes ativos
        const { data: participacoes, error: partError } = await supabaseAdmin
          .from('participacoes')
          .select('id, status, clientes(nome, telefone)')
          .eq('apresentacao_id', pres.id)
          .eq('status', 'ativo')

        if (partError) {
          throw partError
        }

        const countParticipantes = participacoes?.length || 0

        let elegivel = true
        let _participantesStr = ""

        if (countParticipantes > 0) {
          const linhas: string[] = []
          for (const part of (participacoes || [])) {
            const cliente = part.clientes as any
            if (cliente) {
              const nome = cliente.nome || 'Participante'
              const telFormatado = formatarTelefone(cliente.telefone || '')
              linhas.push(`${nome} — ${telFormatado}`)
            }
          }
          _participantesStr = linhas.join('\n')
        } else {
          if (!reminderWithoutParticipants) {
            elegivel = false
          } else {
            _participantesStr = "Nenhum participante confirmado."
          }
        }

        const whatsappDestino = dbWhatsappNumber
        const destinoValido = validarNumeroDestino(whatsappDestino)

        if (!destinoValido || !integrationValida) {
          elegivel = false
        }

        let mensagemMontada = false
        let _mensagemFinal = ""

        if (elegivel) {
          const dataFormatada = formatarData(pres.data || '')
          const horarioFormatado = formatarHorario(pres.horario || '')
          const linkMeet = pres.meet_link || ''

          _mensagemFinal = _template
            .replace(/{data}/g, dataFormatada)
            .replace(/{hora}/g, horarioFormatado)
            .replace(/{participantes}/g, _participantesStr)
            .replace(/{meet}/g, linkMeet)
          
          mensagemMontada = true
        }

        let envioRealizado = false
        let messageId = null

        if (elegivel) {
          try {
            const response = await fetch(`${_serverUrl}/send-message`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'x-api-key': _token
              },
              body: JSON.stringify({
                number: whatsappDestino,
                text: _mensagemFinal
              })
            })

            const resData = await response.json()
            if (response.ok && resData.success) {
              envioRealizado = true
              messageId = resData.messageId || null
            } else {
              console.error(`Erro ao enviar mensagem para apresentação ${pres.id}:`, resData.error || 'Erro na resposta do gateway')
            }
          } catch (fetchErr: any) {
            console.error(`Falha na requisição de envio para apresentação ${pres.id}:`, fetchErr.message || 'Erro de rede')
          }
        }

        // Atualizar o banco de dados
        try {
          if (envioRealizado) {
            const { error: updateError } = await supabaseAdmin
              .from('apresentacoes')
              .update({
                lembrete_enviado_em: new Date().toISOString(),
                lembrete_reservado_em: null
              })
              .eq('id', pres.id)

            if (updateError) throw updateError
          } else {
            const { error: updateError } = await supabaseAdmin
              .from('apresentacoes')
              .update({
                lembrete_reservado_em: null
              })
              .eq('id', pres.id)

            if (updateError) throw updateError
          }
        } catch (dbErr: any) {
          console.error(`Erro ao atualizar estado do lembrete para apresentação ${pres.id}:`, dbErr.message || 'Erro desconhecido')
        }

        console.log(`Lembrete ${pres.id} - Envio realizado: ${envioRealizado ? 'Sim' : 'Não'}${messageId ? `, MessageId: ${messageId}` : ''}`)

        resultados.push({
          presentationId: Number(pres.id),
          userEncontrado: found,
          hasWhatsapp,
          hasCustomTemplate,
          reminderWithoutParticipants,
          countActiveParticipants: countParticipantes,
          elegivel,
          mensagemMontada,
          destinoValido,
          envioRealizado,
          messageId
        })
      } catch (err: any) {
        console.error(`Erro ao processar lembrete para apresentação ${pres.id}:`, err?.message || 'Erro desconhecido')
        resultados.push({
          presentationId: Number(pres.id),
          userEncontrado: false,
          hasWhatsapp: false,
          hasCustomTemplate: false,
          reminderWithoutParticipants: false,
          countActiveParticipants: 0,
          elegivel: false,
          mensagemMontada: false,
          destinoValido: false,
          envioRealizado: false,
          messageId: null
        })
      }
    }

    const resultadosPessoais: Array<{
      reminderId: number
      hasWhatsapp: boolean
      destinoValido: boolean
      envioRealizado: boolean
      messageId: string | null
    }> = []

    for (const lp of (reservadasPessoais || [])) {
      try {
        const { data: dbUserWhatsapp, error: dbUserWhatsappError } = await supabaseAdmin
          .from('usuario_whatsapp')
          .select('whatsapp_number')
          .eq('user_id', lp.user_id)
          .maybeSingle()

        const dbWhatsappNumber = !dbUserWhatsappError && dbUserWhatsapp ? dbUserWhatsapp.whatsapp_number : null
        const hasWhatsapp = !!dbWhatsappNumber
        const destinoValido = validarNumeroDestino(dbWhatsappNumber)

        let elegivel = integrationValida && destinoValido
        let envioRealizado = false
        let messageId = null

        if (elegivel && dbWhatsappNumber) {
          try {
            const response = await fetch(`${_serverUrl}/send-message`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'x-api-key': _token
              },
              body: JSON.stringify({
                number: dbWhatsappNumber,
                text: lp.mensagem
              })
            })

            const resData = await response.json()
            if (response.ok && resData.success) {
              envioRealizado = true
              messageId = resData.messageId || null
            } else {
              console.error(`Erro ao enviar lembrete pessoal ${lp.id}:`, resData.error || 'Erro na resposta do gateway')
            }
          } catch (fetchErr: any) {
            console.error(`Falha na requisição de envio para lembrete pessoal ${lp.id}:`, fetchErr.message || 'Erro de rede')
          }
        }

        // Atualizar o banco de dados
        try {
          if (envioRealizado) {
            const { error: updateError } = await supabaseAdmin
              .from('lembretes_pessoais')
              .update({
                enviado_em: new Date().toISOString(),
                reservado_em: null
              })
              .eq('id', lp.id)

            if (updateError) throw updateError
          } else {
            const { error: updateError } = await supabaseAdmin
              .from('lembretes_pessoais')
              .update({
                reservado_em: null
              })
              .eq('id', lp.id)

            if (updateError) throw updateError
          }
        } catch (dbErr: any) {
          console.error(`Erro ao atualizar estado para lembrete pessoal ${lp.id}:`, dbErr.message || 'Erro desconhecido')
        }

        console.log(`Lembrete pessoal ${lp.id} - Envio realizado: ${envioRealizado ? 'Sim' : 'Não'}`)

        resultadosPessoais.push({
          reminderId: Number(lp.id),
          hasWhatsapp,
          destinoValido,
          envioRealizado,
          messageId
        })
      } catch (err: any) {
        console.error(`Erro ao processar lembrete pessoal ${lp.id}:`, err?.message || 'Erro desconhecido')
        resultadosPessoais.push({
          reminderId: Number(lp.id),
          hasWhatsapp: false,
          destinoValido: false,
          envioRealizado: false,
          messageId: null
        })
      }
    }

    return Response.json(
      {
        success: true,
        count: reservadas?.length || 0,
        resultados,
        countPessoais: reservadasPessoais?.length || 0,
        resultadosPessoais
      },
      { headers: corsHeaders }
    )
  } catch (error: any) {
    console.error('Erro na Edge Function:', error.message || 'Erro desconhecido')
    return Response.json(
      { error: 'Ocorreu um erro interno ao processar a requisição.' },
      { status: 500, headers: corsHeaders }
    )
  }
})
