"use client"

import { useState, useEffect, useRef } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { ChevronUp, ChevronDown, Trash2, Plus, Check, X, Pencil, GripVertical } from "lucide-react"
import { Button } from "@/components/ui/button"

interface PipelineStage {
  id: string
  key: string
  name: string
  position: number
  color: string | null
}

export default function PipelinePage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [stages, setStages] = useState<PipelineStage[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState("")
  const [newName, setNewName] = useState("")
  const [addingNew, setAddingNew] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (status === "loading") return
    if (!session || session.user.role !== "ADMIN") {
      router.replace("/dashboard")
    }
  }, [session, status, router])

  useEffect(() => {
    fetch("/api/pipeline-stages")
      .then((r) => r.json())
      .then((data) => setStages(data))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (editingId && inputRef.current) inputRef.current.focus()
  }, [editingId])

  async function startEdit(stage: PipelineStage) {
    setEditingId(stage.id)
    setEditName(stage.name)
    setError(null)
  }

  async function saveEdit(id: string) {
    if (!editName.trim()) { setEditingId(null); return }
    setSaving(true)
    try {
      const res = await fetch(`/api/pipeline-stages/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editName.trim() }),
      })
      if (!res.ok) throw new Error("Erro ao salvar")
      const updated = await res.json()
      setStages((prev) => prev.map((s) => (s.id === id ? updated : s)))
      setEditingId(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao salvar")
    } finally {
      setSaving(false)
    }
  }

  async function deleteStage(id: string) {
    setError(null)
    const res = await fetch(`/api/pipeline-stages/${id}`, { method: "DELETE" })
    const data = await res.json()
    if (!res.ok) {
      setError(data.error ?? "Erro ao excluir")
      return
    }
    setStages((prev) => prev.filter((s) => s.id !== id))
  }

  async function move(index: number, direction: "up" | "down") {
    const newStages = [...stages]
    const swapIndex = direction === "up" ? index - 1 : index + 1
    if (swapIndex < 0 || swapIndex >= newStages.length) return
    ;[newStages[index], newStages[swapIndex]] = [newStages[swapIndex], newStages[index]]
    const reordered = newStages.map((s, i) => ({ ...s, position: i }))
    setStages(reordered)
    await fetch("/api/pipeline-stages/reorder", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stages: reordered.map(({ id, position }) => ({ id, position })) }),
    })
  }

  async function createStage() {
    if (!newName.trim()) return
    setSaving(true)
    setError(null)
    try {
      const res = await fetch("/api/pipeline-stages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim() }),
      })
      if (!res.ok) throw new Error("Erro ao criar etapa")
      const created = await res.json()
      setStages((prev) => [...prev, created])
      setNewName("")
      setAddingNew(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao criar")
    } finally {
      setSaving(false)
    }
  }

  if (status === "loading" || loading) {
    return <p className="text-sm text-gray-500">Carregando...</p>
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Etapas do Pipeline</h2>
        <p className="mt-1 text-sm text-gray-500">
          Configure as etapas do funil de leads. As alterações refletem imediatamente no CRM.
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="rounded-xl border border-gray-200 bg-white divide-y divide-gray-100">
        {stages.map((stage, index) => (
          <div key={stage.id} className="flex items-center gap-3 px-4 py-3">
            <GripVertical className="h-4 w-4 text-gray-300 shrink-0" />

            <div className="flex-1 min-w-0">
              {editingId === stage.id ? (
                <div className="flex items-center gap-2">
                  <input
                    ref={inputRef}
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") saveEdit(stage.id)
                      if (e.key === "Escape") setEditingId(null)
                    }}
                    className="flex-1 rounded-md border border-gray-300 bg-white px-2 py-1 text-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-purple-500"
                    disabled={saving}
                  />
                  <button
                    type="button"
                    onClick={() => saveEdit(stage.id)}
                    disabled={saving}
                    className="p-1 rounded text-purple-600 hover:bg-purple-50"
                  >
                    <Check className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingId(null)}
                    className="p-1 rounded text-gray-500 hover:bg-gray-100"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2 group">
                  <span className="text-sm font-medium text-gray-900">{stage.name}</span>
                  <button
                    type="button"
                    onClick={() => startEdit(stage)}
                    className="opacity-0 group-hover:opacity-100 p-1 rounded text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-opacity"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={() => move(index, "up")}
                disabled={index === 0}
                className="p-1 rounded text-gray-400 hover:text-gray-700 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronUp className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => move(index, "down")}
                disabled={index === stages.length - 1}
                className="p-1 rounded text-gray-400 hover:text-gray-700 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronDown className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => deleteStage(stage.id)}
                className="p-1 rounded text-gray-400 hover:text-red-600 hover:bg-red-50"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}

        {addingNew && (
          <div className="flex items-center gap-3 px-4 py-3">
            <GripVertical className="h-4 w-4 text-gray-200 shrink-0" />
            <input
              autoFocus
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") createStage()
                if (e.key === "Escape") { setAddingNew(false); setNewName("") }
              }}
              placeholder="Nome da etapa..."
              className="flex-1 rounded-md border border-gray-300 bg-white px-2 py-1 text-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-purple-500"
              disabled={saving}
            />
            <button type="button" onClick={createStage} disabled={saving || !newName.trim()} className="p-1 rounded text-purple-600 hover:bg-purple-50 disabled:opacity-40">
              <Check className="h-4 w-4" />
            </button>
            <button type="button" onClick={() => { setAddingNew(false); setNewName("") }} className="p-1 rounded text-gray-500 hover:bg-gray-100">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      {!addingNew && (
        <Button variant="outline" onClick={() => setAddingNew(true)} size="md">
          <Plus className="h-4 w-4" />
          Nova etapa
        </Button>
      )}
    </div>
  )
}
