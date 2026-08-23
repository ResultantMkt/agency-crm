import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { getStartOfMonth, getEndOfMonth } from "@/lib/utils"

export async function GET() {
  try {
    const session = await auth()
    if (!session) {
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }

    const now = new Date()
    const startOfMonth = getStartOfMonth(now)
    const endOfMonth = getEndOfMonth(now)

    const [
      activeClients,
      churnsThisMonth,
      receivablesThisMonth,
      expensesThisMonth,
      recurringExpenses,
      funnelGroups,
    ] = await Promise.all([
      // Clientes ativos
      prisma.client.count({ where: { status: "ACTIVE" } }),

      // Churns no mês atual
      prisma.client.findMany({
        where: {
          status: "CHURN",
          updatedAt: { gte: startOfMonth, lte: endOfMonth },
        },
        select: { contractValue: true },
      }),

      // Recebíveis do mês (PAID)
      prisma.receivable.findMany({
        where: {
          referenceMonth: { gte: startOfMonth, lte: endOfMonth },
          status: "PAID",
        },
        select: { value: true },
      }),

      // Despesas do mês (não recorrentes)
      prisma.expense.findMany({
        where: {
          isRecurring: false,
          month: { gte: startOfMonth, lte: endOfMonth },
        },
        select: { value: true },
      }),

      // Despesas recorrentes
      prisma.expense.findMany({
        where: { isRecurring: true },
        select: { value: true },
      }),

      // Funil: leads criados no mês agrupados por stage
      prisma.lead.groupBy({
        by: ["stage"],
        where: { createdAt: { gte: startOfMonth, lte: endOfMonth } },
        _count: { stage: true },
      }),
    ])

    // MRR = soma de recebíveis PAID do mês
    const mrr = receivablesThisMonth.reduce(
      (sum: number, r: { value: unknown }) => sum + Number(r.value),
      0
    )

    // Despesas totais = recorrentes + do mês
    const totalExpenses =
      expensesThisMonth.reduce((sum: number, e: { value: unknown }) => sum + Number(e.value), 0) +
      recurringExpenses.reduce((sum: number, e: { value: unknown }) => sum + Number(e.value), 0)

    // Billing = MRR (recebíveis pagos no mês)
    const billing = mrr

    // Cashflow e margem
    const cashflow = billing - totalExpenses
    const margin = billing > 0 ? (cashflow / billing) * 100 : 0

    // Churns
    const churnsCount = churnsThisMonth.length
    const churnValue = churnsThisMonth.reduce(
      (sum: number, c: { contractValue: unknown }) => sum + Number(c.contractValue),
      0
    )

    // Montar funil
    const stageOrder = [
      "LEAD",
      "MQL",
      "MEETING_SCHEDULED",
      "MEETING_DONE",
      "PROPOSAL",
      "CLOSED",
      "LOST",
    ] as const

    type LeadStage = typeof stageOrder[number]

    const funnel = stageOrder.reduce<Record<LeadStage, number>>((acc, stage) => {
      acc[stage] = 0
      return acc
    }, {} as Record<LeadStage, number>)

    for (const group of funnelGroups) {
      funnel[group.stage as LeadStage] = group._count.stage
    }

    // Taxas de conversão
    const leadCount = funnel["LEAD"]
    const mqlCount = funnel["MQL"]
    const meetingCount = funnel["MEETING_SCHEDULED"] + funnel["MEETING_DONE"]
    const closedCount = funnel["CLOSED"]

    const leadToMql = leadCount > 0 ? (mqlCount / leadCount) * 100 : 0
    const mqlToMeeting = mqlCount > 0 ? (meetingCount / mqlCount) * 100 : 0
    const meetingToClose = meetingCount > 0 ? (closedCount / meetingCount) * 100 : 0

    return Response.json({
      activeClients,
      mrr: Math.round(mrr * 100) / 100,
      churnsThisMonth: churnsCount,
      churnValue: Math.round(churnValue * 100) / 100,
      billing: Math.round(billing * 100) / 100,
      expenses: Math.round(totalExpenses * 100) / 100,
      cashflow: Math.round(cashflow * 100) / 100,
      margin: Math.round(margin * 10) / 10,
      funnel,
      conversionRates: {
        leadToMql: Math.round(leadToMql * 10) / 10,
        mqlToMeeting: Math.round(mqlToMeeting * 10) / 10,
        meetingToClose: Math.round(meetingToClose * 10) / 10,
      },
    })
  } catch (error) {
    console.error("[GET /api/dashboard/metrics]", error)
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}
