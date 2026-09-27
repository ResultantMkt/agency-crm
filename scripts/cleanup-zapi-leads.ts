/**
 * Diagnóstico de leads indevidos criados pelo webhook Z-API.
 * SOMENTE LISTA — não apaga nada. Confirme com o autor antes de excluir.
 *
 * Encontra:
 *   1. Leads vinculados a conversas de grupo (isGroup = true)
 *   2. Leads duplicados (mesmo telefone em mais de um registro)
 *   3. Leads com telefone na lista IGNORED_LEAD_PHONES (contatos internos)
 *
 * Uso:
 *   npx tsx scripts/cleanup-zapi-leads.ts
 *   IGNORED_LEAD_PHONES="5511999999999,5521888888888" npx tsx scripts/cleanup-zapi-leads.ts
 */

import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

function phoneBRVariants(raw: string): string[] {
  const digits = raw.replace(/\D/g, "")
  if (!digits) return []
  const set = new Set<string>([digits])
  let base = digits
  if (!digits.startsWith("55") && (digits.length === 10 || digits.length === 11)) {
    base = "55" + digits
    set.add(base)
  }
  if (base.startsWith("55")) {
    const local = base.slice(2)
    set.add(local)
    if (local.length === 11) {
      const ddd = local.slice(0, 2)
      const num = local.slice(2)
      if (num.startsWith("9")) {
        const short = ddd + num.slice(1)
        set.add(short)
        set.add("55" + short)
      }
    } else if (local.length === 10) {
      const long = local.slice(0, 2) + "9" + local.slice(2)
      set.add(long)
      set.add("55" + long)
    }
  }
  return [...set]
}

async function main() {
  console.log("=== Diagnóstico de Leads Z-API ===\n")

  // 1. Leads de grupos
  const groupConversations = await prisma.conversation.findMany({
    where: { isGroup: true, leadId: { not: null } },
    select: { leadId: true, phoneNumber: true, groupName: true, contactName: true },
  })
  const groupLeadIds = groupConversations.map(c => c.leadId!).filter(Boolean)

  const groupLeads =
    groupLeadIds.length > 0
      ? await prisma.lead.findMany({
          where: { id: { in: groupLeadIds } },
          select: { id: true, name: true, phone: true, createdAt: true },
          orderBy: { createdAt: "asc" },
        })
      : []

  console.log(`📌 1. Leads de GRUPOS (${groupLeads.length} encontrados)`)
  if (groupLeads.length > 0) {
    for (const l of groupLeads) {
      const conv = groupConversations.find(c => c.leadId === l.id)
      console.log(`  ID: ${l.id}  Nome: "${l.name}"  Tel: ${l.phone}  Criado: ${l.createdAt.toISOString().slice(0, 10)}`)
      if (conv?.groupName) console.log(`    → Nome do grupo: "${conv.groupName}"`)
    }
  } else {
    console.log("  Nenhum encontrado.\n")
  }

  // 2. Leads duplicados (mesmo telefone)
  const allLeads = await prisma.lead.findMany({
    select: { id: true, name: true, phone: true, createdAt: true },
    orderBy: { phone: "asc" },
  })

  const phoneMap = new Map<string, typeof allLeads>()
  for (const lead of allLeads) {
    const key = lead.phone ?? ""
    const existing = phoneMap.get(key) ?? []
    existing.push(lead)
    phoneMap.set(key, existing)
  }

  const duplicates = [...phoneMap.entries()].filter(([, leads]) => leads.length > 1)

  console.log(`\n📌 2. Leads DUPLICADOS por telefone (${duplicates.length} grupos)`)
  if (duplicates.length > 0) {
    for (const [phone, leads] of duplicates) {
      console.log(`  Telefone: ${phone}`)
      for (const l of leads) {
        console.log(`    ID: ${l.id}  Nome: "${l.name}"  Criado: ${l.createdAt.toISOString().slice(0, 10)}`)
      }
    }
  } else {
    console.log("  Nenhum encontrado.\n")
  }

  // 3. Leads na lista de ignorados (IGNORED_LEAD_PHONES)
  const rawIgnored = process.env.IGNORED_LEAD_PHONES ?? ""
  const ignoredVariants = new Set<string>()
  for (const entry of rawIgnored.split(",")) {
    const t = entry.trim()
    if (t) for (const v of phoneBRVariants(t)) ignoredVariants.add(v)
  }

  const ignoredLeads =
    ignoredVariants.size > 0
      ? allLeads.filter(l => l.phone != null && ignoredVariants.has(l.phone))
      : []

  console.log(
    `\n📌 3. Leads com telefone em IGNORED_LEAD_PHONES (${ignoredLeads.length} encontrados)`
  )
  if (ignoredVariants.size === 0) {
    console.log("  IGNORED_LEAD_PHONES não configurado — defina a env var para verificar.")
  } else if (ignoredLeads.length > 0) {
    for (const l of ignoredLeads) {
      console.log(`  ID: ${l.id}  Nome: "${l.name}"  Tel: ${l.phone}  Criado: ${l.createdAt.toISOString().slice(0, 10)}`)
    }
  } else {
    console.log("  Nenhum encontrado.\n")
  }

  // Summary
  const totalProblematic = new Set([
    ...groupLeadIds,
    ...duplicates.flatMap(([, leads]) => leads.slice(1).map(l => l.id)), // keep first, remove rest
    ...ignoredLeads.map(l => l.id),
  ])

  console.log("\n" + "=".repeat(50))
  console.log(`Total de leads problemáticos identificados: ${totalProblematic.size}`)
  console.log("IDs para remover (revise antes de confirmar):")
  console.log([...totalProblematic].join("\n"))
  console.log("\nNADA foi apagado. Confirme com o responsável antes de excluir.")
  console.log("=".repeat(50))

  await prisma.$disconnect()
}

main().catch(e => {
  console.error(e)
  process.exit(1)
})
