import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { getEffectiveLimit } from "@/lib/queue"
import { NextRequest } from "next/server"

export async function GET() {
  try {
    const session = await auth()
    if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 })

    const state = await prisma.zapiQueueState.upsert({
      where: { id: "singleton" },
      update: {},
      create: { id: "singleton" },
    })

    const pendingCount = await prisma.messageQueue.count({
      where: { status: { in: ["PENDING", "SENDING"] } },
    })

    return Response.json({
      sentToday: state.sentToday,
      maxPerDay: state.maxPerDay,
      effectiveLimit: getEffectiveLimit(state),
      isPaused: state.isPaused,
      pauseReason: state.pauseReason,
      consecutiveErrors: state.consecutiveErrors,
      pendingCount,
      lastSentAt: state.lastSentAt,
      nextAllowedAt: state.nextAllowedAt,
      settings: {
        maxPerDay: state.maxPerDay,
        minDelaySeconds: state.minDelaySeconds,
        maxDelaySeconds: state.maxDelaySeconds,
        warmupEnabled: state.warmupEnabled,
        warmupStartDate: state.warmupStartDate,
        warmupMultiplier: state.warmupMultiplier,
      },
    })
  } catch (error) {
    console.error("[GET /api/queue]", error)
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await auth()
    if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 })

    const body = await request.json()

    const updateData: Record<string, unknown> = {}
    const allowed = ["maxPerDay", "minDelaySeconds", "maxDelaySeconds", "warmupEnabled", "warmupStartDate", "warmupMultiplier", "isPaused"]
    for (const field of allowed) {
      if (field in body) updateData[field] = body[field]
    }

    if ("isPaused" in body && !body.isPaused) {
      updateData.consecutiveErrors = 0
      updateData.pauseReason = null
    }

    const state = await prisma.zapiQueueState.upsert({
      where: { id: "singleton" },
      update: updateData,
      create: { id: "singleton", ...updateData },
    })

    return Response.json(state)
  } catch (error) {
    console.error("[PATCH /api/queue]", error)
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}
