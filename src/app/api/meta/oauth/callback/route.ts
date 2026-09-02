import { NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams
  const code = params.get("code")
  const state = params.get("state")
  const oauthError = params.get("error")

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? ""
  const redirectBase = `${appUrl}/settings/integrations`

  function fail(msg: string) {
    const r = NextResponse.redirect(
      `${redirectBase}?meta=error&message=${encodeURIComponent(msg)}`
    )
    r.cookies.delete("meta_oauth_state")
    r.cookies.delete("meta_pending_token")
    return r
  }

  if (oauthError) {
    return fail(params.get("error_description") ?? "Autorização negada pelo usuário")
  }

  // CSRF — verify state cookie
  const savedState = request.cookies.get("meta_oauth_state")?.value
  if (!state || !savedState || state !== savedState) {
    return fail("Estado inválido — tente novamente")
  }
  if (!code) return fail("Código de autorização ausente")

  const appId = process.env.META_APP_ID
  const appSecret = process.env.META_APP_SECRET

  if (!appId || !appSecret || !appUrl) {
    return fail("META_APP_ID / META_APP_SECRET não configurados no servidor")
  }

  const redirectUri = `${appUrl}/api/meta/oauth/callback`

  try {
    // Step 1: code → short-lived user token
    const tokenRes = await fetch(
      `https://graph.facebook.com/v21.0/oauth/access_token` +
        `?client_id=${appId}` +
        `&redirect_uri=${encodeURIComponent(redirectUri)}` +
        `&client_secret=${appSecret}` +
        `&code=${code}`
    )
    const tokenData = await tokenRes.json()
    if (!tokenRes.ok || !tokenData.access_token) {
      throw new Error(tokenData.error?.message ?? "Falha ao obter token de acesso")
    }

    // Step 2: short-lived → long-lived user token (~60 days)
    const longTokenRes = await fetch(
      `https://graph.facebook.com/v21.0/oauth/access_token` +
        `?grant_type=fb_exchange_token` +
        `&client_id=${appId}` +
        `&client_secret=${appSecret}` +
        `&fb_exchange_token=${tokenData.access_token}`
    )
    const longTokenData = await longTokenRes.json()
    if (!longTokenRes.ok || !longTokenData.access_token) {
      throw new Error(longTokenData.error?.message ?? "Falha ao obter token de longa duração")
    }
    const longLivedUserToken: string = longTokenData.access_token

    // Step 3: fetch all pages — names + IDs only (no tokens sent to client)
    const accountsRes = await fetch(
      `https://graph.facebook.com/v21.0/me/accounts?fields=id,name&access_token=${longLivedUserToken}`
    )
    const accountsData = await accountsRes.json()
    if (!accountsRes.ok || !Array.isArray(accountsData.data)) {
      throw new Error(accountsData.error?.message ?? "Falha ao buscar páginas do usuário")
    }

    const pages: Array<{ id: string; name: string }> = accountsData.data

    if (pages.length === 0) {
      throw new Error(
        "Nenhuma página encontrada — certifique-se de ser administrador de pelo menos uma página"
      )
    }

    // Store user token in a short-lived httpOnly cookie — never sent to the browser JS
    const pagesEncoded = Buffer.from(JSON.stringify(pages)).toString("base64")
    const selectUrl = `${appUrl}/settings/integrations/meta-page-select?pages=${pagesEncoded}`

    const response = NextResponse.redirect(selectUrl)
    response.cookies.delete("meta_oauth_state")
    response.cookies.set("meta_pending_token", longLivedUserToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 10, // 10 minutes to complete page selection
      path: "/",
    })
    return response
  } catch (err) {
    console.error("[meta oauth callback]", err)
    return fail(err instanceof Error ? err.message : "Erro desconhecido")
  }
}
