import { prisma } from "@/lib/prisma"
import type { TriggerType, AutomationStep, ConditionStep, ActionStep } from "@/types/automation"

const MAX_DEPTH = 5
const IDEMPOTENCY_WINDOW_MS = 60_000

export async function emitLeadEvent(
  type: TriggerType,
  leadId: string | null,
  data: Record<string, unknown>,
  depth = 0
): Promise<void> {
  if (depth >= MAX_DEPTH) return

  try {
    // Find all active automations matching this trigger type
    const automations = await prisma.automation.findMany({
      where: { active: true, trigger: { path: ["type"], equals: type } },
      select: { id: true, trigger: true },
    })

    const nowBucket = Math.floor(Date.now() / IDEMPOTENCY_WINDOW_MS)

    for (const automation of automations) {
      const trigger = automation.trigger as { type: string; config: Record<string, unknown> }

      // For stage_changed: check fromStage/toStage filters
      if (type === "lead.stage_changed") {
        const { fromStage, toStage } = trigger.config as { fromStage?: string; toStage?: string }
        if (fromStage && fromStage !== data.fromStage) continue
        if (toStage && toStage !== data.toStage) continue
      }

      const idempotencyKey = `${automation.id}:${leadId ?? "null"}:${type}:${nowBucket}`

      await prisma.automationJob.upsert({
        where: { idempotencyKey },
        create: {
          automationId: automation.id,
          leadId,
          triggerType: type,
          triggerData: data as object,
          status: "PENDING",
          depth,
          idempotencyKey,
        },
        update: {}, // already queued in this window, skip
      })
    }
  } catch (err) {
    console.error("[automation-engine] emitLeadEvent error:", err)
  }
}

// Called by the cron endpoint
export async function processAutomationJobs(): Promise<{ processed: number; errors: number }> {
  const jobs = await prisma.automationJob.findMany({
    where: { status: "PENDING" },
    orderBy: { createdAt: "asc" },
    take: 50,
    include: { automation: true },
  })

  let processed = 0
  let errors = 0

  for (const job of jobs) {
    // Mark as processing
    await prisma.automationJob.update({
      where: { id: job.id },
      data: { status: "PROCESSING", attempts: { increment: 1 } },
    })

    try {
      const result = await runAutomation(job)
      await prisma.automationJob.update({
        where: { id: job.id },
        data: { status: "DONE", processedAt: new Date() },
      })
      await prisma.automation.update({
        where: { id: job.automationId },
        data: { runCount: { increment: 1 }, lastRunAt: new Date() },
      })
      await prisma.automationRun.create({ data: result })
      processed++
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      await prisma.automationJob.update({
        where: { id: job.id },
        data: { status: "FAILED", error: msg, processedAt: new Date() },
      })
      errors++
      console.error(`[automation-engine] Job ${job.id} failed:`, err)
    }
  }

  return { processed, errors }
}

async function runAutomation(job: {
  id: string
  automationId: string
  leadId: string | null
  triggerType: string
  triggerData: unknown
  depth: number
  automation: { id: string; name: string; active: boolean; steps: unknown }
}) {
  const { automation } = job

  if (!automation.active) {
    return makeRun(job, "SKIPPED", [{ status: "skipped", message: "Automação inativa" }])
  }

  // Load lead with full data
  const lead = job.leadId
    ? await prisma.lead.findUnique({
        where: { id: job.leadId },
        include: { assignedTo: { select: { name: true } } },
      })
    : null

  const steps = (automation.steps as AutomationStep[]) ?? []
  const stepResults: object[] = []

  // Evaluate conditions first (all must pass)
  const conditions = steps.filter((s): s is ConditionStep => s.type === "condition")
  for (const cond of conditions) {
    const pass = evaluateCondition(cond, lead as Record<string, unknown> | null)
    stepResults.push({ stepId: cond.id, type: "condition", status: pass ? "ok" : "failed", field: cond.field })
    if (!pass) {
      return makeRun(job, "SKIPPED", stepResults, "Condição não satisfeita")
    }
  }

  // Execute actions
  const actions = steps.filter((s): s is ActionStep => s.type === "action")
  let hasError = false

  for (const action of actions) {
    try {
      await executeAction(action, lead as Record<string, unknown> | null, job.triggerData as Record<string, unknown>, job.depth)
      stepResults.push({ stepId: action.id, type: "action", actionType: action.actionType, status: "ok" })
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      stepResults.push({ stepId: action.id, type: "action", actionType: action.actionType, status: "error", error: msg })
      hasError = true
      console.error(`[automation-engine] Action ${action.actionType} failed:`, err)
    }
  }

  return makeRun(job, hasError ? "PARTIAL_ERROR" : "SUCCESS", stepResults)
}

function makeRun(
  job: { automationId: string; leadId: string | null; triggerType: string; triggerData: unknown },
  status: string,
  stepResults: object[],
  note?: string
) {
  return {
    automationId: job.automationId,
    leadId: job.leadId,
    triggerType: job.triggerType,
    triggerData: job.triggerData as object,
    status,
    stepResults: note ? [...stepResults, { note }] : stepResults,
  }
}

function evaluateCondition(cond: ConditionStep, lead: Record<string, unknown> | null): boolean {
  if (!lead) return false
  const raw = lead[cond.field]
  const val = raw != null ? String(raw) : ""
  const expected = (cond.value ?? "").toLowerCase()

  switch (cond.operator) {
    case "equals": return val.toLowerCase() === expected
    case "not_equals": return val.toLowerCase() !== expected
    case "contains": return val.toLowerCase().includes(expected)
    case "is_empty": return val === "" || raw == null
    case "is_not_empty": return val !== "" && raw != null
    default: return false
  }
}

async function executeAction(
  action: ActionStep,
  lead: Record<string, unknown> | null,
  triggerData: Record<string, unknown>,
  depth: number
) {
  const cfg = action.config as Record<string, unknown>

  switch (action.actionType) {
    case "notify_whatsapp_group": {
      const { sendWhatsAppMessage } = await import("@/lib/zapi")
      const groupPhone = cfg.groupPhone as string
      const rawMessage = (cfg.message as string) ?? ""
      const message = substituteVars(rawMessage, lead)
      await sendWhatsAppMessage(groupPhone, message)
      break
    }

    case "start_sequence": {
      if (!lead?.id) throw new Error("Lead não encontrado")
      const sequenceId = cfg.sequenceId as string
      await startSequenceForLead(lead.id as string, sequenceId)
      break
    }

    case "create_task": {
      if (!lead?.id) throw new Error("Lead não encontrado")
      const delayDays = (cfg.delayDays as number) ?? 0
      const delayHours = (cfg.delayHours as number) ?? 0
      const dueDate = new Date(Date.now() + delayDays * 86400_000 + delayHours * 3600_000)
      await prisma.task.create({
        data: {
          title: substituteVars((cfg.title as string) ?? "Tarefa automática", lead),
          assignedToId: (cfg.assignedToId as string) ?? null,
          dueDate,
          leadId: lead.id as string,
        },
      })
      break
    }

    case "change_stage": {
      if (!lead?.id) throw new Error("Lead não encontrado")
      const newStage = cfg.stage as string
      if (!newStage || newStage === lead.stage) break
      await prisma.lead.update({ where: { id: lead.id as string }, data: { stage: newStage } })
      // Emit with depth+1 to prevent loops
      const type: TriggerType = newStage === "CLOSED" ? "lead.won" : newStage === "LOST" ? "lead.lost" : "lead.stage_changed"
      await emitLeadEvent(type, lead.id as string, { fromStage: lead.stage, toStage: newStage }, depth + 1)
      break
    }

    case "assign_user": {
      if (!lead?.id) throw new Error("Lead não encontrado")
      await prisma.lead.update({ where: { id: lead.id as string }, data: { assignedToId: (cfg.userId as string) ?? null } })
      break
    }

    case "call_webhook": {
      const url = cfg.url as string
      if (!url) throw new Error("URL do webhook não configurada")
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lead, triggerData }),
      })
      if (!res.ok) throw new Error(`Webhook retornou ${res.status}`)
      break
    }
  }
}

function substituteVars(template: string, lead: Record<string, unknown> | null): string {
  if (!lead) return template
  return template
    .replace(/\{\{nome_contato\}\}/g, String(lead.name ?? ""))
    .replace(/\{\{nome_negocio\}\}/g, String(lead.name ?? ""))
    .replace(/\{\{valor_negocio\}\}/g, lead.estimatedValue != null ? String(lead.estimatedValue) : "")
    .replace(/\{\{nome_vendedor\}\}/g, (lead.assignedTo as { name?: string } | null)?.name ?? "")
    .replace(/\{\{nome_etapa\}\}/g, String(lead.stage ?? ""))
    .replace(/\{\{nome_funil\}\}/g, "CRM")
    .replace(/\{\{telefone_contato\}\}/g, String(lead.phone ?? ""))
    .replace(/\{\{nome_empresa\}\}/g, String(lead.name ?? ""))
}

async function startSequenceForLead(leadId: string, sequenceId: string) {
  const sequence = await prisma.sequence.findUnique({
    where: { id: sequenceId },
    include: { steps: { orderBy: { position: "asc" } } },
  })
  if (!sequence) throw new Error(`Sequência ${sequenceId} não encontrada`)

  const leadSeq = await prisma.leadSequence.create({
    data: { leadId, sequenceId, status: "ACTIVE" },
  })

  const now = new Date()
  for (const step of sequence.steps) {
    const scheduledAt = new Date(now.getTime() + step.delayDays * 86400_000 + step.delayHours * 3600_000)
    const task = await prisma.task.create({
      data: {
        title: step.title,
        description: step.script,
        leadId,
        dueDate: scheduledAt,
      },
    })
    await prisma.leadSequenceStep.create({
      data: {
        leadSequenceId: leadSeq.id,
        sequenceStepId: step.id,
        taskId: task.id,
        scheduledAt,
        status: "PENDING",
      },
    })
  }
}
