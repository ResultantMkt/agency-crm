import type { Metadata } from "next"
import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, MessageSquare } from "lucide-react"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { cn } from "@/lib/utils"
import type { Lead, LeadHistory, Task, User } from "@/types/models"
import { LeadDetailClient } from "./lead-detail-client"
import { LeadInfoClient } from "./lead-info-client"
import { LeadTasksClient } from "./lead-tasks-client"
import { LeadHistoryClient } from "./lead-history-client"

export const metadata: Metadata = {
  title: "Detalhe do Lead — Agency CRM",
}

function stageLabel(stages: any[], key: string) {
  return stages.find(s => s.key === key)?.name ?? key
}

const DEFAULT_STAGE_COLOR = "bg-gray-500/20 text-gray-600"
const FIXED_COLORS: Record<string, string> = {
  LEAD: "bg-gray-500/20 text-gray-500",
  MQL: "bg-purple-500/20 text-purple-600",
  SCREENING_SCHEDULED: "bg-yellow-500/20 text-yellow-600",
  SCREENING_DONE: "bg-orange-500/20 text-orange-600",
  CLOSING_MEETING: "bg-violet-500/20 text-violet-600",
  PROPOSAL_SENT: "bg-purple-500/20 text-purple-500",
  CLOSED: "bg-emerald-500/20 text-emerald-600",
  LOST: "bg-red-500/20 text-red-600",
}
function stageColor(key: string) {
  return FIXED_COLORS[key] ?? DEFAULT_STAGE_COLOR
}

export default async function LeadDetailPage({
  params,
}: {
  params: Promise<{ leadId: string }>
}) {
  const session = await auth()
  if (!session) redirect("/login")

  const { leadId } = await params

  const [rawLead, rawUsers, rawStages] = await Promise.all([
    prisma.lead.findUnique({
      where: { id: leadId },
      include: {
        assignedTo: { select: { name: true, email: true } },
        history: {
          include: { changedBy: { select: { name: true } } },
          orderBy: { createdAt: "desc" },
        },
        tasks: {
          include: { assignedTo: { select: { name: true } } },
          orderBy: { createdAt: "desc" },
        },
      },
    }),
    prisma.user.findMany({
      where: { active: true },
      select: { id: true, name: true, email: true, role: true },
      orderBy: { name: "asc" },
    }),
    prisma.pipelineStage.findMany({ orderBy: { position: "asc" } }),
  ])

  if (!rawLead) notFound()

  const lead: Lead & { history: LeadHistory[]; tasks: Task[] } = JSON.parse(JSON.stringify(rawLead))
  const users: User[] = JSON.parse(JSON.stringify(rawUsers))
  const stages = JSON.parse(JSON.stringify(rawStages))

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Back */}
      <Link
        href="/crm"
        className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Voltar ao Kanban
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">{lead.name}</h2>
          <div className="flex items-center gap-3 mt-1">
            <p className="text-sm text-gray-500">{lead.phone}</p>
            <Link
              href={`/chat?phone=${encodeURIComponent(lead.phone)}`}
              className="inline-flex items-center gap-1 text-xs text-purple-600 hover:text-purple-500 transition-colors"
              title="Abrir conversa no WhatsApp"
            >
              <MessageSquare className="h-3.5 w-3.5" />
              Chat
            </Link>
            {lead.email && (
              <p className="text-sm text-gray-500">{lead.email}</p>
            )}
          </div>
        </div>
        <span
          className={cn(
            "inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold",
            stageColor(lead.stage)
          )}
        >
          {stageLabel(stages, lead.stage)}
        </span>
      </div>

      {/* Info cards (3 editáveis + Criado em readonly) */}
      <LeadInfoClient lead={lead} users={users} />

      {/* Notas (edição inline — client component) */}
      <LeadDetailClient lead={lead} />

      {/* Timeline de histórico */}
      <section>
        <h3 className="text-base font-semibold text-gray-900 mb-3">Histórico de estágios</h3>
        <LeadHistoryClient leadId={lead.id} initialHistory={lead.history} />
      </section>

      {/* Tarefas */}
      <LeadTasksClient leadId={lead.id} initialTasks={lead.tasks} users={users} />
    </div>
  )
}
