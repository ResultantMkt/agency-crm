"use client"

import { useState } from "react"
import { MessageSquare, Check, X } from "lucide-react"
import { cn, formatDate } from "@/lib/utils"
import type { LeadHistory, LeadStage } from "@/types/models"

const STAGE_LABELS: Record<LeadStage, string> = {
  LEAD: "Lead",
  MQL: "MQL",
  SCREENING_SCHEDULED: "Triagem Agendada",
  SCREENING_DONE: "Triagem Realizada",
  CLOSING_MEETING: "Reunião de Fechamento",
  PROPOSAL_SENT: "Proposta Enviada",
  CLOSED: "Fechamento",
  LOST: "Perdido",
}

const STAGE_COLORS: Record<LeadStage, string> = {
  LEAD: "bg-gray-500/20 text-gray-400",
  MQL: "bg-blue-500/20 text-blue-400",
  SCREENING_SCHEDULED: "bg-yellow-500/20 text-yellow-400",
  SCREENING_DONE: "bg-orange-500/20 text-orange-400",
  CLOSING_MEETING: "bg-violet-500/20 text-violet-400",
  PROPOSAL_SENT: "bg-purple-500/20 text-purple-400",
  CLOSED: "bg-emerald-500/20 text-emerald-400",
  LOST: "bg-red-500/20 text-red-400",
}

interface Props {
  leadId: string
  initialHistory: LeadHistory[]
}

function HistoryItem({ item, leadId, onUpdate }: {
  item: LeadHistory
  leadId: string
  onUpdate: (updated: LeadHistory) => void
}) {
  const [editing, setEditing] = useState(false)
  const [text, setText] = useState(item.comment ?? "")
  const [saving, setSaving] = useState(false)

  async function save() {
    setSaving(true)
    try {
      const res = await fetch(`/api/leads/${leadId}/history/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ comment: text }),
      })
      if (res.ok) {
        const updated = await res.json()
        onUpdate(updated)
        setEditing(false)
      }
    } finally {
      setSaving(false)
    }
  }

  function cancel() {
    setText(item.comment ?? "")
    setEditing(false)
  }

  return (
    <li className="ml-4">
      <div className="absolute -left-1.5 mt-1.5 h-3 w-3 rounded-full bg-blue-500 border-2 border-gray-900" />
      <div className="bg-gray-800/60 border border-gray-700/50 rounded-lg px-4 py-3">
        {/* Stage badges */}
        <div className="flex items-center gap-2 flex-wrap">
          {item.fromStage && (
            <>
              <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium", STAGE_COLORS[item.fromStage])}>
                {STAGE_LABELS[item.fromStage]}
              </span>
              <span className="text-gray-500 text-xs">→</span>
            </>
          )}
          <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium", STAGE_COLORS[item.toStage])}>
            {STAGE_LABELS[item.toStage]}
          </span>
        </div>

        {/* Meta row */}
        <div className="flex items-center justify-between mt-1.5">
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span>{item.changedBy?.name ?? "Sistema"}</span>
            <span>·</span>
            <span>{formatDate(item.createdAt)}</span>
          </div>
          {!editing && (
            <button
              type="button"
              onClick={() => setEditing(true)}
              title={item.comment ? "Editar observação" : "Adicionar observação"}
              className="text-gray-600 hover:text-blue-400 transition-colors"
            >
              <MessageSquare className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* System note */}
        {item.note && (
          <p className="text-xs text-gray-400 mt-1.5">{item.note}</p>
        )}

        {/* User comment */}
        {!editing && item.comment && (
          <div className="mt-2 pt-2 border-t border-gray-700/50">
            <p className="text-xs text-gray-300 whitespace-pre-wrap">{item.comment}</p>
            <p className="text-[10px] text-gray-600 mt-1">
              {item.commentByName} · {item.commentAt ? formatDate(item.commentAt) : ""}
            </p>
          </div>
        )}

        {/* Inline comment editor */}
        {editing && (
          <div className="mt-2 pt-2 border-t border-gray-700/50 space-y-2">
            <textarea
              autoFocus
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Escreva uma observação..."
              rows={3}
              className="w-full text-xs bg-gray-900/60 border border-gray-600 rounded-md px-3 py-2 text-gray-200 placeholder:text-gray-600 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
            />
            <div className="flex items-center gap-2 justify-end">
              <button
                type="button"
                onClick={cancel}
                disabled={saving}
                className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-300 transition-colors"
              >
                <X className="h-3 w-3" />
                Cancelar
              </button>
              <button
                type="button"
                onClick={save}
                disabled={saving}
                className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 transition-colors disabled:opacity-50"
              >
                <Check className="h-3 w-3" />
                {saving ? "Salvando…" : "Salvar"}
              </button>
            </div>
          </div>
        )}
      </div>
    </li>
  )
}

export function LeadHistoryClient({ leadId, initialHistory }: Props) {
  const [history, setHistory] = useState<LeadHistory[]>(initialHistory)

  function handleUpdate(updated: LeadHistory) {
    setHistory((prev) => prev.map((h) => (h.id === updated.id ? updated : h)))
  }

  if (history.length === 0) {
    return <p className="text-sm text-gray-500">Nenhum histórico de mudança de estágio.</p>
  }

  return (
    <ol className="relative border-l border-gray-700 ml-3 space-y-4">
      {history.map((h) => (
        <HistoryItem key={h.id} item={h} leadId={leadId} onUpdate={handleUpdate} />
      ))}
    </ol>
  )
}
