import { createClient } from 'npm:@supabase/supabase-js@2'

const encodeBase64Url = (value: Uint8Array) =>
  btoa(String.fromCharCode(...value))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')

const decodeBase64Url = (value: string) => {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/')
  const padded = normalized.padEnd(
    normalized.length + ((4 - (normalized.length % 4)) % 4),
    '=',
  )

  return atob(padded)
}

const verifyStateSignature = async (
  payload: string,
  receivedSignature: string,
  secret: string,
) => {
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

  return (
    encodeBase64Url(new Uint8Array(signature)) === receivedSignature
  )
}

const htmlResponse = (message: string, status = 200) =>
  new Response(
    `<!doctype html>
    <html lang="pt-BR">
      <head>
        <meta charset="utf-8">
        <title>Google Agenda</title>
      </head>
      <body style="font-family: sans-serif; padding: 40px;">
        <h2>${message}</h2>
        <p>Você já pode fechar esta página e voltar ao sistema.</p>
      </body>
    </html>`,
    {
      status,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
      },
    },
  )

Deno.serve(async (req) => {
  try {
    const url = new URL(req.url)

    const code = url.searchParams.get('code')
    const state = url.searchParams.get('state')
    const oauthError = url.searchParams.get('error')

    if (oauthError) {
      return htmlResponse('A conexão com o Google foi cancelada.', 400)
    }

    if (!code || !state) {
      return htmlResponse('Retorno do Google incompleto.', 400)
    }

    const clientId = Deno.env.get('GOOGLE_CLIENT_ID')
    const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET')
    const redirectUri = Deno.env.get('GOOGLE_REDIRECT_URI')
    const stateSecret = Deno.env.get('GOOGLE_OAUTH_STATE_SECRET')
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const serviceRoleKey = Deno.env.get(
      'SUPABASE_SERVICE_ROLE_KEY',
    )

    if (
      !clientId ||
      !clientSecret ||
      !redirectUri ||
      !stateSecret ||
      !supabaseUrl ||
      !serviceRoleKey
    ) {
      throw new Error('Configuração incompleta.')
    }

    const [payload, receivedSignature] = state.split('.')

    if (!payload || !receivedSignature) {
      return htmlResponse('Estado de segurança inválido.', 400)
    }

    const signatureIsValid = await verifyStateSignature(
      payload,
      receivedSignature,
      stateSecret,
    )

    if (!signatureIsValid) {
      return htmlResponse('Estado de segurança inválido.', 400)
    }

    const stateData = JSON.parse(decodeBase64Url(payload))

    if (
      !stateData.userId ||
      !stateData.expiresAt ||
      Date.now() > stateData.expiresAt
    ) {
      return htmlResponse('A tentativa de conexão expirou.', 400)
    }

    const tokenResponse = await fetch(
      'https://oauth2.googleapis.com/token',
      {
        method: 'POST',
        headers: {
          'Content-Type':
            'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          code,
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: redirectUri,
          grant_type: 'authorization_code',
        }),
      },
    )

    const tokenData = await tokenResponse.json()

    if (!tokenResponse.ok) {
      console.error('Erro ao trocar código:', tokenData)

      return htmlResponse(
        'Não foi possível concluir a conexão.',
        400,
      )
    }

    if (!tokenData.access_token || !tokenData.refresh_token) {
      return htmlResponse(
        'O Google não retornou as credenciais necessárias.',
        400,
      )
    }

    const userInfoResponse = await fetch(
      'https://openidconnect.googleapis.com/v1/userinfo',
      {
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
        },
      },
    )

    const userInfo = await userInfoResponse.json()

    if (!userInfoResponse.ok || !userInfo.email) {
      return htmlResponse(
        'Não foi possível identificar a conta Google.',
        400,
      )
    }

    const supabaseAdmin = createClient(
      supabaseUrl,
      serviceRoleKey,
    )

    const { error: saveError } = await supabaseAdmin.rpc(
      'salvar_google_integracao',
      {
        p_user_id: stateData.userId,
        p_google_email: userInfo.email,
        p_refresh_token: tokenData.refresh_token,
        p_google_account_sub: userInfo.sub,
      },
    )

    if (saveError) {
      console.error('Erro ao salvar integração:', saveError)

      return htmlResponse(
        'A conta foi autorizada, mas não foi possível salvar a conexão.',
        500,
      )
    }

    const appUrl = Deno.env.get('APP_URL')

    if (!appUrl) {
      throw new Error('URL do sistema não configurada.')
    }

    let targetUrl = appUrl
    if (stateData.origin === 'http://localhost:5173' || stateData.origin === appUrl) {
      targetUrl = stateData.origin
    }

    return Response.redirect(
      `${targetUrl}/?google=connected`,
      302,
    )
  } catch (error) {
    console.error(error)

    return htmlResponse(
      'Não foi possível concluir a conexão com o Google.',
      500,
    )
  }
})