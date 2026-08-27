import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const jsonResponse = (body: Record<string, any>, status = 200) => {
  return Response.json(body, {
    status,
    headers: corsHeaders,
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST' && req.method !== 'GET') {
    return jsonResponse({ error: 'Método não permitido.' }, 405)
  }

  try {
    // 1. Verify User JWT
    const authorization = req.headers.get('Authorization')
    if (!authorization?.startsWith('Bearer ')) {
      return jsonResponse({ error: 'Usuário não autenticado.' }, 401)
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
      return jsonResponse({ error: 'Sessão inválida ou expirada.' }, 401)
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey)

    // 2. Fetch the active global WhatsApp integration using Admin client (service_role)
    const { data: activeIntegrationList, error: queryError } = await supabaseAdmin.rpc(
      'obter_whatsapp_integracao_ativa'
    )

    if (queryError) {
      console.error('Erro na RPC obter_whatsapp_integracao_ativa:', queryError.message || 'Erro desconhecido')
      return jsonResponse({ error: 'Erro ao consultar a integração ativa.' }, 500)
    }

    const activeIntegration = activeIntegrationList?.[0] || null

    // 2.1 Normal Path: if integration exists with whatsapp_number, return it immediately
    if (activeIntegration && activeIntegration.whatsapp_number) {
      return jsonResponse({
        success: true,
        whatsapp_number: activeIntegration.whatsapp_number
      })
    }

    // 3. Self-healing / Bootstrap Path: if missing or empty, consult gateway
    const server_url = activeIntegration?.server_url || 
                       Deno.env.get('WHATSAPP_SERVER_URL') || 
                       Deno.env.get('GATEWAY_URL') || '';
    const token = activeIntegration?.token || 
                  Deno.env.get('WHATSAPP_TOKEN') || 
                  Deno.env.get('GATEWAY_API_KEY') || 
                  Deno.env.get('GATEWAY_SECRET') || '';

    if (!server_url || !token) {
      return jsonResponse({ error: 'Nenhuma integração WhatsApp configurada e nenhum fallback disponível.' }, 404)
    }

    // Parse URL and validate protocol/domain
    let parsedUrl: URL
    try {
      parsedUrl = new URL(server_url)
    } catch {
      return jsonResponse({ error: 'Configuração da URL do servidor WhatsApp inválida.' }, 400)
    }

    if (parsedUrl.protocol !== 'https:' || !parsedUrl.hostname.endsWith('.up.railway.app')) {
      return jsonResponse({ error: 'Configuração de domínio do servidor WhatsApp não permitida ou insegura.' }, 400)
    }

    // Request status from gateway
    try {
      const response = await fetch(`${server_url}/status`, {
        method: 'GET',
        headers: {
          'x-api-key': token,
          'Content-Type': 'application/json'
        },
        signal: AbortSignal.timeout(5000) // 5 seconds timeout
      })

      if (!response.ok) {
        return jsonResponse({ error: 'Não foi possível obter o status da instância do WhatsApp.' }, response.status)
      }

      const statusData = await response.json()

      if (statusData.connected && statusData.number) {
        // Save integration details automatically to self-heal
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
          console.error('Erro ao autorreparar/sincronizar número master no banco:', saveError.message || saveError)
          return jsonResponse({ error: 'Erro ao persistir a integração do WhatsApp.' }, 500)
        }

        return jsonResponse({
          success: true,
          whatsapp_number: statusData.number
        })
      } else {
        return jsonResponse({ error: 'WhatsApp Master desconectado no gateway.' }, 404)
      }
    } catch (fetchError: any) {
      console.error('Falha ao conectar com o gateway do WhatsApp:', fetchError.message || fetchError)
      return jsonResponse({ error: 'Gateway do WhatsApp indisponível.' }, 503)
    }

  } catch (error: any) {
    console.error('Erro na Edge Function whatsapp-master-info:', error.message || error)
    return jsonResponse({ error: 'Ocorreu um erro interno ao processar a requisição.' }, 500)
  }
})
