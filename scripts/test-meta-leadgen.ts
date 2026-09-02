/**
 * Script de teste para validar a lógica de criação de lead do webhook Meta Lead Ads.
 * Roda com: npx tsx scripts/test-meta-leadgen.ts
 * Limpa o lead de teste ao final. Não altera código de produção.
 */

import { prisma } from "../src/lib/prisma"
import { findOrCreateLead } from "../src/lib/lead-capture"

// ── Dados simulados que a Graph API do Meta retornaria ────────────────────────
const FAKE_LEADGEN_ID = "TESTE_LOCAL_999999999"

const simulatedFieldData: Array<{ name: string; values: string[] }> = [
  { name: "full_name",     values: ["Fulano Teste Meta"] },
  { name: "phone_number",  values: ["+55 (11) 98765-4321"] },
  { name: "email",         values: ["fulano.teste.meta@example.com"] },
]

// ── Replicar o mapeamento feito pelo processLeadgen ───────────────────────────
function extractFieldsFromMeta(
  fieldData: Array<{ name: string; values: string[] }>
): { name?: string; phone?: string; email?: string } {
  const fields: Record<string, string> = {}
  for (const field of fieldData) {
    fields[field.name.toLowerCase()] = field.values[0] ?? ""
  }

  const fullNameFromParts = (
    (fields["first_name"] ?? "") + " " + (fields["last_name"] ?? "")
  ).trim()

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

  return { name, phone, email }
}

function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, "")
}

// ── Script principal ──────────────────────────────────────────────────────────
async function main() {
  console.log("=".repeat(60))
  console.log("TESTE: Webhook Meta Lead Ads → findOrCreateLead")
  console.log("=".repeat(60))

  // 1. Mostrar os dados simulados
  console.log("\n[1] field_data simulado (como viria da Graph API):")
  console.log(JSON.stringify(simulatedFieldData, null, 2))

  // 2. Extrair campos (mesma lógica do processLeadgen)
  const { name, phone, email } = extractFieldsFromMeta(simulatedFieldData)
  const normalizedPhone = phone ? normalizePhone(phone) : undefined

  console.log("\n[2] Campos extraídos:")
  console.log({ name, phone, email, normalizedPhone })

  if (!normalizedPhone && !email) {
    throw new Error("Lead sem telefone e sem email — não pode ser processado")
  }

  // 3. Garantir estado limpo antes do teste
  const existingBefore = await prisma.lead.findFirst({
    where: {
      OR: [
        { phone: normalizedPhone ?? "" },
        ...(email ? [{ email }] : []),
      ],
    },
  })
  if (existingBefore) {
    console.warn(
      `\n[AVISO] Já existe um lead com esse telefone/email no banco (id=${existingBefore.id}). ` +
      "Removendo antes do teste para garantir isolamento..."
    )
    await prisma.lead.delete({ where: { id: existingBefore.id } })
  }

  // ── CRIAÇÃO (primeira chamada) ────────────────────────────────────────────
  console.log("\n[3] Chamando findOrCreateLead (primeira vez — deve CRIAR)...")
  const result1 = await findOrCreateLead({
    name: name ?? normalizedPhone ?? email ?? "Lead Meta",
    phone: normalizedPhone ?? "",
    email: email ?? null,
    source: "TRAFFIC",
    notes: `Lead gerado via Meta Lead Ads (leadgen_id: ${FAKE_LEADGEN_ID})`,
  })

  console.log("   Resultado:", result1)

  if (!result1.created) {
    throw new Error("FALHOU: esperava created=true, mas o lead não foi criado.")
  }

  // 4. Verificar no banco
  const leadNoBanco = await prisma.lead.findUnique({
    where: { id: result1.leadId },
    select: { id: true, name: true, phone: true, email: true, source: true, stage: true, notes: true },
  })

  if (!leadNoBanco) {
    throw new Error("FALHOU: lead não encontrado no banco após criação.")
  }

  console.log("\n[4] Lead encontrado no banco:")
  console.log(JSON.stringify(leadNoBanco, null, 2))

  // Assertions
  const erros: string[] = []
  if (leadNoBanco.source !== "TRAFFIC")
    erros.push(`source incorreta: ${leadNoBanco.source} (esperado TRAFFIC)`)
  if (leadNoBanco.stage !== "LEAD")
    erros.push(`stage incorreto: ${leadNoBanco.stage} (esperado LEAD)`)
  if (leadNoBanco.name !== (name ?? normalizedPhone ?? email ?? "Lead Meta"))
    erros.push(`nome incorreto: "${leadNoBanco.name}"`)
  if (leadNoBanco.phone !== (normalizedPhone ?? ""))
    erros.push(`telefone incorreto: "${leadNoBanco.phone}" (esperado "${normalizedPhone}")`)
  if (leadNoBanco.email !== (email ?? null))
    erros.push(`email incorreto: "${leadNoBanco.email}"`)

  if (erros.length > 0) {
    throw new Error("FALHOU — campos com valor errado:\n  " + erros.join("\n  "))
  }

  console.log("\n   ✓ source = TRAFFIC (Tráfego Pago)")
  console.log("   ✓ stage  = LEAD")
  console.log("   ✓ nome, telefone e email corretos")

  // ── DEDUP (segunda chamada com mesmo telefone/email) ──────────────────────
  console.log("\n[5] Chamando findOrCreateLead de novo (dedup — deve REUSAR)...")
  const result2 = await findOrCreateLead({
    name: name ?? normalizedPhone ?? email ?? "Lead Meta",
    phone: normalizedPhone ?? "",
    email: email ?? null,
    source: "TRAFFIC",
    notes: `Reenvio duplicado do Meta`,
  })

  console.log("   Resultado:", result2)

  if (result2.created) {
    throw new Error("FALHOU: findOrCreateLead criou um duplicado quando não devia!")
  }
  if (result2.leadId !== result1.leadId) {
    throw new Error(
      `FALHOU: dedup retornou id diferente: ${result2.leadId} vs ${result1.leadId}`
    )
  }

  console.log("   ✓ Dedup OK — mesmo id retornado, created=false")

  // 5. Contar leads com esse telefone (não pode haver duplicata)
  const count = await prisma.lead.count({
    where: {
      OR: [
        { phone: normalizedPhone ?? "" },
        ...(email ? [{ email }] : []),
      ],
    },
  })
  if (count !== 1) {
    throw new Error(`FALHOU: ${count} leads encontrados com esse telefone/email (esperado 1)`)
  }
  console.log("   ✓ Apenas 1 registro no banco com esse telefone/email")

  // 6. Limpeza
  console.log(`\n[6] Limpando lead de teste (id=${result1.leadId})...`)
  await prisma.lead.delete({ where: { id: result1.leadId } })
  const deleted = await prisma.lead.findUnique({ where: { id: result1.leadId } })
  if (deleted) {
    throw new Error("FALHOU: lead de teste não foi removido do banco")
  }
  console.log("   ✓ Lead de teste removido com sucesso")

  console.log("\n" + "=".repeat(60))
  console.log("RESULTADO FINAL: TODOS OS TESTES PASSARAM ✓")
  console.log("=".repeat(60))
}

main()
  .catch((err) => {
    console.error("\n[ERRO FATAL]", err.message ?? err)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
