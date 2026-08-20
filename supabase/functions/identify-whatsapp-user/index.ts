import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-gateway-secret',
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

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Método não permitido.' }, 405)
  }

  try {
    const requestSecret = req.headers.get('x-gateway-secret')
    const gatewaySecret = Deno.env.get('GATEWAY_SECRET') || Deno.env.get('LEMBRETES_CRON_SECRET')

    if (!gatewaySecret || requestSecret !== gatewaySecret) {
      return jsonResponse({ error: 'Não autorizado.' }, 401)
    }

    const { phone } = await req.json()

    if (!phone) {
      return jsonResponse({ error: 'Parâmetro phone é obrigatório.' }, 400)
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error('Configuração incompleta do servidor.')
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey)

    // Find the user by exact match of whatsapp_number
    const { data: userWhatsapp, error: userError } = await supabaseAdmin
      .from('usuario_whatsapp')
      .select('user_id')
      .eq('whatsapp_number', phone)
      .maybeSingle()

    if (userError) {
      return jsonResponse({ error: `Erro ao consultar banco: ${userError.message}` }, 500)
    }

    if (!userWhatsapp) {
      return jsonResponse({ user_id: null, has_google_integration: false })
    }

    // Check if the user has an active Google Calendar integration
    const { data: integration, error: integrationError } = await supabaseAdmin
      .from('google_integracao')
      .select('id')
      .eq('user_id', userWhatsapp.user_id)
      .eq('ativo', true)
      .maybeSingle()

    if (integrationError) {
      return jsonResponse({ error: `Erro ao consultar integração Google: ${integrationError.message}` }, 500)
    }

    return jsonResponse({
      user_id: userWhatsapp.user_id,
      has_google_integration: !!integration
    })

  } catch (error: any) {
    console.error('Erro na Edge Function:', error.message || error)
    return jsonResponse({ error: 'Erro interno no servidor.' }, 500)
  }
})
