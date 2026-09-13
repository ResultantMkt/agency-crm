"use client"

import { useState } from "react"
import dynamic from "next/dynamic"
import {
  DialogRoot,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import type { ClientKanbanCard } from "@/types/models"

const BlockEditor = dynamic(
  () => import("@/components/clients/block-editor").then((m) => ({ default: m.BlockEditor })),
  { ssr: false, loading: () => <div className="h-40 rounded-lg border border-gray-200 bg-gray-50 animate-pulse" /> }
)

interface CardDetailModalProps {
  card: ClientKanbanCard | null
  clientId: string
  onClose: () => void
  onSave: (card: ClientKanbanCard) => void
  onDelete: (cardId: string) => void
}

export function CardDetailModal({ card, clientId, onClose, onSave, onDelete }: CardDetailModalProps) {
  const [title, setTitle] = useState(card?.title ?? "")
  const [assignee, setAssignee] = useState(card?.assignee ?? "")
  const [dueDate, setDueDate] = useState(
    card?.dueDate ? card.dueDate.split("T")[0] : ""
  )
  const [content, setContent] = useState<unknown[]>(
    Array.isArray(card?.content) ? (card.content as unknown[]) : []
  )
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

  if (!card) return null

  async function handleSave() {
    if (!title.trim() || !card) return
    setSaving(true)
    try {
      const res = await fetch(`/api/clients/${clientId}/kanban-cards/${card.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          assignee: assignee.trim() || null,
          dueDate: dueDate || null,
          content,
        }),
      })
      if (res.ok) {
        const updated = await res.json()
        onSave({ ...updated, content: Array.isArray(updated.content) ? updated.content : [] })
        onClose()
      }
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!card) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/clients/${clientId}/kanban-cards/${card.id}`, {
        method: "DELETE",
      })
      if (res.ok) {
        onDelete(card.id)
        onClose()
      }
    } finally {
      setDeleting(false)
    }
  }

  return (
    <DialogRoot open onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Detalhes do Card</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">
              Título *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Título do card"
              className="w-full h-9 px-3 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-500 text-gray-900 placeholder:text-gray-400"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">
                Responsável
              </label>
              <input
                type="text"
                value={assignee}
                onChange={(e) => setAssignee(e.target.value)}
                placeholder="Nome do responsável"
                className="w-full h-9 px-3 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-500 text-gray-900 placeholder:text-gray-400"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">
                Data de entrega
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full h-9 px-3 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-500 text-gray-900"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">
              Descrição
            </label>
            <BlockEditor initialContent={content} onChange={setContent} />
          </div>
        </div>

        <DialogFooter className="mt-6">
          {confirmDelete ? (
            <div className="flex items-center gap-3 w-full sm:w-auto sm:mr-auto">
              <span className="text-sm text-red-600 font-medium">Confirmar exclusão?</span>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleDelete}
                disabled={deleting}
              >
                {deleting ? "Excluindo..." : "Excluir"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setConfirmDelete(false)}
              >
                Cancelar
              </Button>
            </div>
          ) : (
            <Button
              variant="outline"
              size="sm"
              className="sm:mr-auto text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
              onClick={() => setConfirmDelete(true)}
            >
              Excluir card
            </Button>
          )}
          <Button variant="outline" size="md" onClick={onClose}>
            Cancelar
          </Button>
          <Button size="md" onClick={handleSave} disabled={saving || !title.trim()}>
            {saving ? "Salvando..." : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </DialogRoot>
  )
}
