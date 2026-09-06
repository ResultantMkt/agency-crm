"use client"

import { useState, useRef, useEffect } from "react"
import { useDroppable } from "@dnd-kit/core"
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable"
import { MoreVertical, ChevronLeft, ChevronRight, Trash2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { LeadCard } from "./lead-card"
import type { Lead, User } from "@/types/models"

interface KanbanColumnProps {
  stage: string
  label: string
  leads: Lead[]
  users: User[]
  isAdmin?: boolean
  isFirst?: boolean
  isLast?: boolean
  onRename?: (name: string) => void
  onDelete?: () => void
  onMoveLeft?: () => void
  onMoveRight?: () => void
  onDeleteLead?: (leadId: string) => void
  onUpdateLead?: (leadId: string, updates: Partial<Lead>) => void
}

export function KanbanColumn({
  stage, label, leads, users,
  isAdmin, isFirst, isLast,
  onRename, onDelete, onMoveLeft, onMoveRight,
  onDeleteLead, onUpdateLead,
}: KanbanColumnProps) {
  const { isOver, setNodeRef } = useDroppable({ id: stage })
  const [editing, setEditing] = useState(false)
  const [editName, setEditName] = useState(label)
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { setEditName(label) }, [label])

  useEffect(() => {
    if (editing) inputRef.current?.focus()
  }, [editing])

  useEffect(() => {
    if (!menuOpen) return
    function onOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false)
    }
    document.addEventListener("mousedown", onOutside)
    return () => document.removeEventListener("mousedown", onOutside)
  }, [menuOpen])

  function startEdit() {
    setEditName(label)
    setEditing(true)
  }

  function saveEdit() {
    const trimmed = editName.trim()
    if (trimmed && trimmed !== label) onRename?.(trimmed)
    setEditing(false)
  }

  const headerClass =
    stage === "CLOSED"
      ? "text-emerald-600 border-emerald-500/40"
      : stage === "LOST"
        ? "text-red-600 border-red-500/40"
        : "text-gray-600 border-gray-200"

  const countBadgeClass =
    stage === "CLOSED"
      ? "bg-emerald-500/20 text-emerald-600"
      : stage === "LOST"
        ? "bg-red-500/20 text-red-600"
        : "bg-gray-200 text-gray-500"

  return (
    <div className="flex flex-col" style={{ minWidth: 280, width: 280 }}>
      {/* Header */}
      <div
        className={cn(
          "flex items-center gap-1 px-3 py-2 rounded-t-lg border-b mb-2",
          headerClass
        )}
      >
        {/* Title */}
        {editing ? (
          <input
            ref={inputRef}
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") saveEdit()
              if (e.key === "Escape") setEditing(false)
            }}
            onBlur={saveEdit}
            className="flex-1 min-w-0 text-sm font-semibold bg-white border border-purple-500 rounded px-1.5 py-0.5 text-gray-900 focus:outline-none focus:ring-1 focus:ring-purple-500"
          />
        ) : (
          <span
            className={cn(
              "flex-1 min-w-0 text-sm font-semibold truncate",
              isAdmin && "cursor-pointer hover:text-purple-600 transition-colors"
            )}
            onClick={isAdmin ? startEdit : undefined}
            title={isAdmin ? "Clique para renomear" : undefined}
          >
            {label}
          </span>
        )}

        {/* Count badge */}
        <span
          className={cn(
            "inline-flex items-center justify-center h-5 min-w-5 px-1.5 rounded-full text-xs font-semibold shrink-0",
            countBadgeClass
          )}
        >
          {leads.length}
        </span>

        {/* Admin menu */}
        {isAdmin && !editing && (
          <div ref={menuRef} className="relative shrink-0">
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              className="p-0.5 rounded hover:bg-black/5 text-current opacity-50 hover:opacity-100 transition-opacity"
            >
              <MoreVertical className="h-3.5 w-3.5" />
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-6 z-50 w-48 rounded-lg border border-gray-200 bg-white shadow-xl py-1 text-left">
                <button
                  type="button"
                  onClick={() => { startEdit(); setMenuOpen(false) }}
                  className="w-full px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 hover:text-gray-900 text-left"
                >
                  Renomear etapa
                </button>
                <button
                  type="button"
                  onClick={() => { onMoveLeft?.(); setMenuOpen(false) }}
                  disabled={isFirst}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 hover:text-gray-900 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                  Mover para esquerda
                </button>
                <button
                  type="button"
                  onClick={() => { onMoveRight?.(); setMenuOpen(false) }}
                  disabled={isLast}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 hover:text-gray-900 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                  Mover para direita
                </button>
                <div className="my-1 border-t border-gray-100" />
                <button
                  type="button"
                  onClick={() => { onDelete?.(); setMenuOpen(false) }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Excluir etapa
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Drop area */}
      <div
        ref={setNodeRef}
        className={cn(
          "flex-1 flex flex-col gap-2 p-1 rounded-b-lg min-h-[120px] transition-colors",
          isOver ? "bg-purple-500/5 ring-1 ring-inset ring-purple-500/30" : "bg-transparent"
        )}
      >
        <SortableContext items={leads.map((l) => l.id)} strategy={verticalListSortingStrategy}>
          {leads.length === 0 ? (
            <div className="flex items-center justify-center h-20 rounded-lg border border-dashed border-gray-200/60 text-gray-600 text-xs">
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
