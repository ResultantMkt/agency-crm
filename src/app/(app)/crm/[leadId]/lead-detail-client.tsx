"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import type { Lead } from "@/types/models"

interface LeadDetailClientProps {
  lead: Lead
}

export function LeadDetailClient({ lead }: LeadDetailClientProps) {
  const [notes, setNotes] = useState(lead.notes ?? "")
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSave() {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/leads/${lead.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes }),
      })
      if (!res.ok) throw new Error("Erro ao salvar notas")
      setEditing(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido")
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="bg-gray-800/60 border border-gray-700/50 rounded-lg px-4 py-4">
      <div className="flex items-center justify-between mb-2">
        <Label className="text-sm font-semibold text-white">Notas</Label>
        {!editing ? (
          <Button variant="ghost" size="sm" onClick={() => setEditing(true)}>
            Editar
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setNotes(lead.notes ?? "")
                setEditing(false)
                setError(null)
              }}
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button size="sm" onClick={handleSave} disabled={saving}>
              {saving ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        )}
      </div>

      {editing ? (
        <>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Observações sobre o lead..."
            rows={4}
          />
          {error && <p className="text-xs text-red-400 mt-1.5">{error}</p>}
        </>
      ) : (
        <p className="text-sm text-gray-400 whitespace-pre-wrap">
          {notes || <span className="italic text-gray-600">Sem notas.</span>}
        </p>
      )}
    </section>
  )
}
