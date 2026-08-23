"use client"

import { useDraggable } from "@dnd-kit/core"
import { CSS } from "@dnd-kit/utilities"
import { useRouter } from "next/navigation"
import { Calendar, User } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { formatCurrency } from "@/lib/utils"
import type { Lead, LeadSource } from "@/types/models"

const SOURCE_LABELS: Record<LeadSource, string> = {
  TRAFFIC: "Tráfego",
  PROSPECTING: "Prospecção",
  REFERRAL: "Indicação",
  OTHER: "Outro",
}

function getDaysSince(dateStr: string): number {
  const date = new Date(dateStr)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  return Math.floor(diff / (1000 * 60 * 60 * 24))
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase()
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

  const daysSince = getDaysSince(lead.createdAt)

  function handleClick(e: React.MouseEvent) {
    // Não navega se estiver arrastando
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

        {/* Dias */}
        <div className="flex items-center gap-1 text-gray-500">
          <Calendar className="h-3 w-3" />
          <span className="text-xs">
            {daysSince === 0 ? "Hoje" : `${daysSince}d`}
          </span>
        </div>
      </div>
    </div>
  )
}
