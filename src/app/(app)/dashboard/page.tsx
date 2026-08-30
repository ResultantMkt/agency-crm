import type { Metadata } from "next"
import { redirect } from "next/navigation"
import {
  Users,
  DollarSign,
  TrendingDown,
  Wallet,
  BarChart2,
  AlertTriangle,
  type LucideIcon,
} from "lucide-react"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { formatCurrency, formatMonth, getStartOfMonth, getEndOfMonth } from "@/lib/utils"

export const metadata: Metadata = {
  title: "Dashboard — Agency CRM",
}

function MetricCard({
  title,
  value,
  subtitle,
  icon: Icon,
  color,
}: {
  title: string
  value: string
  subtitle?: string
  icon: LucideIcon
  color: "blue" | "green" | "red" | "yellow" | "purple"
}) {
  const colorMap = {
    blue: "text-blue-400 bg-blue-500/10",
    green: "text-emerald-400 bg-emerald-500/10",
    red: "text-red-400 bg-red-500/10",
    yellow: "text-yellow-400 bg-yellow-500/10",
    purple: "text-purple-400 bg-purple-500/10",
  }

  return (
    <div className="bg-gray-800/50 border border-gray-700/50 rounded-lg p-6">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-400">{title}</p>
          <p className="mt-2 text-2xl font-bold text-white truncate">{value}</p>
          {subtitle && (
            <p className="mt-1 text-xs text-gray-500 truncate">{subtitle}</p>
          )}
        </div>
        <div className={`ml-3 shrink-0 rounded-lg p-2.5 ${colorMap[color]}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  )
}

const FUNNEL_STAGES = [
  "LEAD",
  "MQL",
  "MEETING_SCHEDULED",
  "MEETING_DONE",
  "PROPOSAL",
  "CLOSED",
  "LOST",
] as const

const STAGE_LABELS: Record<string, string> = {
  LEAD: "Lead",
  MQL: "MQL",
  MEETING_SCHEDULED: "Reunião Agendada",
  MEETING_DONE: "Reunião Realizada",
  PROPOSAL: "Proposta",
  CLOSED: "Fechado",
  LOST: "Perdido",
}

export default async function DashboardPage() {
  const session = await auth()
  if (!session?.user) {
    redirect("/login")
  }

  const now = new Date()
  const startOfMonth = getStartOfMonth(now)
  const endOfMonth = getEndOfMonth(now)

  const [
    activeClients,
    activeMonthlyClients,
    churnsThisMonth,
    billingResult,
    expensesRecurring,
    expensesOneTime,
    funnelRaw,
    overdueTasksCount,
  ] = await Promise.all([
    prisma.client.count({
      where: { status: "ACTIVE" },
    }),

    prisma.client.findMany({
      where: { status: "ACTIVE", billingType: "MONTHLY" },
      select: { contractValue: true },
    }),

    prisma.client.findMany({
      where: {
        status: "CHURN",
        updatedAt: { gte: startOfMonth, lte: endOfMonth },
      },
      select: { contractValue: true },
    }),

    prisma.receivable.findMany({
      where: {
        status: "PAID",
        referenceMonth: { gte: startOfMonth, lte: endOfMonth },
      },
      select: { value: true },
    }),

    prisma.expense.findMany({
      where: { isRecurring: true },
      select: { value: true },
    }),

    prisma.expense.findMany({
      where: {
        isRecurring: false,
        month: { gte: startOfMonth, lte: endOfMonth },
      },
      select: { value: true },
    }),

    prisma.lead.groupBy({
      by: ["stage"],
      where: {
        createdAt: { gte: startOfMonth, lte: endOfMonth },
      },
      _count: { stage: true },
    }),

    prisma.task.count({
      where: {
        status: "PENDING",
        dueDate: { lt: now },
      },
    }),
  ])

  const mrr = activeMonthlyClients.reduce(
    (sum: number, c: { contractValue: { toString(): string } }) =>
      sum + parseFloat(c.contractValue.toString()),
    0
  )

  const churnValue = churnsThisMonth.reduce(
    (sum: number, c: { contractValue: { toString(): string } }) =>
      sum + parseFloat(c.contractValue.toString()),
    0
  )

  const billing = billingResult.reduce(
    (sum: number, r: { value: { toString(): string } }) =>
      sum + parseFloat(r.value.toString()),
    0
  )

  const expenses =
    expensesRecurring.reduce(
      (sum: number, e: { value: { toString(): string } }) =>
        sum + parseFloat(e.value.toString()),
      0
    ) +
    expensesOneTime.reduce(
      (sum: number, e: { value: { toString(): string } }) =>
        sum + parseFloat(e.value.toString()),
      0
    )

  const cashflow = billing - expenses
  const margin = billing > 0 ? (cashflow / billing) * 100 : 0

  const funnelMap: Record<string, number> = {}
  for (const row of funnelRaw) {
    funnelMap[row.stage] = row._count.stage
  }

  const totalLeads = Object.values(funnelMap).reduce((s, v) => s + v, 0)

  const leadCount = funnelMap["LEAD"] ?? 0
  const mqlCount = funnelMap["MQL"] ?? 0
  const meetingCount = funnelMap["MEETING_SCHEDULED"] ?? 0
  const closedCount = funnelMap["CLOSED"] ?? 0

  const convLeadToMql = leadCount > 0 ? ((mqlCount / leadCount) * 100).toFixed(0) : "0"
  const convMqlToMeeting = mqlCount > 0 ? ((meetingCount / mqlCount) * 100).toFixed(0) : "0"
  const convMeetingToClosed =
    meetingCount > 0 ? ((closedCount / meetingCount) * 100).toFixed(0) : "0"

  return (
    <div className="space-y-6">
      {/* Cards de métricas */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
        <MetricCard
          title="Clientes Ativos"
          value={String(activeClients)}
          subtitle={
            overdueTasksCount > 0
              ? `${overdueTasksCount} tarefa${overdueTasksCount !== 1 ? "s" : ""} atrasada${overdueTasksCount !== 1 ? "s" : ""}`
              : "Sem tarefas atrasadas"
          }
          icon={Users}
          color="blue"
        />
        <MetricCard
          title="MRR"
          value={formatCurrency(mrr)}
          subtitle="Receita recorrente mensal"
          icon={DollarSign}
          color="green"
        />
        <MetricCard
          title="Churns do Mês"
          value={String(churnsThisMonth.length)}
          subtitle={
            churnsThisMonth.length > 0
              ? `Perda: ${formatCurrency(churnValue)}`
              : "Nenhum churn"
          }
          icon={TrendingDown}
          color="red"
        />
        <MetricCard
          title="Caixa do Mês"
          value={formatCurrency(cashflow)}
          subtitle={`Fat: ${formatCurrency(billing)} | Desp: ${formatCurrency(expenses)}`}
          icon={Wallet}
          color={cashflow >= 0 ? "green" : "red"}
        />
        <MetricCard
          title="Margem de Lucro"
          value={`${margin.toFixed(1)}%`}
          subtitle={billing > 0 ? `Base: ${formatCurrency(billing)}` : "Sem faturamento"}
          icon={BarChart2}
          color={margin >= 30 ? "green" : margin >= 10 ? "yellow" : "red"}
        />
      </div>

      {/* Alerta de tarefas atrasadas */}
      {overdueTasksCount > 0 && (
        <div className="flex items-center gap-3 rounded-lg border border-yellow-700/50 bg-yellow-900/20 px-4 py-3">
          <AlertTriangle className="h-4 w-4 shrink-0 text-yellow-400" />
          <p className="text-sm text-yellow-300">
            Você tem{" "}
            <span className="font-semibold">
              {overdueTasksCount} tarefa{overdueTasksCount !== 1 ? "s" : ""}
            </span>{" "}
            atrasada{overdueTasksCount !== 1 ? "s" : ""} pendente
            {overdueTasksCount !== 1 ? "s" : ""}.
          </p>
        </div>
      )}

      {/* Funil e conversões */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Funil */}
        <div className="rounded-lg border border-gray-700/50 bg-gray-800/50 p-6">
          <h3 className="mb-1 text-base font-semibold text-white">Funil de Leads</h3>
          <p className="mb-4 text-xs text-gray-500">
            {formatMonth(now)} — {totalLeads} lead{totalLeads !== 1 ? "s" : ""} no total
          </p>

          <div className="space-y-3">
            {FUNNEL_STAGES.map((stage) => {
              const count = funnelMap[stage] ?? 0
              const pct = totalLeads > 0 ? (count / totalLeads) * 100 : 0
              const barColor =
                stage === "CLOSED"
                  ? "bg-emerald-500"
                  : stage === "LOST"
                  ? "bg-red-500"
                  : "bg-blue-500"

              return (
                <div key={stage}>
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-xs font-medium text-gray-300">
                      {STAGE_LABELS[stage]}
                    </span>
                    <span className="text-xs text-gray-500">
                      {count} ({pct.toFixed(0)}%)
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-gray-700">
                    <div
                      className={`h-2 rounded-full transition-all ${barColor}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Taxas de conversão */}
        <div className="rounded-lg border border-gray-700/50 bg-gray-800/50 p-6">
          <h3 className="mb-1 text-base font-semibold text-white">Taxas de Conversão</h3>
          <p className="mb-4 text-xs text-gray-500">{formatMonth(now)}</p>

          <div className="space-y-4">
            {[
              {
                label: "Lead → MQL",
                rate: convLeadToMql,
                from: leadCount,
                to: mqlCount,
              },
              {
                label: "MQL → Reunião",
                rate: convMqlToMeeting,
                from: mqlCount,
                to: meetingCount,
              },
              {
                label: "Reunião → Fechado",
                rate: convMeetingToClosed,
                from: meetingCount,
                to: closedCount,
              },
            ].map((item) => {
              const rate = parseInt(item.rate)
              const rateColor =
                rate >= 50
                  ? "text-emerald-400"
                  : rate >= 25
                  ? "text-yellow-400"
                  : "text-red-400"
              const barColor =
                rate >= 50 ? "bg-emerald-500" : rate >= 25 ? "bg-yellow-500" : "bg-red-500"

              return (
                <div
                  key={item.label}
                  className="rounded-lg border border-gray-700/30 bg-gray-900/50 p-4"
                >
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-300">{item.label}</span>
                    <span className={`text-lg font-bold ${rateColor}`}>{item.rate}%</span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-700">
                    <div
                      className={`h-1.5 rounded-full ${barColor}`}
                      style={{ width: `${Math.min(rate, 100)}%` }}
                    />
                  </div>
                  <p className="mt-1.5 text-xs text-gray-500">
                    {item.from} → {item.to}
                  </p>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
