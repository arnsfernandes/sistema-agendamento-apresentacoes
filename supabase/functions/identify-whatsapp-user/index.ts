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

    const cleanPhone = phone.replace(/\D/g, '')
    const candidates = [cleanPhone]

    if (cleanPhone.startsWith('55')) {
      if (cleanPhone.length === 12) {
        // 55 + DDD (2 digits) + 8 digits -> generate 55 + DDD + 9 + 8 digits
        candidates.push(`55${cleanPhone.slice(2, 4)}9${cleanPhone.slice(4)}`)
      } else if (cleanPhone.length === 13 && cleanPhone[4] === '9') {
        // 55 + DDD (2 digits) + 9 + 8 digits -> generate 55 + DDD + 8 digits
        candidates.push(`55${cleanPhone.slice(2, 4)}${cleanPhone.slice(5)}`)
      }
    }

    // Find the user by candidate matches of whatsapp_number
    const { data: userWhatsappList, error: userError } = await supabaseAdmin
      .from('usuario_whatsapp')
      .select('user_id, whatsapp_number')
      .in('whatsapp_number', candidates)

    if (userError) {
      return jsonResponse({ error: `Erro ao consultar banco: ${userError.message}` }, 500)
    }

    if (!userWhatsappList || userWhatsappList.length === 0) {
      return jsonResponse({ user_id: null, has_google_integration: false })
    }

    // Filter unique user ids
    const uniqueUserIds = [...new Set(userWhatsappList.map((item: any) => item.user_id))]

    if (uniqueUserIds.length > 1) {
      console.warn(`Ambiguidades de número de WhatsApp encontradas para candidatos: ${candidates.join(', ')}. IDs dos usuários: ${uniqueUserIds.join(', ')}`)
      return jsonResponse({ user_id: null, has_google_integration: false })
    }

    const matchedUserId = uniqueUserIds[0]
    const matchedUser = userWhatsappList.find((item: any) => item.user_id === matchedUserId)

    // Check if the user has an active Google Calendar integration
    const { data: integration, error: integrationError } = await supabaseAdmin
      .from('google_integracao')
      .select('id')
      .eq('user_id', matchedUserId)
      .eq('ativo', true)
      .maybeSingle()

    if (integrationError) {
      return jsonResponse({ error: `Erro ao consultar integração Google: ${integrationError.message}` }, 500)
    }

    return jsonResponse({
      user_id: matchedUserId,
      has_google_integration: !!integration,
      whatsapp_number: matchedUser?.whatsapp_number || null
    })

  } catch (error: any) {
    console.error('Erro na Edge Function:', error.message || error)
    return jsonResponse({ error: 'Erro interno no servidor.' }, 500)
  }
})
