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

    // 1. Validate user JWT
    const supabaseUser = createClient(supabaseUrl, anonKey)
    const { data: { user }, error: userError } = await supabaseUser.auth.getUser(accessToken)

    if (userError || !user) {
      return Response.json(
        { error: 'Sessão inválida ou expirada.' },
        { status: 401, headers: corsHeaders }
      )
    }

    // 2. Parse request payload
    const { whatsapp_number, instance_name, server_url, token } = await req.json()

    if (!whatsapp_number || !instance_name || !server_url || !token) {
      return Response.json(
        { error: 'Parâmetros whatsapp_number, instance_name, server_url e token são obrigatórios.' },
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

    // 3. Save integration details using Supabase Admin client (which bypasses RLS and permissions limit via service_role)
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey)
    const { error: saveError } = await supabaseAdmin.rpc(
      'salvar_whatsapp_integracao',
      {
        p_whatsapp_number: whatsapp_number,
        p_instance_name: instance_name,
        p_server_url: server_url,
        p_token: token, // Passed securely, never logged
        p_provider: 'baileys'
      }
    )

    if (saveError) {
      console.error('Erro na RPC salvar_whatsapp_integracao:', saveError)
      return Response.json(
        { error: 'Não foi possível salvar os dados da integração no servidor.' },
        { status: 500, headers: corsHeaders }
      )
    }

    return Response.json(
      {
        success: true,
        message: 'Configurações de integração WhatsApp salvas com sucesso.'
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
