"use client"

import { useState } from "react"
import { Phone, DollarSign, User, Calendar, Check, X } from "lucide-react"
import type { Lead, LeadSource, User as UserType } from "@/types/models"
import { formatCurrency, formatDate } from "@/lib/utils"

const SOURCE_LABELS: Record<LeadSource, string> = {
  TRAFFIC: "Tráfego pago",
  PROSPECTING: "Prospecção ativa",
  REFERRAL: "Indicação",
  OTHER: "Outro",
}

const SOURCE_OPTIONS: { value: LeadSource; label: string }[] = [
  { value: "TRAFFIC", label: "Tráfego pago" },
  { value: "PROSPECTING", label: "Prospecção ativa" },
  { value: "REFERRAL", label: "Indicação" },
  { value: "OTHER", label: "Outro" },
]

interface LeadInfoClientProps {
  lead: Lead
  users: UserType[]
}

type EditingField = "source" | "estimatedValue" | "assignedTo" | null

export function LeadInfoClient({ lead, users }: LeadInfoClientProps) {
  const [source, setSource] = useState<LeadSource>(lead.source)
  const [estimatedValue, setEstimatedValue] = useState<string>(
    lead.estimatedValue ? parseFloat(lead.estimatedValue).toString() : ""
  )
  const [assignedToId, setAssignedToId] = useState<string | null>(lead.assignedToId ?? null)
  const [editingField, setEditingField] = useState<EditingField>(null)
  const [tempValue, setTempValue] = useState<string>("")
  const [saving, setSaving] = useState(false)

  const assignedUser = users.find((u) => u.id === assignedToId)
  const assignedName = assignedUser?.name ?? lead.assignedTo?.name ?? null

  async function patch(data: Record<string, unknown>) {
    setSaving(true)
    try {
      await fetch(`/api/leads/${lead.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
    } finally {
      setSaving(false)
    }
  }

  async function handleSourceChange(newSource: LeadSource) {
    setSource(newSource)
    setEditingField(null)
    await patch({ source: newSource })
  }

  async function handleEstimatedValueSave() {
    const trimmed = tempValue.trim().replace(",", ".")
    const num = trimmed ? parseFloat(trimmed) : null
    if (trimmed && (isNaN(num!) || num! <= 0)) {
      setEditingField(null)
      return
    }
    setEstimatedValue(num ? num.toString() : "")
    setEditingField(null)
    await patch({ estimatedValue: num ?? null })
  }

  async function handleAssignedToChange(newId: string | null) {
    setAssignedToId(newId)
    setEditingField(null)
    await patch({ assignedToId: newId ?? null })
  }

  function startEditing(field: EditingField, initial = "") {
    setTempValue(initial)
    setEditingField(field)
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {/* Origem */}
      <InfoCardShell icon={<Phone className="h-4 w-4" />} label="Origem">
        {editingField === "source" ? (
          <select
            autoFocus
            className="w-full text-sm bg-gray-700 text-white rounded px-1.5 py-1 border border-gray-600 focus:outline-none focus:ring-1 focus:ring-blue-500"
            value={source}
            onChange={(e) => handleSourceChange(e.target.value as LeadSource)}
            onBlur={() => setEditingField(null)}
          >
            {SOURCE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        ) : (
          <EditableValue
            onClick={() => setEditingField("source")}
            saving={saving && editingField === null}
          >
            {SOURCE_LABELS[source]}
          </EditableValue>
        )}
      </InfoCardShell>

      {/* Valor estimado */}
      <InfoCardShell icon={<DollarSign className="h-4 w-4" />} label="Valor estimado">
        {editingField === "estimatedValue" ? (
          <div className="flex items-center gap-1">
            <input
              autoFocus
              type="number"
              min="0"
              step="0.01"
              placeholder="0.00"
              className="w-full text-sm bg-gray-700 text-white rounded px-1.5 py-1 border border-gray-600 focus:outline-none focus:ring-1 focus:ring-blue-500"
              value={tempValue}
              onChange={(e) => setTempValue(e.target.value)}
              onBlur={handleEstimatedValueSave}
              onKeyDown={(e) => {
                if (e.key === "Enter") { e.preventDefault(); handleEstimatedValueSave() }
                if (e.key === "Escape") setEditingField(null)
              }}
            />
          </div>
        ) : (
          <EditableValue
            onClick={() => startEditing("estimatedValue", estimatedValue)}
            saving={saving && editingField === null}
            empty={!estimatedValue}
          >
            {estimatedValue
              ? formatCurrency(parseFloat(estimatedValue))
              : "Não definido"}
          </EditableValue>
        )}
      </InfoCardShell>

      {/* Responsável */}
      <InfoCardShell icon={<User className="h-4 w-4" />} label="Responsável">
        {editingField === "assignedTo" ? (
          <select
            autoFocus
            className="w-full text-sm bg-gray-700 text-white rounded px-1.5 py-1 border border-gray-600 focus:outline-none focus:ring-1 focus:ring-blue-500"
            value={assignedToId ?? ""}
            onChange={(e) => handleAssignedToChange(e.target.value || null)}
            onBlur={() => setEditingField(null)}
          >
            <option value="">Sem responsável</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
          </select>
        ) : (
          <EditableValue
            onClick={() => setEditingField("assignedTo")}
            saving={saving && editingField === null}
            empty={!assignedToId}
          >
            {assignedName ?? "Não atribuído"}
          </EditableValue>
        )}
      </InfoCardShell>

      {/* Criado em — somente leitura */}
      <InfoCardShell icon={<Calendar className="h-4 w-4" />} label="Criado em">
        <p className="text-sm font-medium text-white truncate">{formatDate(lead.createdAt)}</p>
      </InfoCardShell>
    </div>
  )
}

function InfoCardShell({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="bg-gray-800/60 border border-gray-700/50 rounded-lg px-4 py-3">
      <div className="flex items-center gap-2 text-gray-400 mb-1">
        {icon}
        <span className="text-xs">{label}</span>
      </div>
      {children}
    </div>
  )
}

function EditableValue({
  children,
  onClick,
  saving,
  empty,
}: {
  children: React.ReactNode
  onClick: () => void
  saving?: boolean
  empty?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title="Clique para editar"
      className={`text-sm font-medium truncate w-full text-left transition-colors group flex items-center gap-1 ${
        empty ? "text-gray-500 italic" : "text-white"
      } hover:text-blue-400`}
    >
      <span className="truncate">{children}</span>
      <span className="shrink-0 opacity-0 group-hover:opacity-60 transition-opacity text-xs text-gray-400">✎</span>
    </button>
  )
}
