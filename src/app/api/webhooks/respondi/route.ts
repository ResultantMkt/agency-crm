import { findOrCreateLead } from "@/lib/lead-capture"
import { normalizePhone } from "@/lib/zapi"
import { NextRequest } from "next/server"

/**
 * Webhook do Respondi Forms — cria leads automaticamente no estágio LEAD.
 *
 * Configure no painel do Respondi: Opções > Integrações > Webhooks
 * URL: https://<seu-domínio>/api/webhooks/respondi?secret=<WEBHOOK_SECRET>
 *
 * O handler aceita três formatos de payload:
 *   1. Flat:     { name, phone, email, ... }
 *   2. Answers:  { answers: [{ field: { ref, title }, text, phone_number, email }] }
 *   3. Responses object: { responses: { name, phone, email } }
 *
 * O payload completo é sempre logado para facilitar o mapeamento de campos.
 */
export async function POST(request: NextRequest) {
  const secret = process.env.WEBHOOK_SECRET
  if (secret) {
    const provided =
      request.nextUrl.searchParams.get("secret") ??
      request.headers.get("x-webhook-secret")
    if (provided !== secret) {
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    console.error("[respondi webhook] Payload inválido — não é JSON")
    return Response.json({ error: "Invalid JSON" }, { status: 400 })
  }

  // Sempre logar o payload completo para facilitar o mapeamento de campos
  console.log("[respondi webhook] Payload recebido:", JSON.stringify(body, null, 2))

  if (!body || typeof body !== "object") {
    console.error("[respondi webhook] Payload não é um objeto")
    return Response.json({ error: "Payload must be a JSON object" }, { status: 400 })
  }

  const raw = body as Record<string, unknown>

  // ── Extração de campos ────────────────────────────────────────────────────
  let name: string | undefined
  let phone: string | undefined
  let email: string | undefined

  // Formato 1 — campos flat no root do payload
  name  = strVal(raw.name)  ?? strVal(raw.nome)
  phone = strVal(raw.phone) ?? strVal(raw.telefone) ?? strVal(raw.whatsapp) ?? strVal(raw.celular)
  email = strVal(raw.email)

  // Formato 2 — array de answers (Typeform / Respondi style)
  if (Array.isArray(raw.answers)) {
    for (const answer of raw.answers as Record<string, unknown>[]) {
      const field = answer.field as Record<string, unknown> | undefined
      const ref = (strVal(field?.ref) ?? strVal(field?.title) ?? strVal(field?.label) ?? "").toLowerCase()
      const value =
        strVal(answer.text) ??
        strVal(answer.phone_number) ??
        strVal(answer.email) ??
        strVal(answer.value) ??
        ""

      if (!name  && /\bnome\b|^name/.test(ref))                         name  = value
      if (!phone && /phone|telefone|whatsapp|celular|mobile/.test(ref))  phone = value
      if (!email && /e-?mail/.test(ref))                                  email = value
    }
  }

  // Formato 3 — objeto "responses"
  if (raw.responses && typeof raw.responses === "object") {
    const r = raw.responses as Record<string, unknown>
    name  = name  ?? strVal(r.name)  ?? strVal(r.nome)
    phone = phone ?? strVal(r.phone) ?? strVal(r.telefone) ?? strVal(r.whatsapp)
    email = email ?? strVal(r.email)
  }

  // ── Validação mínima ──────────────────────────────────────────────────────
  if (!name && !phone && !email) {
    console.error(
      "[respondi webhook] Nenhum campo reconhecido (name/phone/email) — verifique o mapeamento de campos no log acima"
    )
    return Response.json(
      {
        error: "Nenhum campo reconhecido no payload",
        hint: "Verifique os logs do servidor para ver o payload completo e ajuste o mapeamento",
      },
      { status: 422 }
    )
  }

  // Normalizar telefone (remover caracteres não-numéricos)
  const normalizedPhone = phone ? normalizePhone(phone) : undefined

  if (!normalizedPhone && !email) {
    console.error("[respondi webhook] Sem telefone nem email para deduplicação:", { name, phone, email })
    return Response.json(
      { error: "É necessário ao menos telefone ou email para identificar o lead" },
      { status: 422 }
    )
  }

  try {
    const { leadId, created } = await findOrCreateLead({
      name: name ?? normalizedPhone ?? email ?? "Sem nome",
      phone: normalizedPhone ?? "",
      email: email ?? null,
      source: "TRAFFIC",
      notes: `Lead gerado automaticamente via Respondi Forms${strVal(raw.form_id) ? ` (form: ${raw.form_id})` : ""}`,
    })

    console.log(
      `[respondi webhook] Lead ${created ? "criado" : "já existia"}: id=${leadId} phone=${normalizedPhone} email=${email}`
    )

    return Response.json({ ok: true, leadId, created }, { status: created ? 201 : 200 })
  } catch (error) {
    console.error("[respondi webhook] Erro ao criar/encontrar lead:", error)
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}

function strVal(v: unknown): string | undefined {
  if (typeof v === "string" && v.trim()) return v.trim()
  return undefined
}
