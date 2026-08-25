import { prisma } from "@/lib/prisma"
import { sendWhatsAppMessage } from "@/lib/zapi"
import type { ZapiQueueState } from "@prisma/client"

export function getEffectiveLimit(state: ZapiQueueState): number {
  if (!state.warmupEnabled) return state.maxPerDay
  return Math.max(1, Math.floor(state.maxPerDay * state.warmupMultiplier))
}

function needsDailyReset(lastResetAt: Date): boolean {
  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const resetDay = new Date(lastResetAt.getFullYear(), lastResetAt.getMonth(), lastResetAt.getDate())
  return todayStart > resetDay
}

function randomDelay(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

export type ProcessResult =
  | { status: "sent"; messageId: string; sentToday: number }
  | { status: "idle" }
  | { status: "waiting"; nextAllowedAt: Date }
  | { status: "paused"; reason: string | null }
  | { status: "daily_limit_reached"; sentToday: number; limit: number; pendingCount: number }
  | { status: "error"; error: string; paused: boolean }

export async function processNextQueueItem(): Promise<ProcessResult> {
  let state = await prisma.zapiQueueState.upsert({
    where: { id: "singleton" },
    update: {},
    create: { id: "singleton" },
  })

  if (needsDailyReset(state.lastResetAt)) {
    state = await prisma.zapiQueueState.update({
      where: { id: "singleton" },
      data: {
        sentToday: 0,
        lastResetAt: new Date(),
        consecutiveErrors: 0,
        isPaused: false,
        pauseReason: null,
        nextAllowedAt: null,
      },
    })
  }

  if (state.isPaused) {
    return { status: "paused", reason: state.pauseReason }
  }

  const effectiveLimit = getEffectiveLimit(state)
  if (state.sentToday >= effectiveLimit) {
    const pendingCount = await prisma.messageQueue.count({ where: { status: "PENDING" } })
    return { status: "daily_limit_reached", sentToday: state.sentToday, limit: effectiveLimit, pendingCount }
  }

  const now = new Date()
  if (state.nextAllowedAt && state.nextAllowedAt > now) {
    return { status: "waiting", nextAllowedAt: state.nextAllowedAt }
  }

  const item = await prisma.messageQueue.findFirst({
    where: { status: "PENDING" },
    orderBy: { createdAt: "asc" },
  })

  if (!item) {
    return { status: "idle" }
  }

  try {
    await prisma.messageQueue.update({
      where: { id: item.id, status: "PENDING" },
      data: { status: "SENDING" },
    })
  } catch {
    return { status: "idle" }
  }

  try {
    await sendWhatsAppMessage(item.phone, item.content)

    const sentAt = new Date()
    const delayMs = randomDelay(state.minDelaySeconds, state.maxDelaySeconds) * 1000
    const nextAllowedAt = new Date(sentAt.getTime() + delayMs)

    await prisma.messageQueue.update({
      where: { id: item.id },
      data: { status: "SENT", sentAt },
    })

    await prisma.zapiQueueState.update({
      where: { id: "singleton" },
      data: {
        sentToday: { increment: 1 },
        consecutiveErrors: 0,
        lastSentAt: sentAt,
        nextAllowedAt,
      },
    })

    return { status: "sent", messageId: item.messageId, sentToday: state.sentToday + 1 }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Erro desconhecido"
    const newConsecutiveErrors = state.consecutiveErrors + 1
    const shouldPause = newConsecutiveErrors >= 5

    await prisma.messageQueue.update({
      where: { id: item.id },
      data: { status: "FAILED", error: errorMsg },
    })

    await prisma.zapiQueueState.update({
      where: { id: "singleton" },
      data: {
        consecutiveErrors: newConsecutiveErrors,
        ...(shouldPause && {
          isPaused: true,
          pauseReason: `Fila pausada automaticamente após ${newConsecutiveErrors} erros consecutivos. Verifique a conexão com o WhatsApp.`,
        }),
      },
    })

    return { status: "error", error: errorMsg, paused: shouldPause }
  }
}
