import { auth } from "@/lib/auth"
import { getZapiConfig } from "@/lib/zapi"

export async function GET() {
  try {
    const session = await auth()
    if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 })

    const { baseUrl, instanceId, token } = await getZapiConfig()

    if (!baseUrl || !instanceId || !token) {
      return Response.json({ groups: [] })
    }

    const res = await fetch(`${baseUrl}/${instanceId}/token/${token}/chats`, {
      headers: { "Content-Type": "application/json" },
    })

    if (!res.ok) {
      console.error("[GET /api/zapi/groups] Z-API error:", res.status)
      return Response.json({ groups: [] })
    }

    const data = await res.json()
    const chats = Array.isArray(data) ? data : (data.chats ?? data.value ?? [])

    const groups = chats
      .filter((c: Record<string, unknown>) => c.isGroup === true || String(c.phone ?? "").includes("@g.us"))
      .map((c: Record<string, unknown>) => ({
        phone: String(c.phone ?? c.id ?? ""),
        name: String(c.name ?? c.subject ?? c.phone ?? ""),
      }))

    return Response.json({ groups })
  } catch (error) {
    console.error("[GET /api/zapi/groups]", error)
    return Response.json({ groups: [] })
  }
}
