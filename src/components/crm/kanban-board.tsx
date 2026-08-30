"use client"

import { useState, useCallback } from "react"
import { DndContext, DragEndEvent, PointerSensor, useSensor, useSensors } from "@dnd-kit/core"
import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { KanbanColumn } from "./kanban-column"
import { LeadForm } from "./lead-form"
import type { Lead, LeadStage, User } from "@/types/models"

const STAGES: { stage: LeadStage; label: string }[] = [
  { stage: "LEAD", label: "Lead" },
  { stage: "MQL", label: "MQL" },
  { stage: "SCREENING_SCHEDULED", label: "Triagem Agendada" },
  { stage: "SCREENING_DONE", label: "Triagem Realizada" },
  { stage: "CLOSING_MEETING", label: "Reunião de Fechamento" },
  { stage: "PROPOSAL_SENT", label: "Proposta Enviada" },
  { stage: "CLOSED", label: "Fechamento" },
  { stage: "LOST", label: "Perdido" },
]

interface KanbanBoardProps {
  initialLeads: Lead[]
  users: User[]
}

export function KanbanBoard({ initialLeads, users }: KanbanBoardProps) {
  const [leads, setLeads] = useState<Lead[]>(initialLeads)
  const [formOpen, setFormOpen] = useState(false)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  )

  const getLeadsForStage = useCallback(
    (stage: LeadStage) => leads.filter((l) => l.stage === stage),
    [leads]
  )

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over) return

    const leadId = active.id as string
    const newStage = over.id as LeadStage

    const lead = leads.find((l) => l.id === leadId)
    if (!lead || lead.stage === newStage) return

    const previousLeads = leads

    // Atualização otimista
    setLeads((prev) =>
      prev.map((l) =>
        l.id === leadId ? { ...l, stage: newStage, updatedAt: new Date().toISOString() } : l
      )
    )

    try {
      const res = await fetch(`/api/leads/${leadId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stage: newStage }),
      })

      if (!res.ok) {
        throw new Error("Falha ao atualizar estágio")
      }
    } catch {
      // Reverte em caso de erro
      setLeads(previousLeads)
    }
  }

  function handleLeadCreated(lead: Lead) {
    setLeads((prev) => [lead, ...prev])
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-end mb-6">
        <Button onClick={() => setFormOpen(true)} size="md">
          <Plus className="h-4 w-4" />
          Novo Lead
        </Button>
      </div>

      {/* Kanban */}
      <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
        <div className="flex gap-4 overflow-x-auto pb-4 flex-1">
          {STAGES.map(({ stage, label }) => (
            <KanbanColumn
              key={stage}
              stage={stage}
              label={label}
              leads={getLeadsForStage(stage)}
            />
          ))}
        </div>
      </DndContext>

      {/* Dialog de criação */}
      <LeadForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSuccess={handleLeadCreated}
        users={users}
      />
    </div>
  )
}
