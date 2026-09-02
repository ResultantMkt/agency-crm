import { prisma } from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams
  const code = params.get("code")
  const state = params.get("state")
  const oauthError = params.get("error")

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? ""
  const redirectBase = `${appUrl}/settings/integrations`

  function fail(msg: string) {
    return NextResponse.redirect(`${redirectBase}?meta=error&message=${encodeURIComponent(msg)}`)
  }

  if (oauthError) {
    return fail(params.get("error_description") ?? "Autorização negada pelo usuário")
  }

  // CSRF — verify state cookie
  const savedState = request.cookies.get("meta_oauth_state")?.value
  const response_base = NextResponse.redirect(redirectBase)
  response_base.cookies.delete("meta_oauth_state")

  if (!state || !savedState || state !== savedState) {
    const r = fail("Estado inválido — tente novamente")
    r.cookies.delete("meta_oauth_state")
    return r
  }

  if (!code) {
    const r = fail("Código de autorização ausente")
    r.cookies.delete("meta_oauth_state")
    return r
  }

  const appId = process.env.META_APP_ID
  const appSecret = process.env.META_APP_SECRET
  const appUrlEnv = process.env.NEXT_PUBLIC_APP_URL

  if (!appId || !appSecret || !appUrlEnv) {
    const r = fail("Variáveis META_APP_ID / META_APP_SECRET não configuradas no servidor")
    r.cookies.delete("meta_oauth_state")
    return r
  }

  const redirectUri = `${appUrlEnv}/api/meta/oauth/callback`

  try {
    // Step 1: Exchange authorization code → short-lived user token
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
    const shortLivedToken: string = tokenData.access_token

    // Step 2: Exchange short-lived → long-lived user token (~60 days)
    const longTokenRes = await fetch(
      `https://graph.facebook.com/v21.0/oauth/access_token` +
      `?grant_type=fb_exchange_token` +
      `&client_id=${appId}` +
      `&client_secret=${appSecret}` +
      `&fb_exchange_token=${shortLivedToken}`
    )
    const longTokenData = await longTokenRes.json()
    if (!longTokenRes.ok || !longTokenData.access_token) {
      throw new Error(longTokenData.error?.message ?? "Falha ao obter token de longa duração")
    }
    const longLivedUserToken: string = longTokenData.access_token

    // Step 3: List pages managed by the user — page tokens obtained this way
    // are already permanent (non-expiring) when the user token is long-lived.
    const accountsRes = await fetch(
      `https://graph.facebook.com/v21.0/me/accounts?access_token=${longLivedUserToken}`
    )
    const accountsData = await accountsRes.json()
    if (!accountsRes.ok || !Array.isArray(accountsData.data)) {
      throw new Error(accountsData.error?.message ?? "Falha ao buscar páginas do usuário")
    }

    const pages: Array<{ id: string; name: string; access_token: string }> = accountsData.data

    if (pages.length === 0) {
      throw new Error("Nenhuma página do Facebook encontrada na conta — certifique-se de ser admin da página")
    }

    // Step 4: Pick the target page (filter by META_PAGE_ID if set, otherwise take the first)
    const targetPageId = process.env.META_PAGE_ID
    let page = targetPageId ? pages.find((p) => p.id === targetPageId) : pages[0]

    if (!page) {
      throw new Error(
        `Página ${targetPageId} não encontrada. Páginas disponíveis: ${pages.map((p) => `${p.name} (${p.id})`).join(", ")}`
      )
    }

    const pageAccessToken = page.access_token

    // Step 5: Save to DB (upsert so reconnecting overwrites cleanly)
    await prisma.integration.upsert({
      where: { name: "META_LEADGEN" },
      update: {
        config: {
          pageAccessToken,
          pageId: page.id,
          pageName: page.name,
          connectedAt: new Date().toISOString(),
        },
      },
      create: {
        name: "META_LEADGEN",
        config: {
          pageAccessToken,
          pageId: page.id,
          pageName: page.name,
          connectedAt: new Date().toISOString(),
        },
      },
    })

    console.log(`[meta oauth] Integração salva — página: ${page.name} (${page.id})`)

    // Step 6: Subscribe the page to the leadgen webhook field
    const subscribeRes = await fetch(
      `https://graph.facebook.com/v21.0/${page.id}/subscribed_apps`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subscribed_fields: ["leadgen"],
          access_token: pageAccessToken,
        }),
      }
    )
    const subscribeData = await subscribeRes.json()

    if (!subscribeRes.ok || !subscribeData.success) {
      // Token is saved — log the warning but don't block the user
      console.warn("[meta oauth] Assinatura do webhook falhou:", JSON.stringify(subscribeData))
    } else {
      console.log(`[meta oauth] Página ${page.id} assinada no webhook leadgen`)
    }

    const successRedirect = NextResponse.redirect(
      `${redirectBase}?meta=connected&page=${encodeURIComponent(page.name)}`
    )
    successRedirect.cookies.delete("meta_oauth_state")
    return successRedirect
  } catch (err) {
    console.error("[meta oauth callback]", err)
    const msg = err instanceof Error ? err.message : "Erro desconhecido"
    const r = fail(msg)
    r.cookies.delete("meta_oauth_state")
    return r
  }
}
