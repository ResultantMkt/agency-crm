import type { Metadata } from "next"
import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Calendar, User, Phone, DollarSign, Clock, CheckCircle2, Circle } from "lucide-react"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { Badge } from "@/components/ui/badge"
import { formatCurrency, formatDate, cn } from "@/lib/utils"
import type { Lead, LeadHistory, Task, LeadStage, LeadSource } from "@/types/models"
import { LeadDetailClient } from "./lead-detail-client"

export const metadata: Metadata = {
  title: "Detalhe do Lead — Agency CRM",
}

const STAGE_LABELS: Record<LeadStage, string> = {
  LEAD: "Lead",
  MQL: "MQL",
  MEETING_SCHEDULED: "Reunião Agendada",
  MEETING_DONE: "Reunião Realizada",
  PROPOSAL: "Proposta",
  CLOSED: "Fechado",
  LOST: "Perdido",
}

const SOURCE_LABELS: Record<LeadSource, string> = {
  TRAFFIC: "Tráfego pago",
  PROSPECTING: "Prospecção ativa",
  REFERRAL: "Indicação",
  OTHER: "Outro",
}

const STAGE_COLORS: Record<LeadStage, string> = {
  LEAD: "bg-gray-500/20 text-gray-400",
  MQL: "bg-blue-500/20 text-blue-400",
  MEETING_SCHEDULED: "bg-yellow-500/20 text-yellow-400",
  MEETING_DONE: "bg-orange-500/20 text-orange-400",
  PROPOSAL: "bg-purple-500/20 text-purple-400",
  CLOSED: "bg-emerald-500/20 text-emerald-400",
  LOST: "bg-red-500/20 text-red-400",
}

export default async function LeadDetailPage({
  params,
}: {
  params: Promise<{ leadId: string }>
}) {
  const session = await auth()
  if (!session) redirect("/login")

  const { leadId } = await params

  const rawLead = await prisma.lead.findUnique({
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
  })

  if (!rawLead) notFound()

  const lead: Lead & { history: LeadHistory[]; tasks: Task[] } = JSON.parse(
    JSON.stringify(rawLead)
  )

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Back */}
      <Link
        href="/crm"
        className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Voltar ao Kanban
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">{lead.name}</h2>
          <div className="flex items-center gap-3 mt-1">
            <p className="text-sm text-gray-400">{lead.phone}</p>
            {lead.email && (
              <p className="text-sm text-gray-500">{lead.email}</p>
            )}
          </div>
        </div>
        <span
          className={cn(
            "inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold",
            STAGE_COLORS[lead.stage]
          )}
        >
          {STAGE_LABELS[lead.stage]}
        </span>
      </div>

      {/* Info cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <InfoCard
          icon={<Phone className="h-4 w-4" />}
          label="Origem"
          value={SOURCE_LABELS[lead.source]}
        />
        {lead.estimatedValue && (
          <InfoCard
            icon={<DollarSign className="h-4 w-4" />}
            label="Valor estimado"
            value={formatCurrency(parseFloat(lead.estimatedValue))}
          />
        )}
        <InfoCard
          icon={<User className="h-4 w-4" />}
          label="Responsável"
          value={lead.assignedTo?.name ?? "Não atribuído"}
        />
        <InfoCard
          icon={<Calendar className="h-4 w-4" />}
          label="Criado em"
          value={formatDate(lead.createdAt)}
        />
      </div>

      {/* Notas (edição inline — client component) */}
      <LeadDetailClient lead={lead} />

      {/* Timeline de histórico */}
      <section>
        <h3 className="text-base font-semibold text-white mb-3">Histórico de estágios</h3>
        {lead.history.length === 0 ? (
          <p className="text-sm text-gray-500">Nenhum histórico de mudança de estágio.</p>
        ) : (
          <ol className="relative border-l border-gray-700 ml-3 space-y-4">
            {lead.history.map((h) => (
              <li key={h.id} className="ml-4">
                <div className="absolute -left-1.5 mt-1.5 h-3 w-3 rounded-full bg-blue-500 border-2 border-gray-900" />
                <div className="bg-gray-800/60 border border-gray-700/50 rounded-lg px-4 py-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    {h.fromStage && (
                      <>
                        <span
                          className={cn(
                            "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                            STAGE_COLORS[h.fromStage]
                          )}
                        >
                          {STAGE_LABELS[h.fromStage]}
                        </span>
                        <span className="text-gray-500 text-xs">→</span>
                      </>
                    )}
                    <span
                      className={cn(
                        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                        STAGE_COLORS[h.toStage]
                      )}
                    >
                      {STAGE_LABELS[h.toStage]}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-1.5 text-xs text-gray-500">
                    <span>{h.changedBy?.name ?? "Sistema"}</span>
                    <span>·</span>
                    <span>{formatDate(h.createdAt)}</span>
                  </div>
                  {h.note && (
                    <p className="text-xs text-gray-400 mt-1.5">{h.note}</p>
                  )}
                </div>
              </li>
            ))}
          </ol>
        )}
      </section>

      {/* Tarefas */}
      <section>
        <h3 className="text-base font-semibold text-white mb-3">
          Tarefas ({lead.tasks.length})
        </h3>
        {lead.tasks.length === 0 ? (
          <p className="text-sm text-gray-500">Nenhuma tarefa vinculada a este lead.</p>
        ) : (
          <ul className="space-y-2">
            {lead.tasks.map((task) => (
              <li
                key={task.id}
                className="flex items-start gap-3 bg-gray-800/60 border border-gray-700/50 rounded-lg px-4 py-3"
              >
                {task.status === "DONE" ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 mt-0.5 shrink-0" />
                ) : (
                  <Circle className="h-4 w-4 text-gray-500 mt-0.5 shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p
                    className={cn(
                      "text-sm font-medium",
                      task.status === "DONE" ? "text-gray-500 line-through" : "text-white"
                    )}
                  >
                    {task.title}
                  </p>
                  {task.description && (
                    <p className="text-xs text-gray-500 mt-0.5 truncate">{task.description}</p>
                  )}
                  <div className="flex items-center gap-3 mt-1">
                    {task.assignedTo && (
                      <span className="text-xs text-gray-500">{task.assignedTo.name}</span>
                    )}
                    {task.dueDate && (
                      <span className="text-xs text-gray-500 flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatDate(task.dueDate)}
                      </span>
                    )}
                  </div>
                </div>
                <Badge
                  variant={task.status === "DONE" ? "success" : "warning"}
                  className="shrink-0 text-xs"
                >
                  {task.status === "DONE" ? "Concluída" : "Pendente"}
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

function InfoCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: string
}) {
  return (
    <div className="bg-gray-800/60 border border-gray-700/50 rounded-lg px-4 py-3">
      <div className="flex items-center gap-2 text-gray-400 mb-1">
        {icon}
        <span className="text-xs">{label}</span>
      </div>
      <p className="text-sm font-medium text-white truncate">{value}</p>
    </div>
  )
}
