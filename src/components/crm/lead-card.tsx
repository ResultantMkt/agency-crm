"use client"

import { useState, useRef, useEffect } from "react"
import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { useRouter } from "next/navigation"
import { Calendar, User, ClipboardList, MoreVertical, Trash2, Plus } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import {
  DialogRoot,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { formatCurrency } from "@/lib/utils"
import type { Lead, LeadSource, LeadSource as LeadSourceType, TaskStatus, User as UserType } from "@/types/models"
import { QuickTaskModal, type CreatedTask } from "./quick-task-modal"

const SOURCE_LABELS: Record<LeadSource, string> = {
  TRAFFIC: "Tráfego",
  PROSPECTING: "Prospecção",
  REFERRAL: "Indicação",
  OTHER: "Outro",
}

const SOURCE_OPTIONS: { value: LeadSourceType; label: string }[] = [
  { value: "TRAFFIC", label: "Tráfego" },
  { value: "PROSPECTING", label: "Prospecção" },
  { value: "REFERRAL", label: "Indicação" },
  { value: "OTHER", label: "Outro" },
]

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
  users?: UserType[]
  onDelete?: (leadId: string) => void
  onUpdate?: (leadId: string, updates: Partial<Lead>) => void
}

type CardEditingField = "source" | "assignedTo" | null

export function LeadCard({ lead, users = [], onDelete, onUpdate }: LeadCardProps) {
  const router = useRouter()

  // Inline edit state
  const [editingField, setEditingField] = useState<CardEditingField>(null)
  const editRef = useRef<HTMLDivElement>(null)

  // Quick task state
  const [taskModalOpen, setTaskModalOpen] = useState(false)

  // Delete state
  const [menuOpen, setMenuOpen] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: lead.id,
    data: { lead },
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 999 : undefined,
  }

  // Close 3-dot menu on outside click
  useEffect(() => {
    if (!menuOpen) return
    function handleOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener("mousedown", handleOutside)
    return () => document.removeEventListener("mousedown", handleOutside)
  }, [menuOpen])

  // Close inline edit on outside click
  useEffect(() => {
    if (!editingField) return
    function handleOutside(e: MouseEvent) {
      if (editRef.current && !editRef.current.contains(e.target as Node)) {
        setEditingField(null)
      }
    }
    document.addEventListener("mousedown", handleOutside)
    return () => document.removeEventListener("mousedown", handleOutside)
  }, [editingField])

  const urgentTask = getMostUrgentTask(lead.tasks)
  const assignedUser = users.find((u) => u.id === lead.assignedToId)
  const displayAssignedName = assignedUser?.name ?? lead.assignedTo?.name ?? null

  async function patchField(data: Partial<Lead> & Record<string, unknown>) {
    const res = await fetch(`/api/leads/${lead.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })
    if (res.ok) onUpdate?.(lead.id, data as Partial<Lead>)
  }

  async function handleSourceChange(newSource: LeadSourceType) {
    setEditingField(null)
    await patchField({ source: newSource })
  }

  async function handleAssignedToChange(newId: string | null) {
    setEditingField(null)
    await patchField({ assignedToId: newId ?? undefined })
  }

  function handleClick(e: React.MouseEvent) {
    if (isDragging) return
    router.push(`/crm/${lead.id}`)
  }

  function handleMenuClick(e: React.MouseEvent) {
    e.stopPropagation()
    e.preventDefault()
    setMenuOpen((v) => !v)
  }

  function handleDeleteClick(e: React.MouseEvent) {
    e.stopPropagation()
    setMenuOpen(false)
    setConfirmOpen(true)
  }

  function handleTaskCreated(task: CreatedTask) {
    setTaskModalOpen(false)
    const newTask = {
      id: task.id,
      title: task.title,
      description: task.description,
      status: task.status,
      dueDate: task.dueDate,
      assignedTo: task.assignedTo,
    }
    onUpdate?.(lead.id, { tasks: [...(lead.tasks ?? []), newTask] })
  }

  async function handleConfirmDelete() {
    setDeleting(true)
    try {
      const res = await fetch(`/api/leads/${lead.id}`, { method: "DELETE" })
      if (res.ok) {
        setConfirmOpen(false)
        onDelete?.(lead.id)
      }
    } finally {
      setDeleting(false)
    }
  }

  return (
    <>
      <div
        ref={setNodeRef}
        style={style}
        {...listeners}
        {...attributes}
        onClick={handleClick}
        className={`relative bg-gray-800 border border-gray-700 rounded-lg p-4 shadow hover:shadow-md hover:border-gray-600 transition-all select-none ${isDragging ? "cursor-grabbing" : "cursor-pointer"}`}
      >
        {/* Nome + menu */}
        <div className="flex items-start justify-between gap-1 mb-2">
          <p className="text-sm font-semibold text-white truncate">{lead.name}</p>
          <div ref={menuRef} className="relative shrink-0">
            <button
              type="button"
              onClick={handleMenuClick}
              onPointerDown={(e) => e.stopPropagation()}
              className="p-0.5 rounded text-gray-500 hover:text-white hover:bg-gray-700/60 transition-colors"
            >
              <MoreVertical className="h-3.5 w-3.5" />
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-6 z-50 min-w-[140px] rounded-lg border border-gray-700 bg-gray-800 shadow-xl py-1">
                <button
                  type="button"
                  onClick={handleDeleteClick}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-gray-700/50 transition-colors"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Excluir lead
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Valor estimado (readonly no card) */}
        {lead.estimatedValue && (
          <p className="text-sm font-medium text-emerald-400 mb-2">
            {formatCurrency(parseFloat(lead.estimatedValue))}
          </p>
        )}

        {/* Source badge — clicável */}
        <div ref={editingField === "source" ? editRef : undefined} className="mb-3">
          {editingField === "source" ? (
            <select
              autoFocus
              className="text-xs bg-gray-700 text-white rounded px-1.5 py-0.5 border border-gray-600 focus:outline-none focus:ring-1 focus:ring-blue-500 w-full"
              value={lead.source}
              onChange={(e) => handleSourceChange(e.target.value as LeadSourceType)}
              onBlur={() => setEditingField(null)}
              onClick={(e) => e.stopPropagation()}
              onPointerDown={(e) => e.stopPropagation()}
            >
              {SOURCE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          ) : (
            <Badge
              variant="outline"
              className="text-xs cursor-pointer hover:border-blue-500/60 hover:text-blue-400 transition-colors"
              onClick={(e) => { e.stopPropagation(); setEditingField("source") }}
              onPointerDown={(e) => e.stopPropagation()}
              title="Clique para editar origem"
            >
              {SOURCE_LABELS[lead.source]}
            </Badge>
          )}
        </div>

        {/* Tarefa vinculada ou botão de criação rápida */}
        {!urgentTask && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setTaskModalOpen(true) }}
            onPointerDown={(e) => e.stopPropagation()}
            className="flex items-center gap-1 mb-3 text-xs text-gray-600 hover:text-blue-400 transition-colors"
          >
            <Plus className="h-3 w-3" />
            Tarefa
          </button>
        )}
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
          {/* Responsável — clicável */}
          <div
            ref={editingField === "assignedTo" ? editRef : undefined}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
          >
            {editingField === "assignedTo" ? (
              <select
                autoFocus
                className="text-xs bg-gray-700 text-white rounded px-1.5 py-0.5 border border-gray-600 focus:outline-none focus:ring-1 focus:ring-blue-500 max-w-[130px]"
                value={lead.assignedToId ?? ""}
                onChange={(e) => handleAssignedToChange(e.target.value || null)}
                onBlur={() => setEditingField(null)}
              >
                <option value="">Sem responsável</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>{u.name.split(" ")[0]}</option>
                ))}
              </select>
            ) : displayAssignedName ? (
              <button
                type="button"
                className="flex items-center gap-1.5 group"
                onClick={() => setEditingField("assignedTo")}
                title="Clique para editar responsável"
              >
                <div className="h-6 w-6 rounded-full bg-blue-600 flex items-center justify-center text-xs font-semibold text-white shrink-0 group-hover:ring-1 group-hover:ring-blue-400 transition-all">
                  {getInitials(displayAssignedName)}
                </div>
                <span className="text-xs text-gray-400 truncate max-w-[80px] group-hover:text-blue-400 transition-colors">
                  {displayAssignedName.split(" ")[0]}
                </span>
              </button>
            ) : (
              <button
                type="button"
                className="flex items-center gap-1 text-gray-600 hover:text-gray-400 transition-colors"
                onClick={() => setEditingField("assignedTo")}
                title="Clique para atribuir responsável"
              >
                <User className="h-3.5 w-3.5" />
                <span className="text-xs">Sem responsável</span>
              </button>
            )}
          </div>

          {/* Data de criação — somente leitura */}
          <div className="flex items-center gap-1 text-gray-500">
            <Calendar className="h-3 w-3" />
            <span className="text-xs">{formatDate(lead.createdAt)}</span>
          </div>
        </div>
      </div>

      {/* Modal de criação rápida de tarefa */}
      <QuickTaskModal
        open={taskModalOpen}
        onClose={() => setTaskModalOpen(false)}
        onSuccess={handleTaskCreated}
        leadId={lead.id}
        users={users}
      />

      {/* Confirmação de exclusão */}
      <DialogRoot open={confirmOpen} onOpenChange={(v) => { if (!deleting) setConfirmOpen(v) }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Excluir lead</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir o lead{" "}
              <span className="font-medium text-white">{lead.name}</span>? Essa ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" size="md" onClick={() => setConfirmOpen(false)} disabled={deleting}>
              Cancelar
            </Button>
            <Button variant="destructive" size="md" onClick={handleConfirmDelete} disabled={deleting}>
              {deleting ? "Excluindo..." : "Excluir"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </DialogRoot>
    </>
  )
}
