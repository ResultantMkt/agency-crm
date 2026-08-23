// Executar: npx tsx scripts/import-data.ts ./clientes.csv
import { parse } from "csv-parse/sync"
import { readFileSync } from "fs"
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

type StatusMap = Record<string, "ACTIVE" | "CHURN" | "NOT_RENEWED">
type BillingMap = Record<string, "MONTHLY" | "OTHER">

const STATUS_MAP: StatusMap = {
  Ativo: "ACTIVE",
  Churn: "CHURN",
  "Não renovou": "NOT_RENEWED",
}

const BILLING_MAP: BillingMap = {
  Mensal: "MONTHLY",
}

interface CsvRow {
  Nome: string
  ValorContrato: string
  TipoCobrança: string
  DataInicio: string
  DataFim: string
  Duracao: string
  Status: string
  Observações: string
}

function parseDecimal(value: string): number {
  // Aceita formatos: "1.500,00" ou "1500.00" ou "1500"
  const cleaned = value.trim().replace(/\./g, "").replace(",", ".")
  const num = parseFloat(cleaned)
  return isNaN(num) ? 0 : num
}

function parseDate(value: string): Date | null {
  if (!value || value.trim() === "") return null
  // Tenta formatos: DD/MM/YYYY, YYYY-MM-DD
  const dmyMatch = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  if (dmyMatch) {
    return new Date(`${dmyMatch[3]}-${dmyMatch[2]}-${dmyMatch[1]}`)
  }
  const parsed = new Date(value)
  return isNaN(parsed.getTime()) ? null : parsed
}

async function main() {
  const filePath = process.argv[2]

  if (!filePath) {
    console.error("Uso: npx tsx scripts/import-data.ts ./clientes.csv")
    process.exit(1)
  }

  const fileContent = readFileSync(filePath, "utf-8")

  const rows: CsvRow[] = parse(fileContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    bom: true,
  })

  console.log(`Importando ${rows.length} registro(s)...\n`)

  let created = 0
  let updated = 0
  let errors = 0

  for (const row of rows) {
    const name = row.Nome?.trim()
    if (!name) {
      console.warn("  Linha ignorada: sem nome")
      errors++
      continue
    }

    const contractValue = parseDecimal(row.ValorContrato ?? "0")
    const billingType: "MONTHLY" | "OTHER" = BILLING_MAP[row.TipoCobrança?.trim()] ?? "OTHER"
    const startDate = parseDate(row.DataInicio)
    const endDate = parseDate(row.DataFim)
    const duration = row.Duracao ? parseInt(row.Duracao) : null
    const status: "ACTIVE" | "CHURN" | "NOT_RENEWED" =
      STATUS_MAP[row.Status?.trim()] ?? "ACTIVE"
    const notes = row.Observações?.trim() || null

    if (!startDate) {
      console.warn(`  Linha ignorada (${name}): DataInicio inválida`)
      errors++
      continue
    }

    try {
      // Tentar encontrar por nome + startDate
      const existing = await prisma.client.findFirst({
        where: {
          name,
          startDate: {
            gte: new Date(
              startDate.getFullYear(),
              startDate.getMonth(),
              startDate.getDate()
            ),
            lt: new Date(
              startDate.getFullYear(),
              startDate.getMonth(),
              startDate.getDate() + 1
            ),
          },
        },
      })

      const data = {
        name,
        contractValue,
        billingType,
        startDate,
        endDate: endDate ?? null,
        duration: !isNaN(duration as number) && duration !== null ? duration : null,
        status,
        notes,
      }

      if (existing) {
        await prisma.client.update({
          where: { id: existing.id },
          data,
        })
        console.log(`  Atualizado: ${name}`)
        updated++
      } else {
        await prisma.client.create({ data })
        console.log(`  Criado: ${name}`)
        created++
      }
    } catch (err) {
      console.error(`  Erro ao processar ${name}:`, err)
      errors++
    }
  }

  console.log(`\nConcluído!`)
  console.log(`  Criados:     ${created}`)
  console.log(`  Atualizados: ${updated}`)
  console.log(`  Erros:       ${errors}`)
}

main()
  .catch((err) => {
    console.error("Erro fatal:", err)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
