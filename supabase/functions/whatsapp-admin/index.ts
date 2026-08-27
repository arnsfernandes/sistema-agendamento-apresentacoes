import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return Response.json(
      { error: 'Método não permitido. Utilize POST.' },
      { status: 405, headers: corsHeaders }
    )
  }

  try {
    // 1. Verify User JWT
    const authorization = req.headers.get('Authorization')
    if (!authorization?.startsWith('Bearer ')) {
      return Response.json(
        { error: 'Usuário não autenticado.' },
        { status: 401, headers: corsHeaders }
      )
    }

    const accessToken = authorization.replace('Bearer ', '')

    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
      throw new Error('Configuração incompleta do servidor.')
    }

    const supabaseUser = createClient(supabaseUrl, anonKey)
    const { data: { user }, error: userError } = await supabaseUser.auth.getUser(accessToken)

    if (userError || !user) {
      return Response.json(
        { error: 'Sessão inválida ou expirada.' },
        { status: 401, headers: corsHeaders }
      )
    }

    // 1.1 Authorization: allow only the specific admin email
    if (user.email !== 'webychatsistema@gmail.com') {
      return Response.json(
        { error: 'Acesso não autorizado.' },
        { status: 403, headers: corsHeaders }
      )
    }

    // 2. Parse Request Payload
    const { action } = await req.json().catch(() => ({ action: null }))

    if (action !== 'status' && action !== 'qr' && action !== 'logout' && action !== 'disconnect') {
      return Response.json(
        { error: 'Ação não informada ou não suportada.' },
        { status: 400, headers: corsHeaders }
      )
    }

    // 3. Fetch the active global WhatsApp integration using Admin client
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey)
    const { data: activeIntegrationList, error: queryError } = await supabaseAdmin.rpc(
      'obter_whatsapp_integracao_ativa'
    )

    if (queryError) {
      console.error('Erro na RPC obter_whatsapp_integracao_ativa:', queryError.message || 'Erro desconhecido')
      return Response.json(
        { error: 'Erro ao consultar a integração ativa.' },
        { status: 500, headers: corsHeaders }
      )
    }

    const activeIntegration = activeIntegrationList?.[0] || null
    
    // Fallback to Deno env variables if activeIntegration is not set
    const server_url = activeIntegration?.server_url || 
                       Deno.env.get('WHATSAPP_SERVER_URL') || 
                       Deno.env.get('GATEWAY_URL') || '';
    const token = activeIntegration?.token || 
                  Deno.env.get('WHATSAPP_TOKEN') || 
                  Deno.env.get('GATEWAY_API_KEY') || 
                  Deno.env.get('GATEWAY_SECRET') || '';

    if (!server_url || !token) {
      return Response.json(
        { error: 'Configuração da integração WhatsApp ausente no banco de dados e no ambiente.' },
        { status: 404, headers: corsHeaders }
      )
    }

    // 4. SSRF prevention: Validate server_url security
    let parsedUrl: URL
    try {
      parsedUrl = new URL(server_url)
    } catch {
      return Response.json(
        { error: 'Configuração da URL do servidor WhatsApp inválida.' },
        { status: 400, headers: corsHeaders }
      )
    }

    if (parsedUrl.protocol !== 'https:') {
      return Response.json(
        { error: 'Apenas conexões seguras HTTPS são permitidas.' },
        { status: 400, headers: corsHeaders }
      )
    }

    const hostname = parsedUrl.hostname
    const isValidDomain = hostname.endsWith('.up.railway.app')

    if (!isValidDomain) {
      return Response.json(
        { error: 'Configuração de domínio do servidor WhatsApp não permitida.' },
        { status: 400, headers: corsHeaders }
      )
    }

    // 5. Query Gateway based on action
    if (action === 'status') {
      const response = await fetch(`${server_url}/status`, {
        method: 'GET',
        headers: {
          'x-api-key': token,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        return Response.json(
          { error: 'Não foi possível obter o status da instância do WhatsApp.' },
          { status: response.status, headers: corsHeaders }
        )
      }

      const statusData = await response.json()

      if (statusData.connected && statusData.number) {
        if (!activeIntegration || activeIntegration.whatsapp_number !== statusData.number) {
          const provider = 'baileys'

          const { error: saveError } = await supabaseAdmin.rpc(
            'salvar_whatsapp_integracao',
            {
              p_whatsapp_number: statusData.number,
              p_instance_name: activeIntegration?.instance_name || statusData.name || 'meety-master',
              p_server_url: server_url,
              p_token: token,
              p_provider: provider
            }
          )
          if (saveError) {
            console.error('Erro ao sincronizar número no banco:', saveError.message || saveError)
          } else {
            console.log('Número master sincronizado no banco de dados:', statusData.number)
          }
        }
      }

      return Response.json(
        {
          success: true,
          connected: !!statusData.connected,
          number: statusData.number || null,
          name: statusData.name || null
        },
        { headers: corsHeaders }
      )
    } else if (action === 'qr') {
      const response = await fetch(`${server_url}/qr-code`, {
        method: 'GET',
        headers: {
          'x-api-key': token,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        return Response.json(
          { error: 'Não foi possível obter o QR Code da instância do WhatsApp.' },
          { status: response.status, headers: corsHeaders }
        )
      }

      const qrData = await response.json()

      return Response.json(
        {
          success: true,
          available: !!qrData.available,
          qr: qrData.qr || null
        },
        { headers: corsHeaders }
      )
    } else if (action === 'logout') {
      const response = await fetch(`${server_url}/logout`, {
        method: 'POST',
        headers: {
          'x-api-key': token,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        return Response.json(
          { error: 'Não foi possível realizar o logout da instância do WhatsApp.' },
          { status: response.status, headers: corsHeaders }
        )
      }

      const logoutData = await response.json()

      return Response.json(
        {
          success: true,
          message: logoutData.message || 'Sessão deslogada e credenciais locais limpas com sucesso.'
        },
        { headers: corsHeaders }
      )
    } else {
      // action === 'disconnect'
      const response = await fetch(`${server_url}/disconnect`, {
        method: 'POST',
        headers: {
          'x-api-key': token,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        return Response.json(
          { error: 'Não foi possível realizar a desconexão da instância do WhatsApp.' },
          { status: response.status, headers: corsHeaders }
        )
      }

      const disconnectData = await response.json()

      return Response.json(
        {
          success: true,
          message: disconnectData.message || 'Sessão deslogada e instância mantida offline com sucesso.'
        },
        { headers: corsHeaders }
      )
    }

  } catch (error: any) {
    console.error('Erro na Edge Function:', error.message || 'Erro desconhecido')
    return Response.json(
      { error: 'Ocorreu um erro interno ao processar a requisição.' },
      { status: 500, headers: corsHeaders }
    )
  }
})
