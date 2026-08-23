export function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, "")
}

export async function sendWhatsAppMessage(
  phone: string,
  message: string
): Promise<void> {
  const baseUrl = process.env.ZAPI_BASE_URL
  const instanceId = process.env.ZAPI_INSTANCE_ID
  const token = process.env.ZAPI_TOKEN

  if (!baseUrl) {
    throw new Error(
      "ZAPI_BASE_URL não está configurado. Defina a variável de ambiente antes de enviar mensagens."
    )
  }

  const url = `${baseUrl}/${instanceId}/token/${token}/send-text`

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ phone: normalizePhone(phone), message }),
  })

  if (!response.ok) {
    const body = await response.text()
    throw new Error(
      `Falha ao enviar mensagem via Z-API: ${response.status} ${response.statusText} — ${body}`
    )
  }
}
