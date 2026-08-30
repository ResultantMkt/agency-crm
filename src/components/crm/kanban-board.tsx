"use client"

import { useState, useCallback } from "react"
import { DndContext, DragEndEvent, PointerSensor, useSensor, useSensors } from "@dnd-kit/core"
import { arrayMove } from "@dnd-kit/sortable"
import { Plus, Upload } from "lucide-react"
import { Button } from "@/components/ui/button"
import { KanbanColumn } from "./kanban-column"
import { LeadForm } from "./lead-form"
import { CsvImportModal } from "./csv-import-modal"
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

const STAGE_IDS = new Set<string>(STAGES.map((s) => s.stage))

interface KanbanBoardProps {
  initialLeads: Lead[]
  users: User[]
}

export function KanbanBoard({ initialLeads, users }: KanbanBoardProps) {
  const [leads, setLeads] = useState<Lead[]>(initialLeads)
  const [formOpen, setFormOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  )

  const getLeadsForStage = useCallback(
    (stage: LeadStage) =>
      leads
        .filter((l) => l.stage === stage)
        .sort((a, b) => (a.position ?? 0) - (b.position ?? 0)),
    [leads]
  )

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over) return

    const activeLeadId = active.id as string
    const activeLead = leads.find((l) => l.id === activeLeadId)
    if (!activeLead) return

    const overId = over.id as string

    // Determine target stage and whether we're hovering over a specific card
    let targetStage: LeadStage
    let overLeadId: string | null = null

    if (STAGE_IDS.has(overId)) {
      // Dropped on the column's droppable area
      targetStage = overId as LeadStage
    } else {
      // Dropped on another lead card
      const overLead = leads.find((l) => l.id === overId)
      if (!overLead) return
      targetStage = overLead.stage
      overLeadId = overId
    }

    if (activeLead.stage === targetStage) {
      // Intra-column reorder
      if (!overLeadId || overLeadId === activeLeadId) return

      const columnLeads = leads
        .filter((l) => l.stage === targetStage)
        .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))

      const activeIndex = columnLeads.findIndex((l) => l.id === activeLeadId)
      const overIndex = columnLeads.findIndex((l) => l.id === overLeadId)
      if (activeIndex === overIndex) return

      const reordered = arrayMove(columnLeads, activeIndex, overIndex)
      const updates = reordered.map((l, i) => ({ id: l.id, position: i }))

      const posMap = new Map(updates.map((u) => [u.id, u.position]))
      setLeads((prev) =>
        prev.map((l) => (posMap.has(l.id) ? { ...l, position: posMap.get(l.id)! } : l))
      )

      fetch("/api/leads/reorder", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ updates }),
      })
    } else {
      // Inter-column move
      const previousLeads = leads

      setLeads((prev) =>
        prev.map((l) =>
          l.id === activeLeadId ? { ...l, stage: targetStage, updatedAt: new Date().toISOString() } : l
        )
      )

      try {
        const res = await fetch(`/api/leads/${activeLeadId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ stage: targetStage }),
        })
        if (!res.ok) throw new Error("Falha ao atualizar estágio")
      } catch {
        setLeads(previousLeads)
      }
    }
  }

  function handleLeadCreated(lead: Lead) {
    setLeads((prev) => [lead, ...prev])
  }

  function handleLeadDeleted(leadId: string) {
    setLeads((prev) => prev.filter((l) => l.id !== leadId))
  }

  function handleImportSuccess(allLeads: Lead[]) {
    setLeads(allLeads)
    setImportOpen(false)
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-end gap-3 mb-6">
        <Button variant="outline" onClick={() => setImportOpen(true)} size="md">
          <Upload className="h-4 w-4" />
          Importar CSV
        </Button>
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
              onDeleteLead={handleLeadDeleted}
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

      {/* Dialog de importação CSV */}
      <CsvImportModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onSuccess={handleImportSuccess}
      />
    </div>
  )
}
