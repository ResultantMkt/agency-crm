"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { X, ExternalLink, Plus, Phone, User, Layers, FileText } from "lucide-react"
import type { Lead, LeadSource, LeadStage, User as UserType } from "@/types/models"

// ─── Constants ────────────────────────────────────────────────────────────────

const SOURCE_OPTIONS: { value: LeadSource; label: string }[] = [
  { value: "TRAFFIC", label: "Tráfego pago" },
  { value: "PROSPECTING", label: "Prospecção ativa" },
  { value: "REFERRAL", label: "Indicação" },
  { value: "OTHER", label: "Outro" },
]

const SOURCE_LABELS: Record<LeadSource, string> = {
  TRAFFIC: "Tráfego pago",
  PROSPECTING: "Prospecção ativa",
  REFERRAL: "Indicação",
  OTHER: "Outro",
}

const STAGE_LABELS: Record<LeadStage, string> = {
  LEAD: "Lead",
  MQL: "MQL",
  SCREENING_SCHEDULED: "Triagem Agendada",
  SCREENING_DONE: "Triagem Realizada",
  CLOSING_MEETING: "Reun. Fechamento",
  PROPOSAL_SENT: "Proposta Enviada",
  CLOSED: "Fechamento",
  LOST: "Perdido",
}

const STAGE_COLORS: Record<LeadStage, string> = {
  LEAD: "bg-gray-600 text-gray-200",
  MQL: "bg-blue-600/70 text-blue-200",
  SCREENING_SCHEDULED: "bg-indigo-600/70 text-indigo-200",
  SCREENING_DONE: "bg-violet-600/70 text-violet-200",
  CLOSING_MEETING: "bg-purple-600/70 text-purple-200",
  PROPOSAL_SENT: "bg-amber-600/70 text-amber-200",
  CLOSED: "bg-green-600/70 text-green-200",
  LOST: "bg-red-600/70 text-red-200",
}

function getInitials(name: string) {
  return name.split(" ").slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("")
}

const AVATAR_COLORS = [
  "bg-blue-600", "bg-purple-600", "bg-green-600", "bg-orange-600",
  "bg-pink-600", "bg-teal-600", "bg-red-600", "bg-indigo-600",
]

function avatarColor(name: string) {
  let h = 0
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h)
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length]
}

// ─── Inline editable field ────────────────────────────────────────────────────

function FieldRow({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-gray-700/40 last:border-0">
      <span className="text-gray-500 mt-0.5 shrink-0">{icon}</span>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] text-gray-500 uppercase tracking-wide mb-0.5">{label}</p>
        {children}
      </div>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface ContactPanelProps {
  conversationId: string
  name: string
  phone: string
  photoUrl?: string | null
  onClose: () => void
}

export function ContactPanel({ conversationId, name, phone, photoUrl, onClose }: ContactPanelProps) {
  const router = useRouter()
  const [lead, setLead] = useState<(Lead & { assignedTo?: { id: string; name: string } | null }) | null>(null)
  const [users, setUsers] = useState<UserType[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [imgError, setImgError] = useState(false)

  // Editable fields
  const [source, setSource] = useState<LeadSource>("OTHER")
  const [assignedToId, setAssignedToId] = useState<string | null>(null)
  const [editingField, setEditingField] = useState<"source" | "assignedTo" | null>(null)
  const [saving, setSaving] = useState(false)

  // Notes
  const [notes, setNotes] = useState("")
  const [notesSaved, setNotesSaved] = useState(false)
  const notesDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    setLoading(true)
    fetch(`/api/conversations/${conversationId}/lead`)
      .then((r) => r.ok ? r.json() : { lead: null, users: [] })
      .then(({ lead: l, users: u }) => {
        setLead(l)
        setUsers(u)
        if (l) {
          setSource(l.source)
          setAssignedToId(l.assignedToId ?? null)
          setNotes(l.notes ?? "")
        }
      })
      .finally(() => setLoading(false))
  }, [conversationId])

  async function patchLead(data: Record<string, unknown>) {
    if (!lead) return
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

  async function handleSourceChange(v: LeadSource) {
    setSource(v)
    setEditingField(null)
    await patchLead({ source: v })
  }

  async function handleAssignedToChange(v: string | null) {
    setAssignedToId(v)
    setEditingField(null)
    await patchLead({ assignedToId: v ?? null })
  }

  async function createLead() {
    setCreating(true)
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone, source: "OTHER", stage: "LEAD" }),
      })
      if (!res.ok) return
      const newLead = await res.json()
      // Link conversation to the new lead
      await fetch(`/api/conversations/${conversationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId: newLead.id }),
      })
      setLead(newLead)
      setSource(newLead.source)
      setAssignedToId(newLead.assignedToId ?? null)
      setNotes(newLead.notes ?? "")
    } finally {
      setCreating(false)
    }
  }

  function handleNotesChange(value: string) {
    setNotes(value)
    setNotesSaved(false)
    if (notesDebounceRef.current) clearTimeout(notesDebounceRef.current)
    notesDebounceRef.current = setTimeout(async () => {
      await patchLead({ notes: value || null })
      setNotesSaved(true)
      setTimeout(() => setNotesSaved(false), 2000)
    }, 800)
  }

  const assignedUser = users.find((u) => u.id === assignedToId)
  const assignedName = assignedUser?.name ?? lead?.assignedTo?.name ?? null

  return (
    <div className="w-64 shrink-0 flex flex-col border-l border-gray-700/50 bg-gray-800/40 overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700/50">
        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Contato</span>
        <button type="button" onClick={onClose} className="p-1 text-gray-500 hover:text-gray-300 rounded transition-colors">
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Avatar + identity */}
      <div className="flex flex-col items-center gap-2 px-4 py-5 border-b border-gray-700/50">
        {photoUrl && !imgError ? (
          <img src={photoUrl} alt={name} onError={() => setImgError(true)} className="h-16 w-16 rounded-full object-cover" />
        ) : (
          <div className={`h-16 w-16 rounded-full flex items-center justify-center text-white text-xl font-bold ${avatarColor(name)}`}>
            {getInitials(name) || "?"}
          </div>
        )}
        <div className="text-center">
          <p className="text-sm font-semibold text-white">{name}</p>
          <p className="text-xs text-gray-500 mt-0.5">{phone}</p>
        </div>
      </div>

      {/* Lead info */}
      <div className="flex-1 px-4 py-3">
        {loading ? (
          <div className="space-y-3 mt-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-8 rounded bg-gray-700/40 animate-pulse" />
            ))}
          </div>
        ) : lead ? (
          <>
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-3">Lead vinculado</p>

            <FieldRow icon={<Layers className="h-3.5 w-3.5" />} label="Etapa">
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${STAGE_COLORS[lead.stage]}`}>
                {STAGE_LABELS[lead.stage]}
              </span>
            </FieldRow>

            <FieldRow icon={<Phone className="h-3.5 w-3.5" />} label="Origem">
              {editingField === "source" ? (
                <select
                  autoFocus
                  className="w-full text-xs bg-gray-700 text-white rounded px-1.5 py-1 border border-gray-600 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  value={source}
                  onChange={(e) => handleSourceChange(e.target.value as LeadSource)}
                  onBlur={() => setEditingField(null)}
                >
                  {SOURCE_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              ) : (
                <button
                  type="button"
                  onClick={() => setEditingField("source")}
                  className="text-sm text-white hover:text-blue-400 text-left flex items-center gap-1 group transition-colors"
                >
                  {SOURCE_LABELS[source]}
                  <span className="opacity-0 group-hover:opacity-60 text-xs text-gray-400">✎</span>
                </button>
              )}
            </FieldRow>

            <FieldRow icon={<User className="h-3.5 w-3.5" />} label="Responsável">
              {editingField === "assignedTo" ? (
                <select
                  autoFocus
                  className="w-full text-xs bg-gray-700 text-white rounded px-1.5 py-1 border border-gray-600 focus:outline-none focus:ring-1 focus:ring-blue-500"
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
                <button
                  type="button"
                  onClick={() => setEditingField("assignedTo")}
                  className={`text-sm text-left flex items-center gap-1 group transition-colors ${assignedName ? "text-white hover:text-blue-400" : "text-gray-500 italic hover:text-blue-400"}`}
                >
                  {assignedName ?? "Não atribuído"}
                  <span className="opacity-0 group-hover:opacity-60 text-xs text-gray-400">✎</span>
                </button>
              )}
            </FieldRow>

            {lead.estimatedValue && (
              <FieldRow icon={<span className="text-xs text-gray-500 font-bold">R$</span>} label="Valor estimado">
                <p className="text-sm text-white">
                  {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(parseFloat(lead.estimatedValue))}
                </p>
              </FieldRow>
            )}

            {/* Notes */}
            <div className="mt-4">
              <div className="flex items-center gap-1.5 mb-1.5">
                <FileText className="h-3.5 w-3.5 text-gray-500" />
                <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Notas</span>
                {notesSaved && <span className="ml-auto text-[10px] text-green-500">Salvo</span>}
              </div>
              <textarea
                value={notes}
                onChange={(e) => handleNotesChange(e.target.value)}
                placeholder="Adicione uma nota sobre este contato..."
                rows={4}
                className="w-full text-xs bg-gray-800/60 border border-gray-700 text-white rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-1 focus:ring-blue-500 placeholder:text-gray-600"
              />
            </div>

            <div className="mt-3">
              <button
                type="button"
                onClick={() => router.push(`/crm/${lead.id}`)}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-gray-700/50 hover:bg-gray-700 text-sm text-gray-300 hover:text-white border border-gray-600/50 transition-colors"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Ver no CRM
              </button>
            </div>

            {saving && <p className="text-[10px] text-gray-500 mt-2 text-center">Salvando...</p>}
          </>
        ) : (
          <div className="text-center pt-4 space-y-3">
            <p className="text-sm text-gray-500">Nenhum lead vinculado a este número.</p>
            <button
              type="button"
              onClick={createLead}
              disabled={creating}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-sm text-white transition-colors disabled:opacity-50"
            >
              <Plus className="h-4 w-4" />
              {creating ? "Criando..." : "Criar lead"}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
