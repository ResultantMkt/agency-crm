import { auth } from "@/lib/auth"
import { NextRequest, NextResponse } from "next/server"
import crypto from "crypto"

export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 })

  const appId = process.env.META_APP_ID
  const appUrl = process.env.NEXT_PUBLIC_APP_URL

  if (!appId) return Response.json({ error: "META_APP_ID não configurado" }, { status: 500 })
  if (!appUrl) return Response.json({ error: "NEXT_PUBLIC_APP_URL não configurado" }, { status: 500 })

  const state = crypto.randomBytes(16).toString("hex")

  const oauthUrl = new URL("https://www.facebook.com/v21.0/dialog/oauth")
  oauthUrl.searchParams.set("client_id", appId)
  oauthUrl.searchParams.set("redirect_uri", `${appUrl}/api/meta/oauth/callback`)
  oauthUrl.searchParams.set("scope", "pages_show_list,pages_read_engagement,pages_manage_metadata,leads_retrieval")
  oauthUrl.searchParams.set("state", state)
  oauthUrl.searchParams.set("response_type", "code")

  const response = NextResponse.redirect(oauthUrl.toString())
  response.cookies.set("meta_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 10,
    path: "/",
  })
  return response
}
