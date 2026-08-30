"use client"

import { useDroppable } from "@dnd-kit/core"
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable"
import { cn } from "@/lib/utils"
import { LeadCard } from "./lead-card"
import type { Lead, LeadStage, User } from "@/types/models"

interface KanbanColumnProps {
  stage: LeadStage
  label: string
  leads: Lead[]
  users: User[]
  color?: string
  onDeleteLead?: (leadId: string) => void
  onUpdateLead?: (leadId: string, updates: Partial<Lead>) => void
}

export function KanbanColumn({ stage, label, leads, users, color, onDeleteLead, onUpdateLead }: KanbanColumnProps) {
  const { isOver, setNodeRef } = useDroppable({ id: stage })

  const headerClass =
    stage === "CLOSED"
      ? "text-emerald-400 border-emerald-500/40"
      : stage === "LOST"
        ? "text-red-400 border-red-500/40"
        : "text-gray-300 border-gray-700"

  const countBadgeClass =
    stage === "CLOSED"
      ? "bg-emerald-500/20 text-emerald-400"
      : stage === "LOST"
        ? "bg-red-500/20 text-red-400"
        : "bg-gray-700 text-gray-400"

  return (
    <div className="flex flex-col" style={{ minWidth: 280, width: 280 }}>
      {/* Header */}
      <div
        className={cn(
          "flex items-center justify-between px-3 py-2 rounded-t-lg border-b mb-2",
          headerClass
        )}
      >
        <span className="text-sm font-semibold">{label}</span>
        <span
          className={cn(
            "inline-flex items-center justify-center h-5 min-w-5 px-1.5 rounded-full text-xs font-semibold",
            countBadgeClass
          )}
        >
          {leads.length}
        </span>
      </div>

      {/* Drop area */}
      <div
        ref={setNodeRef}
        className={cn(
          "flex-1 flex flex-col gap-2 p-1 rounded-b-lg min-h-[120px] transition-colors",
          isOver ? "bg-blue-500/5 ring-1 ring-inset ring-blue-500/30" : "bg-transparent"
        )}
      >
        <SortableContext items={leads.map((l) => l.id)} strategy={verticalListSortingStrategy}>
          {leads.length === 0 ? (
            <div className="flex items-center justify-center h-20 rounded-lg border border-dashed border-gray-700/60 text-gray-600 text-xs">
              Arraste um lead aqui
            </div>
          ) : (
            leads.map((lead) => (
              <LeadCard
                key={lead.id}
                lead={lead}
                users={users}
                onDelete={onDeleteLead}
                onUpdate={onUpdateLead}
              />
            ))
          )}
        </SortableContext>
      </div>
    </div>
  )
}
