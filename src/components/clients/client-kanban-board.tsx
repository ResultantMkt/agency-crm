"use client"

import { useState, useCallback, useRef, useEffect } from "react"
import {
  DndContext,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core"
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable"
import { useDroppable } from "@dnd-kit/core"
import { CSS } from "@dnd-kit/utilities"
import { Plus, User, Calendar, GripVertical } from "lucide-react"
import { cn } from "@/lib/utils"
import { CardDetailModal } from "@/components/clients/card-detail-modal"
import type { ClientKanbanCard } from "@/types/models"

const COLUMNS = [
  { key: "backlog", label: "Backlog" },
  { key: "todo", label: "To do" },
  { key: "doing", label: "Doing" },
  { key: "done", label: "Done" },
]

interface ClientKanbanBoardProps {
  clientId: string
  initialCards: ClientKanbanCard[]
}

// ─── Card component ─────────────────────────────────────────────────────────

interface KanbanCardProps {
  card: ClientKanbanCard
  isDone: boolean
  onClick: () => void
}

function KanbanCard({ card, isDone, onClick }: KanbanCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: card.id,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group bg-white border border-gray-200 rounded-lg px-3 py-2.5 cursor-pointer hover:border-purple-300 hover:shadow-sm transition-all",
        isDone && "opacity-60"
      )}
      onClick={onClick}
    >
      <div className="flex items-start gap-2">
        <button
          type="button"
          className="mt-0.5 shrink-0 text-gray-300 hover:text-gray-500 cursor-grab active:cursor-grabbing"
          {...attributes}
          {...listeners}
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical className="h-3.5 w-3.5" />
        </button>
        <div className="flex-1 min-w-0">
          <p
            className={cn(
              "text-sm font-medium text-gray-900 leading-snug",
              isDone && "line-through text-gray-500"
            )}
          >
            {card.title}
          </p>
          <div className="flex items-center gap-3 mt-1.5 flex-wrap">
            {card.assignee && (
              <span className="flex items-center gap-1 text-xs text-gray-500">
                <User className="h-3 w-3" />
                {card.assignee}
              </span>
            )}
            {card.dueDate && (
              <span className="flex items-center gap-1 text-xs text-gray-500">
                <Calendar className="h-3 w-3" />
                {new Date(card.dueDate).toLocaleDateString("pt-BR", {
                  day: "2-digit",
                  month: "short",
                })}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function KanbanCardOverlay({ card }: { card: ClientKanbanCard }) {
  return (
    <div className="bg-white border border-purple-300 rounded-lg px-3 py-2.5 shadow-lg opacity-90 w-64">
      <p className="text-sm font-medium text-gray-900 truncate">{card.title}</p>
    </div>
  )
}

// ─── Column component ────────────────────────────────────────────────────────

interface ColumnProps {
  columnKey: string
  label: string
  cards: ClientKanbanCard[]
  clientId: string
  onAddCard: (columnKey: string, title: string) => Promise<void>
  onCardClick: (card: ClientKanbanCard) => void
}

function KanbanColumn({ columnKey, label, cards, clientId, onAddCard, onCardClick }: ColumnProps) {
  const { isOver, setNodeRef } = useDroppable({ id: columnKey })
  const [adding, setAdding] = useState(false)
  const [newTitle, setNewTitle] = useState("")
  const [saving, setSaving] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (adding) inputRef.current?.focus()
  }, [adding])

  async function handleAdd() {
    const title = newTitle.trim()
    if (!title) return
    setSaving(true)
    try {
      await onAddCard(columnKey, title)
      setNewTitle("")
      setAdding(false)
    } finally {
      setSaving(false)
    }
  }

  const isDone = columnKey === "done"

  return (
    <div
      className="flex flex-col shrink-0 rounded-xl bg-gray-50 border border-gray-200/60"
      style={{ minWidth: 260, width: 260 }}
    >
      {/* Column header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-gray-200/60">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-gray-800">{label}</span>
          <span className="text-xs text-gray-400 font-medium bg-gray-100 rounded-full px-2 py-0.5">
            {cards.length}
          </span>
        </div>
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="p-1 rounded text-gray-400 hover:text-purple-600 hover:bg-purple-50 transition-colors"
          title="Adicionar card"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Cards */}
      <div
        ref={setNodeRef}
        className={cn(
          "flex-1 p-2 space-y-2 min-h-[80px] transition-colors",
          isOver && "bg-purple-50/60"
        )}
      >
        <SortableContext items={cards.map((c) => c.id)} strategy={verticalListSortingStrategy}>
          {cards.map((card) => (
            <KanbanCard
              key={card.id}
              card={card}
              isDone={isDone}
              onClick={() => onCardClick(card)}
            />
          ))}
        </SortableContext>
      </div>

      {/* Add card inline */}
      {adding && (
        <div className="p-2 border-t border-gray-200/60 space-y-2">
          <textarea
            ref={inputRef as unknown as React.Ref<HTMLTextAreaElement>}
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleAdd() }
              if (e.key === "Escape") { setAdding(false); setNewTitle("") }
            }}
            placeholder="Título do card..."
            rows={2}
            className="w-full px-2.5 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-500 text-gray-900 placeholder:text-gray-400 resize-none"
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleAdd}
              disabled={!newTitle.trim() || saving}
              className="flex-1 py-1 text-xs font-medium rounded bg-purple-600 text-white hover:bg-purple-500 disabled:opacity-40 transition-colors"
            >
              {saving ? "Adicionando..." : "Adicionar"}
            </button>
            <button
              type="button"
              onClick={() => { setAdding(false); setNewTitle("") }}
              className="px-2.5 py-1 text-xs font-medium rounded text-gray-500 hover:bg-gray-100 transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Board ────────────────────────────────────────────────────────────────────

export function ClientKanbanBoard({ clientId, initialCards }: ClientKanbanBoardProps) {
  const [cards, setCards] = useState<ClientKanbanCard[]>(initialCards)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [selectedCard, setSelectedCard] = useState<ClientKanbanCard | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  )

  const getCardsForColumn = useCallback(
    (col: string) =>
      cards.filter((c) => c.columnKey === col).sort((a, b) => a.position - b.position),
    [cards]
  )

  const columnKeySet = new Set(COLUMNS.map((c) => c.key))

  function handleDragStart(event: DragStartEvent) {
    setActiveId(event.active.id as string)
  }

  async function handleDragEnd(event: DragEndEvent) {
    setActiveId(null)
    const { active, over } = event
    if (!over) return

    const activeCardId = active.id as string
    const activeCard = cards.find((c) => c.id === activeCardId)
    if (!activeCard) return

    const overId = over.id as string
    let targetColumn: string
    let overCardId: string | null = null

    if (columnKeySet.has(overId)) {
      targetColumn = overId
    } else {
      const overCard = cards.find((c) => c.id === overId)
      if (!overCard) return
      targetColumn = overCard.columnKey
      overCardId = overId
    }

    if (activeCard.columnKey === targetColumn) {
      if (!overCardId || overCardId === activeCardId) return
      const colCards = cards
        .filter((c) => c.columnKey === targetColumn)
        .sort((a, b) => a.position - b.position)
      const activeIndex = colCards.findIndex((c) => c.id === activeCardId)
      const overIndex = colCards.findIndex((c) => c.id === overCardId)
      if (activeIndex === overIndex) return
      const reordered = arrayMove(colCards, activeIndex, overIndex)
      const updates = reordered.map((c, i) => ({ id: c.id, position: i }))
      const posMap = new Map(updates.map((u) => [u.id, u.position]))
      setCards((prev) =>
        prev.map((c) => (posMap.has(c.id) ? { ...c, position: posMap.get(c.id)! } : c))
      )
      // Persist each card's new position
      updates.forEach(({ id, position }) => {
        fetch(`/api/clients/${clientId}/kanban-cards/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ position }),
        })
      })
    } else {
      const colCards = cards
        .filter((c) => c.columnKey === targetColumn)
        .sort((a, b) => a.position - b.position)
      const newPosition = overCardId
        ? colCards.findIndex((c) => c.id === overCardId)
        : colCards.length

      const prevCards = cards
      setCards((prev) =>
        prev.map((c) =>
          c.id === activeCardId
            ? { ...c, columnKey: targetColumn, position: newPosition, updatedAt: new Date().toISOString() }
            : c
        )
      )
      try {
        const res = await fetch(`/api/clients/${clientId}/kanban-cards/${activeCardId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ columnKey: targetColumn, position: newPosition }),
        })
        if (!res.ok) throw new Error()
      } catch {
        setCards(prevCards)
      }
    }
  }

  async function handleAddCard(columnKey: string, title: string) {
    const colCards = getCardsForColumn(columnKey)
    const position = colCards.length

    const res = await fetch(`/api/clients/${clientId}/kanban-cards`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ columnKey, title, position }),
    })

    if (res.ok) {
      const created = await res.json()
      setCards((prev) => [...prev, { ...created, content: [] }])
    }
  }

  function handleCardSave(updated: ClientKanbanCard) {
    setCards((prev) => prev.map((c) => (c.id === updated.id ? updated : c)))
  }

  function handleCardDelete(cardId: string) {
    setCards((prev) => prev.filter((c) => c.id !== cardId))
  }

  const activeCard = activeId ? cards.find((c) => c.id === activeId) : null

  return (
    <div className="flex flex-col h-full">
      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="flex gap-4 overflow-x-auto pb-4 items-start">
          {COLUMNS.map((col) => (
            <KanbanColumn
              key={col.key}
              columnKey={col.key}
              label={col.label}
              cards={getCardsForColumn(col.key)}
              clientId={clientId}
              onAddCard={handleAddCard}
              onCardClick={setSelectedCard}
            />
          ))}
        </div>

        <DragOverlay dropAnimation={{ duration: 180, easing: "ease" }}>
          {activeCard ? <KanbanCardOverlay card={activeCard} /> : null}
        </DragOverlay>
      </DndContext>

      {selectedCard && (
        <CardDetailModal
          card={selectedCard}
          clientId={clientId}
          onClose={() => setSelectedCard(null)}
          onSave={handleCardSave}
          onDelete={handleCardDelete}
        />
      )}
    </div>
  )
}
