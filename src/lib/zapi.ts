export function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, "")
}

/** Strip the `data:...;base64,` prefix — Z-API requires raw base64 for video/document */
function extractBase64(dataUri: string): string {
  const idx = dataUri.indexOf(";base64,")
  return idx >= 0 ? dataUri.slice(idx + 8) : dataUri
}

export async function getZapiConfig() {
  const { prisma } = await import("@/lib/prisma")
  const integration = await prisma.integration.findUnique({ where: { name: "ZAPI" } })
  const config = integration?.config as Record<string, string> | null
  return {
    baseUrl: config?.baseUrl ?? process.env.ZAPI_BASE_URL ?? "https://api.z-api.io/instances",
    instanceId: config?.instanceId ?? process.env.ZAPI_INSTANCE_ID ?? "",
    token: config?.token ?? process.env.ZAPI_TOKEN ?? "",
    clientToken: config?.clientToken ?? process.env.ZAPI_CLIENT_TOKEN ?? "",
  }
}

export async function sendWhatsAppMessage(phone: string, message: string): Promise<void> {
  const { baseUrl, instanceId, token, clientToken } = await getZapiConfig()

  if (!baseUrl || !instanceId || !token) {
    throw new Error("Credenciais Z-API não configuradas.")
  }

  const response = await fetch(`${baseUrl}/${instanceId}/token/${token}/send-text`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Client-Token": clientToken },
    body: JSON.stringify({ phone: normalizePhone(phone), message }),
  })

  if (!response.ok) {
    const body = await response.text()
    throw new Error(`Falha ao enviar mensagem via Z-API: ${response.status} — ${body}`)
  }
}

export type MediaType = "image" | "video" | "audio" | "document"

export async function sendWhatsAppMedia(
  phone: string,
  mediaType: MediaType,
  base64: string,
  fileName?: string,
  caption?: string
): Promise<void> {
  const { baseUrl, instanceId, token, clientToken } = await getZapiConfig()

  if (!baseUrl || !instanceId || !token) {
    throw new Error("Credenciais Z-API não configuradas.")
  }

  const normalized = normalizePhone(phone)
  let endpoint: string
  let body: Record<string, unknown>

  switch (mediaType) {
    case "image":
      endpoint = "send-image"
      body = { phone: normalized, image: base64, caption: caption ?? "" }
      break
    case "video":
      endpoint = "send-video"
      body = { phone: normalized, video: extractBase64(base64), caption: caption ?? "" }
      break
    case "audio":
      endpoint = "send-audio"
      body = { phone: normalized, audio: extractBase64(base64), audioType: "ogg" }
      break
    case "document": {
      const ext = fileName?.split(".").pop()?.toLowerCase() ?? ""
      endpoint = "send-document"
      body = { phone: normalized, document: extractBase64(base64), fileName: fileName ?? "arquivo", extension: ext, caption: caption ?? "" }
      break
    }
  }

  const response = await fetch(`${baseUrl}/${instanceId}/token/${token}/${endpoint}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Client-Token": clientToken },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Falha ao enviar mídia via Z-API: ${response.status} — ${text}`)
  }
}
