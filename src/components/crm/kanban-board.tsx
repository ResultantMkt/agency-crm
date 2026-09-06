"use client"

import { useState, useCallback, useMemo, useRef, useEffect } from "react"
import { DndContext, DragEndEvent, DragStartEvent, DragOverlay, PointerSensor, useSensor, useSensors } from "@dnd-kit/core"
import { arrayMove } from "@dnd-kit/sortable"
import { Plus, Upload, Search, Check, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { KanbanColumn } from "./kanban-column"
import { LeadCardOverlay } from "./lead-card"
import { LeadForm } from "./lead-form"
import { CsvImportModal } from "./csv-import-modal"
import { KanbanFilters, KanbanFilterState, EMPTY_FILTERS, UNASSIGNED_ID } from "./kanban-filters"
import type { Lead, PipelineStage, User } from "@/types/models"

interface KanbanBoardProps {
  initialLeads: Lead[]
  users: User[]
  stages: PipelineStage[]
  isAdmin?: boolean
}

export function KanbanBoard({ initialLeads, users, stages: initialStages, isAdmin }: KanbanBoardProps) {
  const [leads, setLeads] = useState<Lead[]>(initialLeads)
  const [stages, setStages] = useState<PipelineStage[]>(initialStages)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [filters, setFilters] = useState<KanbanFilterState>(EMPTY_FILTERS)
  const [search, setSearch] = useState("")
  const [stageError, setStageError] = useState<string | null>(null)
  const [addingStage, setAddingStage] = useState(false)
  const [newStageName, setNewStageName] = useState("")
  const [addingLoading, setAddingLoading] = useState(false)
  const newStageInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (addingStage) newStageInputRef.current?.focus()
  }, [addingStage])

  const stageKeySet = useMemo(() => new Set(stages.map((s) => s.key)), [stages])

  const filteredLeads = useMemo(() => {
    const q = search.trim().toLowerCase()
    return leads.filter((l) => {
      if (q && !l.name.toLowerCase().includes(q)) return false
      if (filters.sources.length > 0 && !filters.sources.includes(l.source)) return false
      if (filters.stages.length > 0 && !filters.stages.includes(l.stage)) return false
      if (filters.assignedToIds.length > 0) {
        const isUnassigned = !l.assignedToId
        const matchesUnassigned = filters.assignedToIds.includes(UNASSIGNED_ID) && isUnassigned
        const matchesUser = !isUnassigned && filters.assignedToIds.includes(l.assignedToId!)
        if (!matchesUnassigned && !matchesUser) return false
      }
      if (filters.createdFrom) {
        if (new Date(l.createdAt) < new Date(filters.createdFrom)) return false
      }
      if (filters.createdTo) {
        const to = new Date(filters.createdTo)
        to.setHours(23, 59, 59, 999)
        if (new Date(l.createdAt) > to) return false
      }
      return true
    })
  }, [leads, filters, search])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  )

  const getLeadsForStage = useCallback(
    (stage: string) =>
      filteredLeads
        .filter((l) => l.stage === stage)
        .sort((a, b) => (a.position ?? 0) - (b.position ?? 0)),
    [filteredLeads]
  )

  function handleDragStart(event: DragStartEvent) {
    setActiveId(event.active.id as string)
  }

  async function handleDragEnd(event: DragEndEvent) {
    setActiveId(null)
    const { active, over } = event
    if (!over) return

    const activeLeadId = active.id as string
    const activeLead = leads.find((l) => l.id === activeLeadId)
    if (!activeLead) return

    const overId = over.id as string
    let targetStage: string
    let overLeadId: string | null = null

    if (stageKeySet.has(overId)) {
      targetStage = overId
    } else {
      const overLead = leads.find((l) => l.id === overId)
      if (!overLead) return
      targetStage = overLead.stage as string
      overLeadId = overId
    }

    if (activeLead.stage === targetStage) {
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
        if (!res.ok) throw new Error()
      } catch {
        setLeads(previousLeads)
      }
    }
  }

  // ─── Stage management (admin) ────────────────────────────────────────────────

  async function handleRenameStage(stageId: string, name: string) {
    const res = await fetch(`/api/pipeline-stages/${stageId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    })
    if (res.ok) {
      const updated = await res.json()
      setStages((prev) => prev.map((s) => (s.id === stageId ? updated : s)))
    }
  }

  async function handleDeleteStage(stageId: string) {
    setStageError(null)
    const res = await fetch(`/api/pipeline-stages/${stageId}`, { method: "DELETE" })
    const data = await res.json()
    if (!res.ok) {
      setStageError(data.error ?? "Erro ao excluir etapa")
      setTimeout(() => setStageError(null), 5000)
      return
    }
    setStages((prev) => prev.filter((s) => s.id !== stageId))
  }

  async function handleMoveStage(index: number, direction: "left" | "right") {
    const swapIndex = direction === "left" ? index - 1 : index + 1
    if (swapIndex < 0 || swapIndex >= stages.length) return
    const newStages = [...stages]
    ;[newStages[index], newStages[swapIndex]] = [newStages[swapIndex], newStages[index]]
    const reordered = newStages.map((s, i) => ({ ...s, position: i }))
    setStages(reordered)
    fetch("/api/pipeline-stages/reorder", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stages: reordered.map(({ id, position }) => ({ id, position })) }),
    })
  }

  async function handleAddStage() {
    const name = newStageName.trim()
    if (!name) return
    setAddingLoading(true)
    try {
      const res = await fetch("/api/pipeline-stages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      })
      if (res.ok) {
        const created = await res.json()
        setStages((prev) => [...prev, created])
        setNewStageName("")
        setAddingStage(false)
      }
    } finally {
      setAddingLoading(false)
    }
  }

  // ─── Lead handlers ───────────────────────────────────────────────────────────

  function handleLeadCreated(lead: Lead) {
    setLeads((prev) => [lead, ...prev])
  }

  function handleLeadDeleted(leadId: string) {
    setLeads((prev) => prev.filter((l) => l.id !== leadId))
  }

  function handleLeadUpdated(leadId: string, updates: Partial<Lead>) {
    setLeads((prev) => prev.map((l) => (l.id === leadId ? { ...l, ...updates } : l)))
  }

  function handleImportSuccess(allLeads: Lead[]) {
    setLeads(allLeads)
    setImportOpen(false)
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-end gap-3 mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 pointer-events-none" />
          <input
            type="text"
            placeholder="Buscar lead..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 pl-9 pr-3 w-48 text-sm bg-white border border-gray-200 text-gray-900 rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-500 placeholder:text-gray-400"
          />
        </div>
        <KanbanFilters filters={filters} users={users} stages={stages} onChange={setFilters} />
        <Button variant="outline" onClick={() => setImportOpen(true)} size="md">
          <Upload className="h-4 w-4" />
          Importar CSV
        </Button>
        <Button onClick={() => setFormOpen(true)} size="md">
          <Plus className="h-4 w-4" />
          Novo Lead
        </Button>
      </div>

      {/* Stage error banner */}
      {stageError && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">
          {stageError}
        </div>
      )}

      {/* Kanban */}
      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="flex gap-4 overflow-x-auto pb-4 flex-1 items-start">
          {stages.map((s, index) => (
            <KanbanColumn
              key={s.key}
              stage={s.key}
              label={s.name}
              leads={getLeadsForStage(s.key)}
              users={users}
              isAdmin={isAdmin}
              isFirst={index === 0}
              isLast={index === stages.length - 1}
              onRename={(name) => handleRenameStage(s.id, name)}
              onDelete={() => handleDeleteStage(s.id)}
              onMoveLeft={() => handleMoveStage(index, "left")}
              onMoveRight={() => handleMoveStage(index, "right")}
              onDeleteLead={handleLeadDeleted}
              onUpdateLead={handleLeadUpdated}
            />
          ))}

          {/* Add stage (admin only) */}
          {isAdmin && (
            <div className="shrink-0" style={{ minWidth: 200 }}>
              {addingStage ? (
                <div className="flex flex-col gap-2 px-3 py-2 rounded-lg border border-dashed border-purple-300 bg-purple-50/50">
                  <input
                    ref={newStageInputRef}
                    value={newStageName}
                    onChange={(e) => setNewStageName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleAddStage()
                      if (e.key === "Escape") { setAddingStage(false); setNewStageName("") }
                    }}
                    placeholder="Nome da etapa..."
                    className="text-sm bg-white border border-gray-300 rounded px-2 py-1.5 text-gray-900 focus:outline-none focus:ring-1 focus:ring-purple-500 placeholder:text-gray-400"
                    disabled={addingLoading}
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleAddStage}
                      disabled={addingLoading || !newStageName.trim()}
                      className="flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium bg-purple-600 text-white hover:bg-purple-500 disabled:opacity-40 transition-colors"
                    >
                      <Check className="h-3 w-3" />
                      Criar
                    </button>
                    <button
                      type="button"
                      onClick={() => { setAddingStage(false); setNewStageName("") }}
                      className="flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium text-gray-500 hover:bg-gray-100 transition-colors"
                    >
                      <X className="h-3 w-3" />
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setAddingStage(true)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed border-gray-300 text-gray-500 hover:border-purple-400 hover:text-purple-600 hover:bg-purple-50/50 text-sm font-medium transition-colors w-full"
                >
                  <Plus className="h-4 w-4" />
                  Nova etapa
                </button>
              )}
            </div>
          )}
        </div>
        <DragOverlay dropAnimation={{ duration: 180, easing: "ease" }}>
          {activeId ? (
            <LeadCardOverlay lead={leads.find((l) => l.id === activeId)!} users={users} />
          ) : null}
        </DragOverlay>
      </DndContext>

      <LeadForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSuccess={handleLeadCreated}
        users={users}
        stages={stages}
      />
      <CsvImportModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onSuccess={handleImportSuccess}
      />
    </div>
  )
}
