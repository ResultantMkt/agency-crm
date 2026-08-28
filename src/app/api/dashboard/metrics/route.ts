import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { getStartOfMonth, getEndOfMonth } from "@/lib/utils"
import { z } from "zod"

export async function GET(request: Request) {
  try {
    const session = await auth()
    if (!session) {
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const now = new Date()
    const year = parseInt(searchParams.get("year") ?? String(now.getFullYear()), 10)
    const month = parseInt(searchParams.get("month") ?? String(now.getMonth() + 1), 10)

    const periodDate = new Date(year, month - 1, 1)
    const startOfPeriod = getStartOfMonth(periodDate)
    const endOfPeriod = getEndOfMonth(periodDate)

    const periodKey = `${year}-${String(month).padStart(2, "0")}`

    const [
      funnelCurrent,
      closedThisPeriod,
      trafficIntegration,
    ] = await Promise.all([
      // Pipeline atual — todos os leads pelo estágio atual (sem filtro de data)
      prisma.lead.groupBy({
        by: ["stage"],
        _count: { stage: true },
      }),

      // Aquisição: leads que entraram em CLOSED no período via LeadHistory
      prisma.leadHistory.findMany({
        where: {
          toStage: "CLOSED",
          createdAt: { gte: startOfPeriod, lte: endOfPeriod },
        },
        select: {
          leadId: true,
          lead: { select: { estimatedValue: true } },
        },
        distinct: ["leadId"],
      }),

      // Investimento em tráfego do mês
      prisma.integration.findUnique({
        where: { name: "traffic_investment" },
        select: { config: true },
      }),
    ])

    // Pipeline atual
    const currentMap: Record<string, number> = {}
    for (const row of funnelCurrent) {
      currentMap[row.stage] = row._count.stage
    }

    // Aquisição
    const newClients = closedThisPeriod.length
    const newMrr = closedThisPeriod.reduce(
      (sum, h) => sum + Number(h.lead?.estimatedValue ?? 0),
      0
    )

    // Investimento em tráfego
    const trafficConfig = (trafficIntegration?.config ?? {}) as Record<string, number>
    const trafficInvestment = trafficConfig[periodKey] ?? 0

    const cac = newClients > 0 ? trafficInvestment / newClients : null

    // Taxas de conversão (baseadas no pipeline atual)
    const leadCount = currentMap["LEAD"] ?? 0
    const mqlCount = currentMap["MQL"] ?? 0
    const meetings = (currentMap["MEETING_SCHEDULED"] ?? 0) + (currentMap["MEETING_DONE"] ?? 0)
    const closedCount = currentMap["CLOSED"] ?? 0

    const leadToMql = leadCount > 0 ? (mqlCount / leadCount) * 100 : 0
    const mqlToMeeting = mqlCount > 0 ? (meetings / mqlCount) * 100 : 0
    const meetingToClose = meetings > 0 ? (closedCount / meetings) * 100 : 0

    return Response.json({
      period: { year, month, key: periodKey },
      funnel: currentMap,
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
      periodKey: z.string().regex(/^\d{4}-\d{2}$/),
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
