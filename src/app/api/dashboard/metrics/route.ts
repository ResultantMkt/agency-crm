import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { z } from "zod"

function startOfDay(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number)
  return new Date(y, m - 1, d, 0, 0, 0, 0)
}

function endOfDay(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number)
  return new Date(y, m - 1, d, 23, 59, 59, 999)
}

function defaultDateFrom(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`
}

function defaultDateTo(): string {
  const now = new Date()
  const last = new Date(now.getFullYear(), now.getMonth() + 1, 0)
  return `${last.getFullYear()}-${String(last.getMonth() + 1).padStart(2, "0")}-${String(last.getDate()).padStart(2, "0")}`
}

export async function GET(request: Request) {
  try {
    const session = await auth()
    if (!session) {
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const dateFrom = searchParams.get("dateFrom") ?? defaultDateFrom()
    const dateTo = searchParams.get("dateTo") ?? defaultDateTo()
    const periodKey = `${dateFrom}_${dateTo}`

    const start = startOfDay(dateFrom)
    const end = endOfDay(dateTo)

    const [
      funnelCurrent,
      closedInPeriod,
      trafficIntegration,
    ] = await Promise.all([
      // Pipeline: leads criados no período, agrupados pelo estágio atual
      prisma.lead.groupBy({
        by: ["stage"],
        where: { createdAt: { gte: start, lte: end } },
        _count: { stage: true },
      }),

      // Aquisição: leads que entraram em CLOSED no período via LeadHistory
      prisma.leadHistory.findMany({
        where: {
          toStage: "CLOSED",
          createdAt: { gte: start, lte: end },
        },
        select: {
          leadId: true,
          lead: { select: { estimatedValue: true } },
        },
        distinct: ["leadId"],
      }),

      // Investimento em tráfego do período
      prisma.integration.findUnique({
        where: { name: "traffic_investment" },
        select: { config: true },
      }),
    ])

    // Pipeline por stage
    const funnel: Record<string, number> = {}
    for (const row of funnelCurrent) {
      funnel[row.stage] = row._count.stage
    }

    // Aquisição
    const newClients = closedInPeriod.length
    const newMrr = closedInPeriod.reduce(
      (sum, h) => sum + Number(h.lead?.estimatedValue ?? 0),
      0
    )

    // Investimento em tráfego
    const trafficConfig = (trafficIntegration?.config ?? {}) as Record<string, number>
    const trafficInvestment = trafficConfig[periodKey] ?? 0
    const cac = newClients > 0 ? trafficInvestment / newClients : null

    // Taxas de conversão (baseadas no pipeline do período)
    const leadCount = funnel["LEAD"] ?? 0
    const mqlCount = funnel["MQL"] ?? 0
    const meetings = (funnel["MEETING_SCHEDULED"] ?? 0) + (funnel["MEETING_DONE"] ?? 0)
    const closedCount = funnel["CLOSED"] ?? 0

    const leadToMql = leadCount > 0 ? (mqlCount / leadCount) * 100 : 0
    const mqlToMeeting = mqlCount > 0 ? (meetings / mqlCount) * 100 : 0
    const meetingToClose = meetings > 0 ? (closedCount / meetings) * 100 : 0

    return Response.json({
      period: { dateFrom, dateTo, key: periodKey },
      funnel,
      acquisition: {
        newClients,
        newMrr: Math.round(newMrr * 100) / 100,
        trafficInvestment,
        cac: cac !== null ? Math.round(cac * 100) / 100 : null,
      },
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

export async function PATCH(request: Request) {
  try {
    const session = await auth()
    if (!session) {
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const parsed = z.object({
      periodKey: z.string().min(1),
      value: z.number().min(0),
    }).safeParse(body)

    if (!parsed.success) {
      return Response.json({ error: "Invalid input" }, { status: 400 })
    }

    const { periodKey, value } = parsed.data

    const existing = await prisma.integration.findUnique({
      where: { name: "traffic_investment" },
      select: { config: true },
    })

    const config = ((existing?.config ?? {}) as Record<string, number>)
    config[periodKey] = value

    await prisma.integration.upsert({
      where: { name: "traffic_investment" },
      create: { name: "traffic_investment", config },
      update: { config },
    })

    return Response.json({ ok: true })
  } catch (error) {
    console.error("[PATCH /api/dashboard/metrics]", error)
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}
