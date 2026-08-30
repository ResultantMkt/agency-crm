import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { z } from "zod"

type LeadSource = "TRAFFIC" | "PROSPECTING" | "REFERRAL" | "OTHER"

const SOURCES: LeadSource[] = ["TRAFFIC", "PROSPECTING", "REFERRAL", "OTHER"]

const SOURCE_LABELS: Record<LeadSource, string> = {
  TRAFFIC: "Tráfego Pago",
  PROSPECTING: "Prospecção",
  REFERRAL: "Indicação",
  OTHER: "Outro",
}

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

function div(a: number, b: number): number | null {
  return b > 0 ? Math.round((a / b) * 100) / 100 : null
}

function rate(a: number, b: number): number {
  return b > 0 ? Math.round((a / b) * 1000) / 10 : 0
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

    const [leadsInPeriod, historyInPeriod, investmentRecord] = await Promise.all([
      prisma.lead.findMany({
        where: { createdAt: { gte: start, lte: end } },
        select: { id: true, source: true },
      }),

      prisma.leadHistory.findMany({
        where: {
          toStage: { in: ["MQL", "SCREENING_SCHEDULED", "SCREENING_DONE", "CLOSING_MEETING", "CLOSED"] },
          createdAt: { gte: start, lte: end },
        },
        select: {
          leadId: true,
          toStage: true,
          lead: { select: { source: true, estimatedValue: true } },
        },
        orderBy: { createdAt: "asc" },
      }),

      prisma.integration.findUnique({
        where: { name: "channel_investment" },
        select: { config: true },
      }),
    ])

    const investmentConfig = ((investmentRecord?.config ?? {}) as Record<string, number>)

    // Accumulate per-source buckets
    type Bucket = {
      leadIds: Set<string>
      mqlIds: Set<string>
      screeningScheduledIds: Set<string>
      screeningDoneIds: Set<string>
      closingMeetingIds: Set<string>
      closedIds: Set<string>
      closingValue: number
    }

    const bySource: Record<string, Bucket> = {}
    for (const src of SOURCES) {
      bySource[src] = {
        leadIds: new Set(),
        mqlIds: new Set(),
        screeningScheduledIds: new Set(),
        screeningDoneIds: new Set(),
        closingMeetingIds: new Set(),
        closedIds: new Set(),
        closingValue: 0,
      }
    }

    for (const lead of leadsInPeriod) {
      bySource[lead.source]?.leadIds.add(lead.id)
    }

    for (const h of historyInPeriod) {
      const src = h.lead?.source as LeadSource | undefined
      if (!src || !bySource[src]) continue
      const b = bySource[src]
      switch (h.toStage) {
        case "MQL": b.mqlIds.add(h.leadId); break
        case "SCREENING_SCHEDULED": b.screeningScheduledIds.add(h.leadId); break
        case "SCREENING_DONE": b.screeningDoneIds.add(h.leadId); break
        case "CLOSING_MEETING": b.closingMeetingIds.add(h.leadId); break
        case "CLOSED":
          if (!b.closedIds.has(h.leadId)) {
            b.closingValue += Number(h.lead?.estimatedValue ?? 0)
          }
          b.closedIds.add(h.leadId)
          break
      }
    }

    const channels = SOURCES.map((src) => {
      const b = bySource[src]
      const investment = investmentConfig[`${src}_${periodKey}`] ?? 0

      const leads = b.leadIds.size
      const mql = b.mqlIds.size
      const screeningScheduled = b.screeningScheduledIds.size
      const screeningDone = b.screeningDoneIds.size
      const closingMeeting = b.closingMeetingIds.size
      const closings = b.closedIds.size
      const closingValue = Math.round(b.closingValue * 100) / 100

      return {
        source: src,
        label: SOURCE_LABELS[src],
        investment,
        leads,
        mql,
        screeningScheduled,
        screeningDone,
        closingMeeting,
        closings,
        closingValue,
        costPerLead: div(investment, leads),
        costPerMql: div(investment, mql),
        costPerScreeningScheduled: div(investment, screeningScheduled),
        costPerScreeningDone: div(investment, screeningDone),
        costPerClosingMeeting: div(investment, closingMeeting),
        cac: div(investment, closings),
        ltv: closingValue,
        roas: div(closingValue, investment),
        rateLeadToMql: rate(mql, leads),
        rateMqlToScreening: rate(screeningScheduled, mql),
        rateClosingMeetingToClosing: rate(closings, closingMeeting),
        rateLeadToClosing: rate(closings, leads),
      }
    })

    return Response.json({ period: { dateFrom, dateTo, key: periodKey }, channels })
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
      source: z.enum(["TRAFFIC", "PROSPECTING", "REFERRAL", "OTHER"]),
      periodKey: z.string().min(1),
      value: z.number().min(0),
    }).safeParse(body)

    if (!parsed.success) return Response.json({ error: "Invalid input" }, { status: 400 })

    const { source, periodKey, value } = parsed.data
    const configKey = `${source}_${periodKey}`

    const existing = await prisma.integration.findUnique({
      where: { name: "channel_investment" },
      select: { config: true },
    })

    const config = ((existing?.config ?? {}) as Record<string, number>)
    config[configKey] = value

    await prisma.integration.upsert({
      where: { name: "channel_investment" },
      create: { name: "channel_investment", config },
      update: { config },
    })

    return Response.json({ ok: true })
  } catch (error) {
    console.error("[PATCH /api/dashboard/metrics]", error)
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}
