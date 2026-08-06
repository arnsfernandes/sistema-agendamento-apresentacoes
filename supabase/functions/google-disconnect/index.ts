import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
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
        { status: 401, headers: corsHeaders },
      )
    }

    const accessToken = authorization.replace('Bearer ', '')

    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')
    const serviceRoleKey = Deno.env.get(
      'SUPABASE_SERVICE_ROLE_KEY',
    )

    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
      throw new Error('Configuração incompleta.')
    }

    const supabaseUser = createClient(
      supabaseUrl,
      anonKey,
    )

    const {
      data: { user },
      error: userError,
    } = await supabaseUser.auth.getUser(accessToken)

    if (userError || !user) {
      return Response.json(
        { error: 'Sessão inválida ou expirada.' },
        { status: 401, headers: corsHeaders },
      )
    }

    const supabaseAdmin = createClient(
      supabaseUrl,
      serviceRoleKey,
    )

    const { error: disconnectError } =
      await supabaseAdmin.rpc(
        'desconectar_google_integracao',
        {
          p_user_id: user.id,
        },
      )

    if (disconnectError) {
      console.error(disconnectError)

      return Response.json(
        {
          error:
            disconnectError.message ||
            'Não foi possível desconectar a conta Google.',
        },
        { status: 400, headers: corsHeaders },
      )
    }

    return Response.json(
      {
        success: true,
        message: 'Conta Google desconectada com sucesso.',
      },
      { headers: corsHeaders },
    )
  } catch (error) {
    console.error(error)

    return Response.json(
      {
        error:
          'Não foi possível desconectar a conta Google.',
      },
      {
        status: 500,
        headers: corsHeaders,
      },
    )
  }
})