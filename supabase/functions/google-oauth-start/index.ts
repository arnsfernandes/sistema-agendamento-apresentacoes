import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
}

const encodeBase64Url = (value: string) =>
  btoa(value)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')

const signState = async (payload: string, secret: string) => {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )

  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(payload),
  )

  return encodeBase64Url(
    String.fromCharCode(...new Uint8Array(signature)),
  )
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

    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')
    const serviceRoleKey = Deno.env.get(
      'SUPABASE_SERVICE_ROLE_KEY',
    )

    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
      throw new Error('Configuração segura incompleta.')
    }

    const accessToken = authorization.replace('Bearer ', '')

    const supabase = createClient(
      supabaseUrl,
      anonKey,
    )

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(accessToken)

    if (userError || !user) {
      return Response.json(
        { error: 'Sessão inválida ou expirada.' },
        { status: 401, headers: corsHeaders },
      )
    }

    const clientId = Deno.env.get('GOOGLE_CLIENT_ID')
    const redirectUri = Deno.env.get('GOOGLE_REDIRECT_URI')
    const stateSecret = Deno.env.get(
      'GOOGLE_OAUTH_STATE_SECRET',
    )

    if (!clientId || !redirectUri || !stateSecret) {
      throw new Error('Configuração OAuth incompleta.')
    }

    const { origin } = await req.json().catch(() => ({}))

    const stateData = {
      userId: user.id,
      expiresAt: Date.now() + 10 * 60 * 1000,
      nonce: crypto.randomUUID(),
      origin: origin || null,
    }

    const encodedPayload = encodeBase64Url(
      JSON.stringify(stateData),
    )

    const signature = await signState(
      encodedPayload,
      stateSecret,
    )

    const state = `${encodedPayload}.${signature}`

    const authorizationUrl = new URL(
      'https://accounts.google.com/o/oauth2/v2/auth',
    )

    authorizationUrl.searchParams.set(
      'client_id',
      clientId,
    )
    authorizationUrl.searchParams.set(
      'redirect_uri',
      redirectUri,
    )
    authorizationUrl.searchParams.set(
      'response_type',
      'code',
    )
    authorizationUrl.searchParams.set(
      'access_type',
      'offline',
    )
    authorizationUrl.searchParams.set(
      'prompt',
      'consent',
    )
    authorizationUrl.searchParams.set(
      'scope',
      [
        'openid',
        'email',
        'https://www.googleapis.com/auth/calendar.events',
        'https://www.googleapis.com/auth/calendar.calendarlist.readonly',
      ].join(' '),
    )
    authorizationUrl.searchParams.set('state', state)

    return Response.json(
      {
        authorizationUrl:
          authorizationUrl.toString(),
      },
      { headers: corsHeaders },
    )
  } catch (error) {
    console.error(error)

    return Response.json(
      {
        error:
          'Não foi possível iniciar a conexão com o Google.',
      },
      {
        status: 500,
        headers: corsHeaders,
      },
    )
  }
})