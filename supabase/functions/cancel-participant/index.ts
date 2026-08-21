import { createClient } from 'npm:@supabase/supabase-js@2'
import { cancelParticipant, BusinessRuleError } from '../_shared/scheduling.ts'

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

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Método não permitido.' }, 405)
  }

  try {
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

    // 1. Authenticate user from JWT
    const supabaseUser = createClient(supabaseUrl, anonKey)
    const { data: { user }, error: userError } = await supabaseUser.auth.getUser(accessToken)

    if (userError || !user) {
      return jsonResponse({ error: 'Sessão inválida ou expirada.' }, 401)
    }

    const userId = user.id

    // Parse request body
    const { participationId } = await req.json()

    if (!participationId) {
      return jsonResponse({ error: 'Identificador da participação não fornecido.' }, 400)
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey)

    // 2. Find active google integration for the authenticated user
    const { data: integration, error: integrationError } = await supabaseAdmin
       .from('google_integracao')
       .select('id')
       .eq('user_id', userId)
       .eq('ativo', true)
       .maybeSingle()

    if (integrationError || !integration) {
      return jsonResponse({ error: 'Nenhuma conta Google Agenda conectada e ativa.' }, 400)
    }

    const googleIntegracaoId = integration.id

    // 3. Call shared cancellation logic
    const result = await cancelParticipant(
      supabaseAdmin,
      userId,
      googleIntegracaoId,
      participationId
    )

    return jsonResponse({ success: true, ...result })

  } catch (error: any) {
    console.error('Erro na Edge Function:', error.message || error)
    if (error.name === 'BusinessRuleError' || error instanceof BusinessRuleError) {
      return jsonResponse({ error: error.message, code: error.code, details: error.details }, 400)
    }
    return jsonResponse({ error: error.message || 'Ocorreu um erro interno ao cancelar a participação.' }, 500)
  }
})
