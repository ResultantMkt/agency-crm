import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { formatMonth, getStartOfMonth, getEndOfMonth } from "@/lib/utils"

export const metadata: Metadata = {
  title: "Comercial — Dashboard de Vendas — Agency CRM",
}

// ─── Inline components ───────────────────────────────────────────────────────

function StageCard({
  label,
  count,
  color,
}: {
  label: string
  count: number
  color: "blue" | "green" | "red" | "gray"
}) {
  const colorMap = {
    blue: "border-blue-700/50 bg-blue-500/10 text-blue-400",
    green: "border-emerald-700/50 bg-emerald-500/10 text-emerald-400",
    red: "border-red-700/50 bg-red-500/10 text-red-400",
    gray: "border-gray-700/50 bg-gray-800/50 text-gray-400",
  }

  const countColor = {
    blue: "text-white",
    green: "text-emerald-300",
    red: "text-red-300",
    gray: "text-white",
  }

  return (
    <div className={`rounded-lg border p-5 ${colorMap[color]}`}>
      <p className="text-xs font-medium uppercase tracking-wide">{label}</p>
      <p className={`mt-2 text-3xl font-bold ${countColor[color]}`}>{count}</p>
    </div>
  )
}

function ConversionCard({
  from,
  to,
  rate,
}: {
  from: string
  to: string
  rate: number
}) {
  const rateColor =
    rate >= 50
      ? "text-emerald-400"
      : rate >= 25
      ? "text-yellow-400"
      : "text-red-400"

  const barColor =
    rate >= 50 ? "bg-emerald-500" : rate >= 25 ? "bg-yellow-500" : "bg-red-500"

  return (
    <div className="rounded-lg border border-gray-700/30 bg-gray-900/50 p-5">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-medium text-gray-300">
          {from} → {to}
        </p>
        <span className={`text-2xl font-bold ${rateColor}`}>
          {rate.toFixed(0)}%
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-gray-700">
        <div
          className={`h-2 rounded-full transition-all ${barColor}`}
          style={{ width: `${Math.min(rate, 100)}%` }}
        />
      </div>
    </div>
  )
}

function FunnelBar({
  label,
  count,
  maxCount,
  color,
}: {
  label: string
  count: number
  maxCount: number
  color: "blue" | "green" | "red"
}) {
  const pct = maxCount > 0 ? (count / maxCount) * 100 : 0

  const barColor = {
    blue: "bg-blue-500",
    green: "bg-emerald-500",
    red: "bg-red-500",
  }[color]

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-sm font-medium text-gray-300">{label}</span>
        <span className="text-sm text-gray-500">
          {count} <span className="text-gray-600">({pct.toFixed(0)}%)</span>
        </span>
      </div>
      <div className="h-3 w-full overflow-hidden rounded-full bg-gray-700">
        <div
          className={`h-3 rounded-full transition-all ${barColor}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

// ─── Stage config ─────────────────────────────────────────────────────────────

const STAGE_LABELS: Record<string, string> = {
  LEAD: "Leads",
  MQL: "MQL",
  MEETING_SCHEDULED: "Reuniões Agendadas",
  MEETING_DONE: "Reuniões Realizadas",
  PROPOSAL: "Propostas",
  CLOSED: "Fechados",
  LOST: "Perdidos",
}

const STAGE_ORDER = [
  "LEAD",
  "MQL",
  "MEETING_SCHEDULED",
  "MEETING_DONE",
  "PROPOSAL",
  "CLOSED",
  "LOST",
] as const

function stageColor(stage: string): "blue" | "green" | "red" | "gray" {
  if (stage === "CLOSED") return "green"
  if (stage === "LOST") return "red"
  return "gray"
}

function funnelBarColor(stage: string): "blue" | "green" | "red" {
  if (stage === "CLOSED") return "green"
  if (stage === "LOST") return "red"
  return "blue"
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function ComercialDashboardPage() {
  const session = await auth()
  if (!session?.user) {
    redirect("/login")
  }

  const now = new Date()
  const startOfMonth = getStartOfMonth(now)
  const endOfMonth = getEndOfMonth(now)

  const thirtyDaysAgo = new Date(now)
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const [funnelMonth, funnelAll, leadsLast30] = await Promise.all([
    // Leads por stage no mês atual
    prisma.lead.groupBy({
      by: ["stage"],
      where: {
        createdAt: { gte: startOfMonth, lte: endOfMonth },
      },
      _count: { stage: true },
    }),

    // Leads por stage — histórico total
    prisma.lead.groupBy({
      by: ["stage"],
      _count: { stage: true },
    }),

    // Leads criados nos últimos 30 dias
    prisma.lead.count({
      where: {
        createdAt: { gte: thirtyDaysAgo },
      },
    }),
  ])

  // Mapear contagens do mês por stage
  const monthMap: Record<string, number> = {}
  for (const row of funnelMonth) {
    monthMap[row.stage] = row._count.stage
  }

  // Mapear contagens históricas por stage
  const allMap: Record<string, number> = {}
  for (const row of funnelAll) {
    allMap[row.stage] = row._count.stage
  }

  // Contagens do mês por stage
  const leadCount = monthMap["LEAD"] ?? 0
  const mqlCount = monthMap["MQL"] ?? 0
  const meetingScheduled = monthMap["MEETING_SCHEDULED"] ?? 0
  const meetingDone = monthMap["MEETING_DONE"] ?? 0
  const proposalCount = monthMap["PROPOSAL"] ?? 0
  const closedCount = monthMap["CLOSED"] ?? 0
  const lostCount = monthMap["LOST"] ?? 0

  // Reuniões = agendadas + realizadas
  const reunioes = meetingScheduled + meetingDone

  // Taxas de conversão do mês
  const rateLeadToMql = leadCount > 0 ? (mqlCount / leadCount) * 100 : 0
  const rateMqlToReuniao = mqlCount > 0 ? (reunioes / mqlCount) * 100 : 0
  const rateReuniaoToFechado =
    reunioes > 0 ? (closedCount / reunioes) * 100 : 0

  // Maior contagem do mês para normalizar as barras do funil
  const maxMonthCount = Math.max(
    leadCount,
    mqlCount,
    meetingScheduled,
    meetingDone,
    proposalCount,
    closedCount,
    lostCount,
    1
  )

  const monthCountByStage: Record<string, number> = {
    LEAD: leadCount,
    MQL: mqlCount,
    MEETING_SCHEDULED: meetingScheduled,
    MEETING_DONE: meetingDone,
    PROPOSAL: proposalCount,
    CLOSED: closedCount,
    LOST: lostCount,
  }

  return (
    <div className="space-y-8">
      {/* Cabeçalho */}
      <div>
        <h2 className="text-2xl font-bold text-white">
          Comercial — Dashboard de Vendas
        </h2>
        <p className="mt-1 text-sm text-gray-400">
          {formatMonth(now)} · {leadsLast30} lead
          {leadsLast30 !== 1 ? "s" : ""} nos últimos 30 dias
        </p>
      </div>

      {/* Cards de contagem por stage — mês atual */}
      <section>
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
          Funil do Mês
        </h3>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-7">
          {STAGE_ORDER.map((stage) => (
            <StageCard
              key={stage}
              label={STAGE_LABELS[stage]}
              count={monthCountByStage[stage]}
              color={stageColor(stage)}
            />
          ))}
        </div>
      </section>

      {/* Funil visual */}
      <section>
        <div className="rounded-lg border border-gray-700/50 bg-gray-800/50 p-6">
          <h3 className="mb-1 text-base font-semibold text-white">
            Progressão do Funil
          </h3>
          <p className="mb-5 text-xs text-gray-500">
            Barras relativas ao stage com maior volume no mês
          </p>

          <div className="space-y-4">
            {STAGE_ORDER.map((stage) => (
              <FunnelBar
                key={stage}
                label={STAGE_LABELS[stage]}
                count={monthCountByStage[stage]}
                maxCount={maxMonthCount}
                color={funnelBarColor(stage)}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Cards de taxa de conversão */}
      <section>
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
          Taxas de Conversão — {formatMonth(now)}
        </h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <ConversionCard
            from="Lead"
            to="MQL"
            rate={rateLeadToMql}
          />
          <ConversionCard
            from="MQL"
            to="Reunião"
            rate={rateMqlToReuniao}
          />
          <ConversionCard
            from="Reunião"
            to="Fechado"
            rate={rateReuniaoToFechado}
          />
        </div>
      </section>

      {/* Volume histórico por stage */}
      <section>
        <div className="rounded-lg border border-gray-700/50 bg-gray-800/50 p-6">
          <h3 className="mb-1 text-base font-semibold text-white">
            Volume Histórico por Stage
          </h3>
          <p className="mb-5 text-xs text-gray-500">
            Total acumulado de todos os períodos
          </p>

          <div className="grid grid-cols-2 gap-x-8 gap-y-3 sm:grid-cols-3 lg:grid-cols-7">
            {STAGE_ORDER.map((stage) => {
              const total = allMap[stage] ?? 0
              return (
                <div key={stage} className="text-center">
                  <p className="text-2xl font-bold text-white">{total}</p>
                  <p className="mt-0.5 text-xs text-gray-500">
                    {STAGE_LABELS[stage]}
                  </p>
                </div>
              )
            })}
          </div>
        </div>
      </section>
    </div>
  )
}
