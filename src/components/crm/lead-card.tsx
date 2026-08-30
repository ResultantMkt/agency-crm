"use client"

import { useDraggable } from "@dnd-kit/core"
import { CSS } from "@dnd-kit/utilities"
import { useRouter } from "next/navigation"
import { Calendar, User, ClipboardList } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { formatCurrency } from "@/lib/utils"
import type { Lead, LeadSource, TaskStatus } from "@/types/models"

const SOURCE_LABELS: Record<LeadSource, string> = {
  TRAFFIC: "Tráfego",
  PROSPECTING: "Prospecção",
  REFERRAL: "Indicação",
  OTHER: "Outro",
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" })
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase()
}

type TaskUrgency = "overdue" | "pending" | null

interface UrgentTask {
  title: string
  urgency: TaskUrgency
}

function getMostUrgentTask(
  tasks: { id: string; title: string; status: TaskStatus; dueDate?: string | null }[] | undefined
): UrgentTask | null {
  if (!tasks || tasks.length === 0) return null

  const openTasks = tasks.filter((t) => t.status !== "DONE")
  if (openTasks.length === 0) return null

  const now = new Date()
  now.setHours(0, 0, 0, 0)

  // Sort: overdue first, then by earliest dueDate, then tasks with no dueDate last
  const sorted = [...openTasks].sort((a, b) => {
    const da = a.dueDate ? new Date(a.dueDate) : null
    const db = b.dueDate ? new Date(b.dueDate) : null
    if (!da && !db) return 0
    if (!da) return 1
    if (!db) return -1
    return da.getTime() - db.getTime()
  })

  const top = sorted[0]
  const dueDate = top.dueDate ? new Date(top.dueDate) : null
  if (dueDate) dueDate.setHours(0, 0, 0, 0)

  const urgency: TaskUrgency = dueDate && dueDate < now ? "overdue" : "pending"
  return { title: top.title, urgency }
}

interface LeadCardProps {
  lead: Lead
}

export function LeadCard({ lead }: LeadCardProps) {
  const router = useRouter()
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: lead.id,
    data: { lead },
  })

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 999 : undefined,
  }

  const urgentTask = getMostUrgentTask(lead.tasks)

  function handleClick(e: React.MouseEvent) {
    if (isDragging) return
    router.push(`/crm/${lead.id}`)
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      onClick={handleClick}
      className="bg-gray-800 border border-gray-700 rounded-lg p-4 cursor-grab active:cursor-grabbing shadow hover:shadow-md hover:border-gray-600 transition-all select-none"
    >
      {/* Nome */}
      <p className="text-sm font-semibold text-white truncate mb-2">{lead.name}</p>

      {/* Valor estimado */}
      {lead.estimatedValue && (
        <p className="text-sm font-medium text-emerald-400 mb-2">
          {formatCurrency(parseFloat(lead.estimatedValue))}
        </p>
      )}

      {/* Source badge */}
      <div className="mb-3">
        <Badge variant="outline" className="text-xs">
          {SOURCE_LABELS[lead.source]}
        </Badge>
      </div>

      {/* Tarefa vinculada */}
      {urgentTask && (
        <div
          className={
            urgentTask.urgency === "overdue"
              ? "flex items-center gap-1.5 mb-3 px-2 py-1 rounded bg-red-500/15 border border-red-500/30"
              : "flex items-center gap-1.5 mb-3 px-2 py-1 rounded bg-yellow-500/15 border border-yellow-500/30"
          }
        >
          <ClipboardList
            className={
              urgentTask.urgency === "overdue"
                ? "h-3 w-3 text-red-400 shrink-0"
                : "h-3 w-3 text-yellow-400 shrink-0"
            }
          />
          <span
            className={
              urgentTask.urgency === "overdue"
                ? "text-xs text-red-300 truncate"
                : "text-xs text-yellow-300 truncate"
            }
          >
            {urgentTask.title}
          </span>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between mt-2">
        {/* Responsável */}
        {lead.assignedTo ? (
          <div className="flex items-center gap-1.5">
            <div className="h-6 w-6 rounded-full bg-blue-600 flex items-center justify-center text-xs font-semibold text-white shrink-0">
              {getInitials(lead.assignedTo.name)}
            </div>
            <span className="text-xs text-gray-400 truncate max-w-[80px]">
              {lead.assignedTo.name.split(" ")[0]}
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-1 text-gray-600">
            <User className="h-3.5 w-3.5" />
            <span className="text-xs">Sem responsável</span>
          </div>
        )}

        {/* Data de criação */}
        <div className="flex items-center gap-1 text-gray-500">
          <Calendar className="h-3 w-3" />
          <span className="text-xs">{formatDate(lead.createdAt)}</span>
        </div>
      </div>
    </div>
  )
}
