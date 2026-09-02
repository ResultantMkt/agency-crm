import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { NextRequest } from "next/server"

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 })

  const userToken = request.cookies.get("meta_pending_token")?.value
  if (!userToken) {
    return Response.json(
      { error: "Sessão de conexão expirada — clique em Conectar novamente" },
      { status: 400 }
    )
  }

  const body = await request.json()
  const pageId: string = body.pageId

  if (!pageId) {
    return Response.json({ error: "pageId é obrigatório" }, { status: 400 })
  }

  // Re-fetch pages with access tokens using the stored user token
  const accountsRes = await fetch(
    `https://graph.facebook.com/v21.0/me/accounts?access_token=${userToken}`
  )
  const accountsData = await accountsRes.json()

  if (!accountsRes.ok || !Array.isArray(accountsData.data)) {
    return Response.json(
      { error: accountsData.error?.message ?? "Falha ao buscar páginas do Meta" },
      { status: 502 }
    )
  }

  const page = (accountsData.data as Array<{ id: string; name: string; access_token: string }>).find(
    (p) => p.id === pageId
  )

  if (!page) {
    return Response.json(
      { error: `Página ${pageId} não encontrada na conta` },
      { status: 404 }
    )
  }

  // Save to DB
  await prisma.integration.upsert({
    where: { name: "META_LEADGEN" },
    update: {
      config: {
        pageAccessToken: page.access_token,
        pageId: page.id,
        pageName: page.name,
        connectedAt: new Date().toISOString(),
      },
    },
    create: {
      name: "META_LEADGEN",
      config: {
        pageAccessToken: page.access_token,
        pageId: page.id,
        pageName: page.name,
        connectedAt: new Date().toISOString(),
      },
    },
  })

  console.log(`[meta oauth confirm] Integração salva — ${page.name} (${page.id})`)

  // Subscribe page to leadgen webhook field
  const subscribeRes = await fetch(
    `https://graph.facebook.com/v21.0/${page.id}/subscribed_apps`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        subscribed_fields: ["leadgen"],
        access_token: page.access_token,
      }),
    }
  )
  const subscribeData = await subscribeRes.json()

  if (!subscribeRes.ok || !subscribeData.success) {
    console.warn("[meta oauth confirm] Assinatura do webhook falhou:", JSON.stringify(subscribeData))
  } else {
    console.log(`[meta oauth confirm] Página ${page.id} assinada no campo leadgen`)
  }

  const responseJson = Response.json({ ok: true, pageName: page.name, pageId: page.id })

  // Clear the pending token cookie
  const headers = new Headers(responseJson.headers)
  headers.append(
    "Set-Cookie",
    `meta_pending_token=; Path=/; HttpOnly; Max-Age=0; SameSite=Lax${
      process.env.NODE_ENV === "production" ? "; Secure" : ""
    }`
  )

  return new Response(responseJson.body, {
    status: 200,
    headers,
  })
}
