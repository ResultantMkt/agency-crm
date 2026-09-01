import { findOrCreateLead } from "@/lib/lead-capture"
import { normalizePhone } from "@/lib/zapi"
import { NextRequest } from "next/server"

/**
 * Webhook do Meta Lead Ads — cria leads automaticamente no estágio LEAD com
 * source TRAFFIC (Tráfego Pago).
 *
 * Configure no Meta for Developers:
 *   Callback URL: https://<seu-domínio>/api/webhooks/meta-leadgen
 *   Verify Token: valor de META_VERIFY_TOKEN
 *   Subscriptions: leadgen
 *
 * Variáveis de ambiente necessárias:
 *   META_VERIFY_TOKEN       — token escolhido por nós, usado na verificação inicial
 *   META_PAGE_ACCESS_TOKEN  — Page Access Token de longa duração
 *   META_PAGE_ID            — ID da Página conectada ao formulário (opcional, para filtrar)
 */

// ── GET — Verificação do webhook pelo Meta ────────────────────────────────────
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams
  const mode      = params.get("hub.mode")
  const token     = params.get("hub.verify_token")
  const challenge = params.get("hub.challenge")

  if (mode === "subscribe" && token === process.env.META_VERIFY_TOKEN) {
    console.log("[meta-leadgen webhook] Verificação do webhook aceita")
    return new Response(challenge, { status: 200 })
  }

  console.warn("[meta-leadgen webhook] Falha na verificação — token inválido ou mode incorreto", { mode, token })
  return new Response("Forbidden", { status: 403 })
}

// ── POST — Recebimento de notificação de novo lead ────────────────────────────
export async function POST(request: NextRequest) {
  // Responder 200 imediatamente para o Meta não reenviar a notificação
  // O processamento ocorre de forma síncrona mas deve completar em < 5s
  let body: unknown
  try {
    body = await request.json()
  } catch {
    console.error("[meta-leadgen webhook] Payload inválido — não é JSON")
    return Response.json({ error: "Invalid JSON" }, { status: 400 })
  }

  console.log("[meta-leadgen webhook] Payload recebido:", JSON.stringify(body, null, 2))

  // Extrair todos os leadgen_ids do payload
  // Estrutura: { object: "page", entry: [{ changes: [{ value: { leadgen_id, page_id }, field: "leadgen" }] }] }
  const leadgenIds: string[] = []

  try {
    const payload = body as {
      object?: string
      entry?: Array<{
        changes?: Array<{
          field?: string
          value?: {
            leadgen_id?: string
            page_id?: string
          }
        }>
      }>
    }

    for (const entry of payload.entry ?? []) {
      for (const change of entry.changes ?? []) {
        if (change.field === "leadgen" && change.value?.leadgen_id) {
          leadgenIds.push(change.value.leadgen_id)
        }
      }
    }
  } catch (err) {
    console.error("[meta-leadgen webhook] Erro ao parsear estrutura do payload:", err)
    return Response.json({ ok: true }) // Responde 200 para o Meta não reenviar
  }

  if (leadgenIds.length === 0) {
    console.warn("[meta-leadgen webhook] Nenhum leadgen_id encontrado no payload")
    return Response.json({ ok: true })
  }

  console.log(`[meta-leadgen webhook] leadgen_ids encontrados: ${leadgenIds.join(", ")}`)

  const results: { leadgenId: string; leadId?: string; created?: boolean; error?: string }[] = []

  for (const leadgenId of leadgenIds) {
    try {
      const result = await processLeadgen(leadgenId)
      results.push({ leadgenId, ...result })
    } catch (err) {
      console.error(`[meta-leadgen webhook] Erro ao processar leadgen_id=${leadgenId}:`, err)
      results.push({ leadgenId, error: String(err) })
    }
  }

  return Response.json({ ok: true, results })
}

// ── Processamento individual de cada leadgen_id ───────────────────────────────

async function processLeadgen(
  leadgenId: string
): Promise<{ leadId: string; created: boolean }> {
  const accessToken = process.env.META_PAGE_ACCESS_TOKEN
  if (!accessToken) {
    throw new Error("META_PAGE_ACCESS_TOKEN não configurado")
  }

  // Buscar dados completos do lead via Graph API
  const url = `https://graph.facebook.com/v21.0/${leadgenId}?access_token=${accessToken}`
  const res = await fetch(url)

  if (!res.ok) {
    const errText = await res.text()
    throw new Error(`Graph API retornou ${res.status}: ${errText}`)
  }

  const data = (await res.json()) as {
    id?: string
    field_data?: Array<{ name: string; values: string[] }>
    created_time?: string
  }

  console.log(`[meta-leadgen webhook] Dados do leadgen ${leadgenId}:`, JSON.stringify(data, null, 2))

  // Mapear field_data para campos do lead
  const fields: Record<string, string> = {}
  for (const field of data.field_data ?? []) {
    fields[field.name.toLowerCase()] = field.values[0] ?? ""
  }

  // Suporte aos nomes de campo mais comuns nos formulários do Meta
  const fullNameFromParts = ((fields["first_name"] ?? "") + " " + (fields["last_name"] ?? "")).trim()
  const name =
    fields["full_name"] ??
    fields["nome_completo"] ??
    fields["nome"] ??
    (fullNameFromParts || undefined)

  const phone =
    fields["phone_number"] ??
    fields["telefone"] ??
    fields["whatsapp"] ??
    fields["celular"] ??
    fields["phone"] ??
    undefined

  const email =
    fields["email"] ??
    fields["e_mail"] ??
    undefined

  console.log(`[meta-leadgen webhook] Campos extraídos para ${leadgenId}:`, { name, phone, email, allFields: fields })

  const normalizedPhone = phone ? normalizePhone(phone) : undefined

  if (!normalizedPhone && !email) {
    throw new Error(
      `Lead ${leadgenId} não tem telefone nem email — campos disponíveis: ${Object.keys(fields).join(", ")}`
    )
  }

  const { leadId, created } = await findOrCreateLead({
    name: name ?? normalizedPhone ?? email ?? "Lead Meta",
    phone: normalizedPhone ?? "",
    email: email ?? null,
    source: "TRAFFIC",
    notes: `Lead gerado via Meta Lead Ads (leadgen_id: ${leadgenId})`,
  })

  console.log(
    `[meta-leadgen webhook] Lead ${created ? "criado" : "já existia"}: id=${leadId} leadgen_id=${leadgenId}`
  )

  return { leadId, created }
}
