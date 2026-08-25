import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

async function getZapiConfig() {
  const integration = await prisma.integration.findUnique({ where: { name: "ZAPI" } })
  const config = integration?.config as Record<string, string> | null
  return {
    baseUrl: config?.baseUrl ?? "https://api.z-api.io/instances",
    instanceId: config?.instanceId ?? "",
    token: config?.token ?? "",
  }
}

export async function GET() {
  try {
    const session = await auth()
    if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 })

    const { baseUrl, instanceId, token } = await getZapiConfig()
    if (!instanceId || !token) {
      return Response.json({ error: "Credenciais Z-API não configuradas" }, { status: 400 })
    }

    const res = await fetch(`${baseUrl}/${instanceId}/token/${token}/status`)
    const data = await res.json()
    return Response.json(data, { status: res.status })
  } catch (error) {
    console.error("[GET /api/zapi/status]", error)
    return Response.json({ error: "Erro ao verificar status" }, { status: 500 })
  }
}
