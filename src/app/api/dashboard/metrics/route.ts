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
    if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const dateFrom = searchParams.get("dateFrom") ?? defaultDateFrom()
    const dateTo = searchParams.get("dateTo") ?? defaultDateTo()
    const periodKey = `${dateFrom}_${dateTo}`

    const start = startOfDay(dateFrom)
    const end = endOfDay(dateTo)

    const [funnelCurrent, closedInPeriod, trafficIntegration] = await Promise.all([
      // Leads criados no período, agrupados pelo estágio atual
      prisma.lead.groupBy({
        by: ["stage"],
        where: { createdAt: { gte: start, lte: end } },
        _count: { stage: true },
      }),

      // Leads que entraram em CLOSED no período via LeadHistory
      prisma.leadHistory.findMany({
        where: { toStage: "CLOSED", createdAt: { gte: start, lte: end } },
        select: { leadId: true, lead: { select: { estimatedValue: true } } },
        distinct: ["leadId"],
      }),

      // Investimento em tráfego do período
      prisma.integration.findUnique({
        where: { name: "traffic_investment" },
        select: { config: true },
      }),
    ])

    const funnel: Record<string, number> = {}
    for (const row of funnelCurrent) {
      funnel[row.stage] = row._count.stage
    }

    const newClients = closedInPeriod.length
    const newMrr = closedInPeriod.reduce(
      (sum, h) => sum + Number(h.lead?.estimatedValue ?? 0),
      0
    )

    const trafficConfig = ((trafficIntegration?.config ?? {}) as Record<string, number>)
    const trafficInvestment = trafficConfig[periodKey] ?? 0
    const cac = newClients > 0 ? trafficInvestment / newClients : null

    // Conversion rates for the new 4-stage sequence
    const leadCount = funnel["LEAD"] ?? 0
    const mqlCount = funnel["MQL"] ?? 0
    const screeningScheduled = funnel["SCREENING_SCHEDULED"] ?? 0
    const screeningDone = funnel["SCREENING_DONE"] ?? 0
    const closingMeeting = funnel["CLOSING_MEETING"] ?? 0
    const closedCount = funnel["CLOSED"] ?? 0

    function rate(a: number, b: number) {
      return b > 0 ? Math.round((a / b) * 1000) / 10 : 0
    }

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
        leadToMql: rate(mqlCount, leadCount),
        mqlToScreening: rate(screeningScheduled, mqlCount),
        screeningToClosingMeeting: rate(closingMeeting, screeningDone),
        closingMeetingToClose: rate(closedCount, closingMeeting),
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
    if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 })

    const body = await request.json()
    const parsed = z.object({
      periodKey: z.string().min(1),
      value: z.number().min(0),
    }).safeParse(body)

    if (!parsed.success) return Response.json({ error: "Invalid input" }, { status: 400 })

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
