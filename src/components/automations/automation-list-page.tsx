"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import {
  Zap,
  Plus,
  Pencil,
  Copy,
  Trash2,
  ChevronDown,
  ChevronUp,
  Tag,
  X,
  Check,
} from "lucide-react"
import { cn } from "@/lib/utils"

// ─── Types ────────────────────────────────────────────────────────────────────

interface Label {
  id: string
  name: string
  color: string
}

interface Automation {
  id: string
  name: string
  description: string | null
  active: boolean
  trigger: { type: string; config: Record<string, unknown> }
  steps: unknown[]
  runCount: number
  lastRunAt: string | null
  createdAt: string
  updatedAt: string
  labels: Label[]
}

interface Run {
  id: string
  automationId: string
  leadId: string | null
  leadName: string | null
  triggerType: string
  triggerData: unknown
  status: string
  stepResults: unknown[]
  createdAt: string
  automation: { name: string }
}

interface Sequence {
  id: string
  name: string
  description: string | null
  createdAt: string
  _count: { steps: number }
}

interface Template {
  id: string
  name: string
  body: string
  sequenceId: string | null
  createdAt: string
  sequence: { id: string; name: string } | null
}

// ─── Trigger labels ───────────────────────────────────────────────────────────

const TRIGGER_LABELS: Record<string, string> = {
  "lead.created": "Lead criado",
  "lead.stage_changed": "Etapa alterada",
  "lead.won": "Lead ganho",
  "lead.lost": "Lead perdido",
  "lead.updated": "Lead atualizado",
  "lead.updated_any": "Lead atualizado (qualquer)",
  "activity.created": "Atividade criada",
  "form.submitted": "Formulário enviado",
}

const STATUS_COLORS: Record<string, string> = {
  SUCCESS: "bg-green-100 text-green-700",
  SKIPPED: "bg-gray-100 text-gray-600",
  PARTIAL_ERROR: "bg-yellow-100 text-yellow-700",
  FAILED: "bg-red-100 text-red-700",
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

// ─── Sequence Modal ───────────────────────────────────────────────────────────

interface SequenceStep {
  id?: string
  title: string
  type: string
  script: string
  delayDays: number
  delayHours: number
  anchorField: string
}

function SequenceModal({
  sequence,
  onClose,
  onSaved,
}: {
  sequence: Partial<Sequence> | null
  onClose: () => void
  onSaved: () => void
}) {
  const isEdit = !!sequence?.id
  const [name, setName] = useState(sequence?.name ?? "")
  const [description, setDescription] = useState(sequence?.description ?? "")
  const [steps, setSteps] = useState<SequenceStep[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (isEdit && sequence?.id) {
      fetch(`/api/sequences/${sequence.id}`)
        .then((r) => r.json())
        .then((d) => {
          if (d.steps) setSteps(d.steps)
        })
        .catch(() => {})
    }
  }, [isEdit, sequence?.id])

  function addStep() {
    setSteps((prev) => [
      ...prev,
      { title: "", type: "TASK", script: "", delayDays: 0, delayHours: 0, anchorField: "" },
    ])
  }

  function removeStep(i: number) {
    setSteps((prev) => prev.filter((_, idx) => idx !== i))
  }

  function updateStep(i: number, field: keyof SequenceStep, value: string | number) {
    setSteps((prev) => prev.map((s, idx) => (idx === i ? { ...s, [field]: value } : s)))
  }

  async function save() {
    if (!name.trim()) return
    setLoading(true)
    try {
      const url = isEdit ? `/api/sequences/${sequence!.id}` : "/api/sequences"
      const method = isEdit ? "PATCH" : "POST"
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description, steps }),
      })
      if (res.ok) {
        onSaved()
        onClose()
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-2xl rounded-xl bg-white shadow-xl overflow-hidden">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <h2 className="text-base font-semibold text-gray-900">
            {isEdit ? "Editar Sequência" : "Nova Sequência"}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none"
              placeholder="Nome da sequência"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none"
              placeholder="Opcional"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Passos</span>
              <button
                onClick={addStep}
                className="flex items-center gap-1 rounded-lg bg-purple-50 px-3 py-1.5 text-xs font-medium text-purple-700 hover:bg-purple-100"
              >
                <Plus className="h-3 w-3" /> Adicionar passo
              </button>
            </div>
            <div className="space-y-3">
              {steps.map((step, i) => (
                <div key={i} className="rounded-lg border border-gray-200 p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-gray-500 w-6">{i + 1}.</span>
                    <input
                      value={step.title}
                      onChange={(e) => updateStep(i, "title", e.target.value)}
                      className="flex-1 rounded-lg border border-gray-300 px-2 py-1.5 text-sm focus:border-purple-500 focus:outline-none"
                      placeholder="Título do passo"
                    />
                    <select
                      value={step.type}
                      onChange={(e) => updateStep(i, "type", e.target.value)}
                      className="rounded-lg border border-gray-300 px-2 py-1.5 text-sm focus:border-purple-500 focus:outline-none"
                    >
                      <option value="TASK">Tarefa</option>
                      <option value="CALL">Ligação</option>
                      <option value="WHATSAPP">WhatsApp</option>
                    </select>
                    <button onClick={() => removeStep(i)} className="text-red-400 hover:text-red-600">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  <textarea
                    value={step.script}
                    onChange={(e) => updateStep(i, "script", e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm focus:border-purple-500 focus:outline-none"
                    placeholder="Script / descrição"
                    rows={2}
                  />
                  <div className="flex gap-3">
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-gray-500">Atraso:</span>
                      <input
                        type="number"
                        min={0}
                        value={step.delayDays}
                        onChange={(e) => updateStep(i, "delayDays", parseInt(e.target.value) || 0)}
                        className="w-14 rounded-lg border border-gray-300 px-2 py-1 text-xs focus:border-purple-500 focus:outline-none"
                      />
                      <span className="text-xs text-gray-500">dias</span>
                      <input
                        type="number"
                        min={0}
                        value={step.delayHours}
                        onChange={(e) => updateStep(i, "delayHours", parseInt(e.target.value) || 0)}
                        className="w-14 rounded-lg border border-gray-300 px-2 py-1 text-xs focus:border-purple-500 focus:outline-none"
                      />
                      <span className="text-xs text-gray-500">horas</span>
                    </div>
                  </div>
                </div>
              ))}
              {steps.length === 0 && (
                <p className="text-sm text-gray-400 text-center py-4">Nenhum passo adicionado ainda.</p>
              )}
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-3 border-t border-gray-200 px-6 py-4">
          <button
            onClick={onClose}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancelar
          </button>
          <button
            onClick={save}
            disabled={loading || !name.trim()}
            className="rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-50"
          >
            {loading ? "Salvando..." : "Salvar"}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Template Modal ───────────────────────────────────────────────────────────

function TemplateModal({
  template,
  sequences,
  onClose,
  onSaved,
}: {
  template: Partial<Template> | null
  sequences: Sequence[]
  onClose: () => void
  onSaved: () => void
}) {
  const isEdit = !!template?.id
  const [name, setName] = useState(template?.name ?? "")
  const [body, setBody] = useState(template?.body ?? "")
  const [sequenceId, setSequenceId] = useState(template?.sequenceId ?? "")
  const [loading, setLoading] = useState(false)

  async function save() {
    if (!name.trim() || !body.trim()) return
    setLoading(true)
    try {
      const url = isEdit ? `/api/whatsapp-templates/${template!.id}` : "/api/whatsapp-templates"
      const method = isEdit ? "PATCH" : "POST"
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, body, sequenceId: sequenceId || null }),
      })
      if (res.ok) {
        onSaved()
        onClose()
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-lg rounded-xl bg-white shadow-xl overflow-hidden">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <h2 className="text-base font-semibold text-gray-900">
            {isEdit ? "Editar Template" : "Novo Template WhatsApp"}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none"
              placeholder="Ex: Boas-vindas"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Mensagem</label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none"
              placeholder="Olá [NOME], tudo bem? Somos da [EMPRESA]..."
              rows={4}
            />
            <p className="mt-1 text-xs text-gray-400">Use [NOME], [EMPRESA] como variáveis</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Sequência (opcional)</label>
            <select
              value={sequenceId}
              onChange={(e) => setSequenceId(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none"
            >
              <option value="">Nenhuma</option>
              {sequences.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex justify-end gap-3 border-t border-gray-200 px-6 py-4">
          <button
            onClick={onClose}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancelar
          </button>
          <button
            onClick={save}
            disabled={loading || !name.trim() || !body.trim()}
            className="rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-50"
          >
            {loading ? "Salvando..." : "Salvar"}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Label Manager Modal ──────────────────────────────────────────────────────

function LabelManagerModal({
  labels,
  onClose,
  onSaved,
}: {
  labels: Label[]
  onClose: () => void
  onSaved: () => void
}) {
  const [list, setList] = useState<Label[]>(labels)
  const [newName, setNewName] = useState("")
  const [newColor, setNewColor] = useState("#6366f1")
  const [saving, setSaving] = useState(false)

  async function createLabel() {
    if (!newName.trim()) return
    setSaving(true)
    try {
      const res = await fetch("/api/automations/labels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName, color: newColor }),
      })
      if (res.ok) {
        const label = await res.json()
        setList((prev) => [...prev, label])
        setNewName("")
        onSaved()
      }
    } finally {
      setSaving(false)
    }
  }

  async function deleteLabel(id: string) {
    const res = await fetch(`/api/automations/labels/${id}`, { method: "DELETE" })
    if (res.ok) {
      setList((prev) => prev.filter((l) => l.id !== id))
      onSaved()
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-md rounded-xl bg-white shadow-xl overflow-hidden">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <h2 className="text-base font-semibold text-gray-900">Gerenciar Etiquetas</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div className="flex gap-2">
            <input
              type="color"
              value={newColor}
              onChange={(e) => setNewColor(e.target.value)}
              className="h-9 w-10 rounded border border-gray-300 cursor-pointer"
            />
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && createLabel()}
              className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none"
              placeholder="Nome da etiqueta"
            />
            <button
              onClick={createLabel}
              disabled={saving || !newName.trim()}
              className="rounded-lg bg-purple-600 px-3 py-2 text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-50"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {list.map((label) => (
              <div key={label.id} className="flex items-center justify-between rounded-lg border border-gray-200 px-3 py-2">
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full" style={{ background: label.color }} />
                  <span className="text-sm text-gray-700">{label.name}</span>
                </div>
                <button
                  onClick={() => deleteLabel(label.id)}
                  className="text-gray-400 hover:text-red-500"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
            {list.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-4">Nenhuma etiqueta criada.</p>
            )}
          </div>
        </div>
        <div className="flex justify-end border-t border-gray-200 px-6 py-4">
          <button
            onClick={onClose}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function AutomationListPage() {
  const router = useRouter()
  const { data: session } = useSession()
  const isAdmin = session?.user?.role === "ADMIN"

  const [tab, setTab] = useState<"automations" | "history" | "sequences" | "templates">("automations")
  const [automations, setAutomations] = useState<Automation[]>([])
  const [runs, setRuns] = useState<Run[]>([])
  const [labels, setLabels] = useState<Label[]>([])
  const [sequences, setSequences] = useState<Sequence[]>([])
  const [templates, setTemplates] = useState<Template[]>([])
  const [selectedLabelId, setSelectedLabelId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [expandedRunId, setExpandedRunId] = useState<string | null>(null)

  // Modals
  const [sequenceModal, setSequenceModal] = useState<Partial<Sequence> | null | false>(false)
  const [templateModal, setTemplateModal] = useState<Partial<Template> | null | false>(false)
  const [labelManagerOpen, setLabelManagerOpen] = useState(false)

  const fetchAll = useCallback(async () => {
    const url = selectedLabelId ? `/api/automations?labelId=${selectedLabelId}` : "/api/automations"
    const [autoRes, runsRes, labelsRes, seqRes, tplRes] = await Promise.all([
      fetch(url),
      fetch("/api/automations/runs"),
      fetch("/api/automations/labels"),
      fetch("/api/sequences"),
      fetch("/api/whatsapp-templates"),
    ])
    const [autoData, runsData, labelsData, seqData, tplData] = await Promise.all([
      autoRes.json(),
      runsRes.json(),
      labelsRes.json(),
      seqRes.json(),
      tplRes.json(),
    ])
    setAutomations(Array.isArray(autoData) ? autoData : [])
    setRuns(Array.isArray(runsData?.runs) ? runsData.runs : [])
    setLabels(Array.isArray(labelsData) ? labelsData : [])
    setSequences(Array.isArray(seqData) ? seqData : [])
    setTemplates(Array.isArray(tplData) ? tplData : [])
    setLoading(false)
  }, [selectedLabelId])

  useEffect(() => { fetchAll() }, [fetchAll])

  async function createAutomation() {
    if (!isAdmin) return
    setCreating(true)
    try {
      const res = await fetch("/api/automations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Nova Automação" }),
      })
      if (res.ok) {
        const data = await res.json()
        router.push(`/comercial/automacoes/${data.id}`)
      }
    } finally {
      setCreating(false)
    }
  }

  async function toggleActive(automation: Automation) {
    if (!isAdmin) return
    await fetch(`/api/automations/${automation.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !automation.active }),
    })
    fetchAll()
  }

  async function duplicateAutomation(id: string) {
    if (!isAdmin) return
    await fetch(`/api/automations/${id}/duplicate`, { method: "POST" })
    fetchAll()
  }

  async function deleteAutomation(id: string) {
    if (!isAdmin || !confirm("Excluir esta automação?")) return
    await fetch(`/api/automations/${id}`, { method: "DELETE" })
    fetchAll()
  }

  async function deleteSequence(id: string) {
    if (!isAdmin || !confirm("Excluir esta sequência?")) return
    await fetch(`/api/sequences/${id}`, { method: "DELETE" })
    fetchAll()
  }

  async function deleteTemplate(id: string) {
    if (!isAdmin || !confirm("Excluir este template?")) return
    await fetch(`/api/whatsapp-templates/${id}`, { method: "DELETE" })
    fetchAll()
  }

  const totalRuns = automations.reduce((s, a) => s + a.runCount, 0)
  const activeCount = automations.filter((a) => a.active).length

  const TABS = [
    { key: "automations", label: "Minhas Automações" },
    { key: "history", label: "Histórico" },
    { key: "sequences", label: "Sequências" },
    { key: "templates", label: "Templates WhatsApp" },
  ] as const

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Modals */}
      {sequenceModal !== false && (
        <SequenceModal
          sequence={sequenceModal}
          onClose={() => setSequenceModal(false)}
          onSaved={fetchAll}
        />
      )}
      {templateModal !== false && (
        <TemplateModal
          template={templateModal}
          sequences={sequences}
          onClose={() => setTemplateModal(false)}
          onSaved={fetchAll}
        />
      )}
      {labelManagerOpen && (
        <LabelManagerModal
          labels={labels}
          onClose={() => setLabelManagerOpen(false)}
          onSaved={fetchAll}
        />
      )}

      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-600">
            <Zap className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Automações</h1>
            <p className="text-sm text-gray-500">Automatize ações do seu funil de vendas</p>
          </div>
        </div>
        {isAdmin && (
          <button
            onClick={createAutomation}
            disabled={creating}
            className="flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-50"
          >
            <Plus className="h-4 w-4" />
            Nova Automação
          </button>
        )}
      </div>

      {/* Summary cards */}
      <div className="mb-6 grid grid-cols-3 gap-4">
        {[
          { label: "Total de Automações", value: automations.length },
          { label: "Ativas", value: activeCount },
          { label: "Execuções Totais", value: totalRuns },
        ].map((card) => (
          <div key={card.label} className="rounded-xl border border-gray-200 bg-white p-4">
            <p className="text-sm text-gray-500">{card.label}</p>
            <p className="mt-1 text-2xl font-bold text-gray-900">{card.value}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="mb-6 flex border-b border-gray-200">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              "px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors",
              tab === t.key
                ? "border-purple-600 text-purple-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-16 text-gray-400">Carregando...</div>
      ) : (
        <>
          {/* ─── Automations tab ─── */}
          {tab === "automations" && (
            <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
              {/* Label filters */}
              <div className="flex flex-wrap items-center gap-2 border-b border-gray-100 px-4 py-3">
                <button
                  onClick={() => setSelectedLabelId(null)}
                  className={cn(
                    "rounded-full px-3 py-1 text-xs font-medium",
                    selectedLabelId === null
                      ? "bg-purple-600 text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  )}
                >
                  Todas
                </button>
                {labels.map((l) => (
                  <button
                    key={l.id}
                    onClick={() => setSelectedLabelId(l.id === selectedLabelId ? null : l.id)}
                    className={cn(
                      "flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium border",
                      selectedLabelId === l.id ? "border-transparent text-white" : "border-gray-200 text-gray-600 hover:bg-gray-50"
                    )}
                    style={selectedLabelId === l.id ? { background: l.color } : {}}
                  >
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ background: selectedLabelId === l.id ? "#fff" : l.color }}
                    />
                    {l.name}
                  </button>
                ))}
                {isAdmin && (
                  <button
                    onClick={() => setLabelManagerOpen(true)}
                    className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 ml-auto"
                  >
                    <Tag className="h-3.5 w-3.5" /> Gerenciar etiquetas
                  </button>
                )}
              </div>

              {automations.length === 0 ? (
                <div className="py-16 text-center text-gray-400">
                  <Zap className="mx-auto h-10 w-10 mb-3 text-gray-300" />
                  <p className="font-medium text-gray-500">Nenhuma automação criada</p>
                  {isAdmin && (
                    <p className="text-sm mt-1">Clique em &quot;Nova Automação&quot; para começar</p>
                  )}
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100">
                      {isAdmin && <th className="px-4 py-3 text-left font-medium text-gray-500 w-16">Ativa</th>}
                      <th className="px-4 py-3 text-left font-medium text-gray-500">Nome</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-500">Status</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-500">Execuções</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-500">Última execução</th>
                      {isAdmin && <th className="px-4 py-3 text-right font-medium text-gray-500">Ações</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {automations.map((automation) => (
                      <tr key={automation.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                        {isAdmin && (
                          <td className="px-4 py-3">
                            <button
                              onClick={() => toggleActive(automation)}
                              className={cn(
                                "relative inline-flex h-5 w-9 rounded-full transition-colors",
                                automation.active ? "bg-purple-600" : "bg-gray-300"
                              )}
                            >
                              <span
                                className={cn(
                                  "absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform",
                                  automation.active && "translate-x-4"
                                )}
                              />
                            </button>
                          </td>
                        )}
                        <td className="px-4 py-3">
                          <div>
                            <span className="font-medium text-gray-900">{automation.name}</span>
                            {automation.trigger?.type && (
                              <span className="ml-2 rounded-full bg-purple-50 px-2 py-0.5 text-xs text-purple-600">
                                {TRIGGER_LABELS[automation.trigger.type] ?? automation.trigger.type}
                              </span>
                            )}
                          </div>
                          {automation.labels.length > 0 && (
                            <div className="flex gap-1 mt-1">
                              {automation.labels.map((l) => (
                                <span
                                  key={l.id}
                                  className="rounded-full px-2 py-0.5 text-xs text-white"
                                  style={{ background: l.color }}
                                >
                                  {l.name}
                                </span>
                              ))}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={cn(
                              "rounded-full px-2.5 py-1 text-xs font-medium",
                              automation.active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
                            )}
                          >
                            {automation.active ? "Ativa" : "Inativa"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-600">{automation.runCount}</td>
                        <td className="px-4 py-3 text-gray-500 text-xs">
                          {automation.lastRunAt ? formatDate(automation.lastRunAt) : "Nunca"}
                        </td>
                        {isAdmin && (
                          <td className="px-4 py-3">
                            <div className="flex justify-end gap-1">
                              <button
                                onClick={() => router.push(`/comercial/automacoes/${automation.id}`)}
                                className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                                title="Editar"
                              >
                                <Pencil className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => duplicateAutomation(automation.id)}
                                className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                                title="Duplicar"
                              >
                                <Copy className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => deleteAutomation(automation.id)}
                                className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500"
                                title="Excluir"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* ─── History tab ─── */}
          {tab === "history" && (
            <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
              {runs.length === 0 ? (
                <div className="py-16 text-center text-gray-400">Nenhuma execução registrada.</div>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="px-4 py-3 text-left font-medium text-gray-500">Automação</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-500">Lead</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-500">Gatilho</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-500">Status</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-500">Data</th>
                      <th className="px-4 py-3 w-10" />
                    </tr>
                  </thead>
                  <tbody>
                    {runs.map((run) => (
                      <>
                        <tr key={run.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                          <td className="px-4 py-3 font-medium text-gray-900">{run.automation?.name}</td>
                          <td className="px-4 py-3 text-gray-600">{run.leadName ?? run.leadId ?? "—"}</td>
                          <td className="px-4 py-3 text-gray-500 text-xs">
                            {TRIGGER_LABELS[run.triggerType] ?? run.triggerType}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={cn(
                                "rounded-full px-2 py-0.5 text-xs font-medium",
                                STATUS_COLORS[run.status] ?? "bg-gray-100 text-gray-600"
                              )}
                            >
                              {run.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-500">{formatDate(run.createdAt)}</td>
                          <td className="px-4 py-3">
                            <button
                              onClick={() => setExpandedRunId(expandedRunId === run.id ? null : run.id)}
                              className="text-gray-400 hover:text-gray-600"
                            >
                              {expandedRunId === run.id ? (
                                <ChevronUp className="h-4 w-4" />
                              ) : (
                                <ChevronDown className="h-4 w-4" />
                              )}
                            </button>
                          </td>
                        </tr>
                        {expandedRunId === run.id && (
                          <tr key={`${run.id}-detail`} className="bg-gray-50">
                            <td colSpan={6} className="px-6 py-3">
                              <pre className="text-xs text-gray-600 overflow-x-auto whitespace-pre-wrap">
                                {JSON.stringify(run.stepResults, null, 2)}
                              </pre>
                            </td>
                          </tr>
                        )}
                      </>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* ─── Sequences tab ─── */}
          {tab === "sequences" && (
            <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
              <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
                <span className="text-sm font-medium text-gray-700">Sequências de cadência</span>
                {isAdmin && (
                  <button
                    onClick={() => setSequenceModal({})}
                    className="flex items-center gap-1.5 rounded-lg bg-purple-50 px-3 py-1.5 text-xs font-medium text-purple-700 hover:bg-purple-100"
                  >
                    <Plus className="h-3.5 w-3.5" /> Nova Sequência
                  </button>
                )}
              </div>
              {sequences.length === 0 ? (
                <div className="py-16 text-center text-gray-400">Nenhuma sequência criada.</div>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="px-4 py-3 text-left font-medium text-gray-500">Nome</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-500">Passos</th>
                      {isAdmin && <th className="px-4 py-3 text-right font-medium text-gray-500">Ações</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {sequences.map((seq) => (
                      <tr key={seq.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                        <td className="px-4 py-3">
                          <span className="font-medium text-gray-900">{seq.name}</span>
                          {seq.description && (
                            <span className="ml-2 text-xs text-gray-400">{seq.description}</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-gray-500">{seq._count.steps} passos</td>
                        {isAdmin && (
                          <td className="px-4 py-3">
                            <div className="flex justify-end gap-1">
                              <button
                                onClick={() => setSequenceModal(seq)}
                                className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                              >
                                <Pencil className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => deleteSequence(seq.id)}
                                className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* ─── Templates tab ─── */}
          {tab === "templates" && (
            <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
              <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
                <span className="text-sm font-medium text-gray-700">Templates de mensagem</span>
                {isAdmin && (
                  <button
                    onClick={() => setTemplateModal({})}
                    className="flex items-center gap-1.5 rounded-lg bg-purple-50 px-3 py-1.5 text-xs font-medium text-purple-700 hover:bg-purple-100"
                  >
                    <Plus className="h-3.5 w-3.5" /> Novo Template
                  </button>
                )}
              </div>
              {templates.length === 0 ? (
                <div className="py-16 text-center text-gray-400">Nenhum template criado.</div>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="px-4 py-3 text-left font-medium text-gray-500">Nome</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-500">Preview</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-500">Sequência</th>
                      {isAdmin && <th className="px-4 py-3 text-right font-medium text-gray-500">Ações</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {templates.map((tpl) => (
                      <tr key={tpl.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                        <td className="px-4 py-3 font-medium text-gray-900">{tpl.name}</td>
                        <td className="px-4 py-3 text-gray-500 max-w-xs">
                          <span className="line-clamp-2 text-xs">{tpl.body}</span>
                        </td>
                        <td className="px-4 py-3 text-gray-500 text-xs">
                          {tpl.sequence?.name ?? "—"}
                        </td>
                        {isAdmin && (
                          <td className="px-4 py-3">
                            <div className="flex justify-end gap-1">
                              <button
                                onClick={() => setTemplateModal(tpl)}
                                className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                              >
                                <Pencil className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => deleteTemplate(tpl.id)}
                                className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
