import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { NextRequest } from "next/server"

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 })

    const phone = request.nextUrl.searchParams.get("phone")
    if (!phone) return Response.json({ url: null })

    const integration = await prisma.integration.findUnique({ where: { name: "ZAPI" } })
    const config = integration?.config as Record<string, string> | null
    const baseUrl = config?.baseUrl ?? "https://api.z-api.io/instances"
    const instanceId = config?.instanceId ?? ""
    const token = config?.token ?? ""
    const clientToken = config?.clientToken ?? ""

    if (!instanceId || !token) return Response.json({ url: null })

    const normalized = phone.replace(/\D/g, "")
    const res = await fetch(
      `${baseUrl}/${instanceId}/token/${token}/profile-picture?phone=${normalized}`,
      { headers: { "Client-Token": clientToken } }
    )

    if (!res.ok) return Response.json({ url: null })

    const data = await res.json()
    return Response.json({ url: data?.value ?? data?.url ?? null })
  } catch {
    return Response.json({ url: null })
  }
}
