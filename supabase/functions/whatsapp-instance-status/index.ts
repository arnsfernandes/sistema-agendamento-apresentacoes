import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
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

    // 1. Validate authenticated user using the client initialized with the anonymous key
    const supabaseUser = createClient(supabaseUrl, anonKey)
    const { data: { user }, error: userError } = await supabaseUser.auth.getUser(accessToken)

    if (userError || !user) {
      return Response.json(
        { error: 'Sessão inválida ou expirada.' },
        { status: 401, headers: corsHeaders }
      )
    }

    // 2. Fetch the active integration using the admin client (which bypasses RLS and permissions limit via service_role)
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey)
    const { data: activeIntegrationList, error: queryError } = await supabaseAdmin.rpc(
      'obter_whatsapp_integracao_ativa'
    )

    if (queryError) {
      console.error('Erro na RPC obter_whatsapp_integracao_ativa:', queryError)
      return Response.json(
        { error: 'Erro ao consultar a integração no banco de dados.' },
        { status: 500, headers: corsHeaders }
      )
    }

    const activeIntegration = activeIntegrationList?.[0] || null

    if (!activeIntegration) {
      return Response.json(
        { error: 'Nenhuma integração WhatsApp ativa encontrada.' },
        { status: 404, headers: corsHeaders }
      )
    }

    const { server_url, token } = activeIntegration

    if (!server_url || !token) {
      return Response.json(
        { error: 'Configuração da integração WhatsApp incompleta no servidor.' },
        { status: 400, headers: corsHeaders }
      )
    }

    // SSRF prevention: Validate server_url security
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
    const isValidDomain = hostname === 'uazapi.com' || hostname.endsWith('.uazapi.com') ||
                          hostname === 'uazapi.com.br' || hostname.endsWith('.uazapi.com.br')

    if (!isValidDomain) {
      return Response.json(
        { error: 'Configuração de domínio do servidor WhatsApp não permitida.' },
        { status: 400, headers: corsHeaders }
      )
    }

    // 3. Request UAZAPI status using the decrypted token (token is never returned/logged)
    const response = await fetch(`${server_url}/instance/status`, {
      method: 'GET',
      headers: {
        'token': token,
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`Erro ao consultar UAZAPI: ${response.status} - ${errorText}`)
      return Response.json(
        { error: 'Não foi possível obter o status da instância do WhatsApp na UAZAPI.' },
        { status: response.status, headers: corsHeaders }
      )
    }

    const statusData = await response.json()

    // 4. Return only safe data to the client (token is excluded)
    return Response.json(
      {
        success: true,
        whatsapp_number: activeIntegration.whatsapp_number,
        instance_name: activeIntegration.instance_name,
        status: statusData.status || statusData
      },
      { headers: corsHeaders }
    )

  } catch (error: any) {
    console.error('Erro na Edge Function:', error.message || error)
    return Response.json(
      { error: 'Ocorreu um erro interno ao processar a requisição.' },
      { status: 500, headers: corsHeaders }
    )
  }
})
