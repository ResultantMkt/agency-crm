import { auth } from "@/lib/auth"
import { getZapiConfig } from "@/lib/zapi"
import { NextRequest } from "next/server"

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 })

    const phone = request.nextUrl.searchParams.get("phone")
    if (!phone) return Response.json({ url: null })

    const { baseUrl, instanceId, token, clientToken } = await getZapiConfig()
    if (!instanceId || !token) return Response.json({ url: null })

    const normalized = phone.replace(/\D/g, "")
    const res = await fetch(
      `${baseUrl}/${instanceId}/token/${token}/profile-picture?phone=${normalized}`,
      { headers: { "Client-Token": clientToken } }
    )

    if (!res.ok) return Response.json({ url: null })

    const data = await res.json()
    const url: string | null = data?.value ?? data?.url ?? data?.photo ?? null
    return Response.json({ url })
  } catch {
    return Response.json({ url: null })
  }
}
