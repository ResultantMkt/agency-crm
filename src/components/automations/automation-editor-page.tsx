"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import {
  ArrowLeft,
  Zap,
  Plus,
  X,
  ChevronDown,
  ChevronUp,
  Save,
  Globe,
  Bell,
  ListChecks,
  UserCheck,
  GitBranch,
  Webhook,
  CheckCircle2,
  AlertCircle,
  SkipForward,
} from "lucide-react"
import { cn } from "@/lib/utils"
import type {
  AutomationTrigger,
  AutomationStep,
  ConditionStep,
  ActionStep,
  ActionType,
  ConditionField,
  ConditionOperator,
} from "@/types/automation"

// ─── Types ────────────────────────────────────────────────────────────────────

interface AutomationData {
  id: string
  name: string
  description: string | null
  active: boolean
  trigger: AutomationTrigger
  steps: AutomationStep[]
  runCount: number
  lastRunAt: string | null
  createdAt: string
  updatedAt: string
  labels: { id: string; name: string; color: string }[]
  runs?: RunRecord[]
}

interface RunRecord {
  id: string
  leadId: string | null
  leadName: string | null
  triggerType: string
  status: string
  stepResults: unknown[]
  createdAt: string
}

interface PipelineStage {
  id: string
  key: string
  name: string
  position: number
}

interface UserOption {
  id: string
  name: string
}

interface SequenceOption {
  id: string
  name: string
}

interface ZapiGroup {
  phone: string
  name: string
}

// ─── Constants ────────────────────────────────────────────────────────────────

const TRIGGER_OPTIONS = [
  { type: "lead.created", label: "Lead criado", description: "Quando um novo lead for criado" },
  { type: "lead.stage_changed", label: "Etapa alterada", description: "Quando a etapa de um lead mudar" },
  { type: "lead.won", label: "Lead ganho", description: "Quando um lead for marcado como ganho" },
  { type: "lead.lost", label: "Lead perdido", description: "Quando um lead for marcado como perdido" },
  { type: "lead.updated", label: "Lead atualizado", description: "Quando um campo específico do lead for alterado" },
  { type: "lead.updated_any", label: "Lead atualizado (qualquer)", description: "Quando qualquer alteração acontecer no lead" },
  { type: "activity.created", label: "Atividade criada", description: "Quando alguém criar uma atividade dentro de um lead" },
  { type: "form.submitted", label: "Formulário enviado", description: "Quando alguém responder um formulário (Respondi)" },
]

const CONDITION_FIELDS: { value: ConditionField; label: string }[] = [
  { value: "stage", label: "Etapa" },
  { value: "source", label: "Origem" },
  { value: "assignedToId", label: "Responsável" },
  { value: "estimatedValue", label: "Valor estimado" },
  { value: "name", label: "Nome" },
  { value: "email", label: "Email" },
  { value: "phone", label: "Telefone" },
]

const CONDITION_OPERATORS: { value: ConditionOperator; label: string }[] = [
  { value: "equals", label: "é igual a" },
  { value: "not_equals", label: "não é igual a" },
  { value: "contains", label: "contém" },
  { value: "is_empty", label: "está vazio" },
  { value: "is_not_empty", label: "não está vazio" },
]

const ACTION_OPTIONS: { type: ActionType; label: string; icon: React.ElementType; description: string }[] = [
  { type: "notify_whatsapp_group", label: "Notificar grupo WhatsApp", icon: Bell, description: "Enviar mensagem para um grupo" },
  { type: "start_sequence", label: "Iniciar sequência", icon: ListChecks, description: "Adicionar lead a uma sequência de cadência" },
  { type: "create_task", label: "Criar tarefa", icon: CheckCircle2, description: "Criar uma tarefa vinculada ao lead" },
  { type: "change_stage", label: "Mudar etapa", icon: GitBranch, description: "Mover lead para outra etapa do funil" },
  { type: "assign_user", label: "Atribuir responsável", icon: UserCheck, description: "Definir o responsável pelo lead" },
  { type: "call_webhook", label: "Chamar webhook", icon: Webhook, description: "Enviar dados para uma URL externa" },
]

const STATUS_ICONS: Record<string, React.ElementType> = {
  SUCCESS: CheckCircle2,
  PARTIAL_ERROR: AlertCircle,
  FAILED: AlertCircle,
  SKIPPED: SkipForward,
}

const STATUS_COLORS: Record<string, string> = {
  SUCCESS: "text-green-600 bg-green-50",
  PARTIAL_ERROR: "text-yellow-600 bg-yellow-50",
  FAILED: "text-red-600 bg-red-50",
  SKIPPED: "text-gray-500 bg-gray-50",
}

function generateId(): string {
  return Math.random().toString(36).slice(2, 10)
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
  })
}

// ─── Trigger Panel ────────────────────────────────────────────────────────────

function TriggerPanel({
  trigger,
  stages,
  onChange,
}: {
  trigger: AutomationTrigger
  stages: PipelineStage[]
  onChange: (t: AutomationTrigger) => void
}) {
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-gray-700">Selecionar gatilho</h3>
      <div className="space-y-2">
        {TRIGGER_OPTIONS.map((opt) => (
          <button
            key={opt.type}
            onClick={() => onChange({ type: opt.type as AutomationTrigger["type"], config: {} })}
            className={cn(
              "w-full rounded-lg border p-3 text-left transition-colors",
              trigger.type === opt.type
                ? "border-purple-500 bg-purple-50"
                : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
            )}
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-900">{opt.label}</span>
              {trigger.type === opt.type && (
                <span className="h-2 w-2 rounded-full bg-purple-600" />
              )}
            </div>
            <p className="mt-0.5 text-xs text-gray-500">{opt.description}</p>
          </button>
        ))}
      </div>

      {trigger.type === "lead.stage_changed" && (
        <div className="space-y-3 pt-3 border-t border-gray-100">
          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Filtros de etapa</h4>
          <div>
            <label className="block text-xs text-gray-600 mb-1">De etapa (opcional)</label>
            <select
              value={(trigger.config.fromStage as string) ?? ""}
              onChange={(e) =>
                onChange({ ...trigger, config: { ...trigger.config, fromStage: e.target.value || undefined } })
              }
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none"
            >
              <option value="">Qualquer etapa</option>
              {stages.map((s) => (
                <option key={s.id} value={s.key}>{s.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-1">Para etapa (opcional)</label>
            <select
              value={(trigger.config.toStage as string) ?? ""}
              onChange={(e) =>
                onChange({ ...trigger, config: { ...trigger.config, toStage: e.target.value || undefined } })
              }
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none"
            >
              <option value="">Qualquer etapa</option>
              {stages.map((s) => (
                <option key={s.id} value={s.key}>{s.name}</option>
              ))}
            </select>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Condition Panel ──────────────────────────────────────────────────────────

function ConditionPanel({
  step,
  onChange,
}: {
  step: ConditionStep
  onChange: (s: ConditionStep) => void
}) {
  const needsValue = step.operator !== "is_empty" && step.operator !== "is_not_empty"

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-gray-700">Configurar condição</h3>
      <div>
        <label className="block text-xs text-gray-600 mb-1">Campo</label>
        <select
          value={step.field}
          onChange={(e) => onChange({ ...step, field: e.target.value as ConditionField })}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none"
        >
          {CONDITION_FIELDS.map((f) => (
            <option key={f.value} value={f.value}>{f.label}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-xs text-gray-600 mb-1">Operador</label>
        <select
          value={step.operator}
          onChange={(e) => onChange({ ...step, operator: e.target.value as ConditionOperator })}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none"
        >
          {CONDITION_OPERATORS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>
      {needsValue && (
        <div>
          <label className="block text-xs text-gray-600 mb-1">Valor</label>
          <input
            value={step.value ?? ""}
            onChange={(e) => onChange({ ...step, value: e.target.value })}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none"
            placeholder="Valor para comparar"
          />
        </div>
      )}
    </div>
  )
}

// ─── Action Panel ─────────────────────────────────────────────────────────────

function ActionPanel({
  step,
  stages,
  users,
  sequences,
  groups,
  onChange,
}: {
  step: ActionStep
  stages: PipelineStage[]
  users: UserOption[]
  sequences: SequenceOption[]
  groups: ZapiGroup[]
  onChange: (s: ActionStep) => void
}) {
  function updateConfig(key: string, value: unknown) {
    onChange({ ...step, config: { ...step.config, [key]: value } })
  }

  const cfg = step.config

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-gray-700">Configurar ação</h3>
      <div>
        <label className="block text-xs text-gray-600 mb-1">Tipo de ação</label>
        <select
          value={step.actionType}
          onChange={(e) =>
            onChange({ ...step, actionType: e.target.value as ActionType, config: {} })
          }
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none"
        >
          {ACTION_OPTIONS.map((o) => (
            <option key={o.type} value={o.type}>{o.label}</option>
          ))}
        </select>
      </div>

      {step.actionType === "notify_whatsapp_group" && (
        <>
          <div>
            <label className="block text-xs text-gray-600 mb-1">Grupo WhatsApp</label>
            <select
              value={(cfg.groupPhone as string) ?? ""}
              onChange={(e) => updateConfig("groupPhone", e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none"
            >
              <option value="">Selecionar grupo...</option>
              {groups.map((g) => (
                <option key={g.phone} value={g.phone}>{g.name}</option>
              ))}
            </select>
            {groups.length === 0 && (
              <p className="mt-1 text-xs text-gray-400">Nenhum grupo encontrado. Configure o Z-API nas integrações.</p>
            )}
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-1">Mensagem</label>
            <textarea
              value={(cfg.message as string) ?? ""}
              onChange={(e) => updateConfig("message", e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none"
              rows={4}
              placeholder="Sua mensagem aqui..."
            />
            <p className="mt-1 text-xs text-gray-400">
              Variáveis: {"{{"} nome_contato {"}}"}, {"{{"} nome_etapa {"}}"}, {"{{"} valor_negocio {"}}"}, {"{{"} nome_vendedor {"}}"}
            </p>
          </div>
        </>
      )}

      {step.actionType === "start_sequence" && (
        <div>
          <label className="block text-xs text-gray-600 mb-1">Sequência</label>
          <select
            value={(cfg.sequenceId as string) ?? ""}
            onChange={(e) => updateConfig("sequenceId", e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none"
          >
            <option value="">Selecionar sequência...</option>
            {sequences.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
      )}

      {step.actionType === "create_task" && (
        <>
          <div>
            <label className="block text-xs text-gray-600 mb-1">Título da tarefa</label>
            <input
              value={(cfg.title as string) ?? ""}
              onChange={(e) => updateConfig("title", e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none"
              placeholder="Título da tarefa"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-1">Responsável (opcional)</label>
            <select
              value={(cfg.assignedToId as string) ?? ""}
              onChange={(e) => updateConfig("assignedToId", e.target.value || null)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none"
            >
              <option value="">Sem responsável</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>
          </div>
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-xs text-gray-600 mb-1">Atraso (dias)</label>
              <input
                type="number"
                min={0}
                value={(cfg.delayDays as number) ?? 0}
                onChange={(e) => updateConfig("delayDays", parseInt(e.target.value) || 0)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none"
              />
            </div>
            <div className="flex-1">
              <label className="block text-xs text-gray-600 mb-1">Atraso (horas)</label>
              <input
                type="number"
                min={0}
                value={(cfg.delayHours as number) ?? 0}
                onChange={(e) => updateConfig("delayHours", parseInt(e.target.value) || 0)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none"
              />
            </div>
          </div>
        </>
      )}

      {step.actionType === "change_stage" && (
        <div>
          <label className="block text-xs text-gray-600 mb-1">Nova etapa</label>
          <select
            value={(cfg.stage as string) ?? ""}
            onChange={(e) => updateConfig("stage", e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none"
          >
            <option value="">Selecionar etapa...</option>
            {stages.map((s) => (
              <option key={s.id} value={s.key}>{s.name}</option>
            ))}
          </select>
        </div>
      )}

      {step.actionType === "assign_user" && (
        <div>
          <label className="block text-xs text-gray-600 mb-1">Usuário</label>
          <select
            value={(cfg.userId as string) ?? ""}
            onChange={(e) => updateConfig("userId", e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none"
          >
            <option value="">Selecionar usuário...</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
          </select>
        </div>
      )}

      {step.actionType === "call_webhook" && (
        <div>
          <label className="block text-xs text-gray-600 mb-1">URL do webhook</label>
          <input
            value={(cfg.url as string) ?? ""}
            onChange={(e) => updateConfig("url", e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none"
            placeholder="https://..."
          />
          <p className="mt-1 text-xs text-gray-400">Será enviado via POST com os dados do lead.</p>
        </div>
      )}
    </div>
  )
}

// ─── Action Type Picker ───────────────────────────────────────────────────────

function ActionTypePicker({ onSelect }: { onSelect: (type: ActionType) => void }) {
  return (
    <div className="grid grid-cols-1 gap-2">
      {ACTION_OPTIONS.map((opt) => {
        const Icon = opt.icon
        return (
          <button
            key={opt.type}
            onClick={() => onSelect(opt.type)}
            className="flex items-start gap-3 rounded-lg border border-gray-200 p-3 text-left hover:border-purple-300 hover:bg-purple-50 transition-colors"
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gray-100">
              <Icon className="h-4 w-4 text-gray-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">{opt.label}</p>
              <p className="text-xs text-gray-500">{opt.description}</p>
            </div>
          </button>
        )
      })}
    </div>
  )
}

// ─── Main Editor ──────────────────────────────────────────────────────────────

export function AutomationEditorPage({ id }: { id: string }) {
  const router = useRouter()
  const { data: session } = useSession()
  const isAdmin = session?.user?.role === "ADMIN"

  const [automation, setAutomation] = useState<AutomationData | null>(null)
  const [local, setLocal] = useState<AutomationData | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [loading, setLoading] = useState(true)
  const [showActionPicker, setShowActionPicker] = useState(false)
  const [expandedRunId, setExpandedRunId] = useState<string | null>(null)

  // External data
  const [stages, setStages] = useState<PipelineStage[]>([])
  const [users, setUsers] = useState<UserOption[]>([])
  const [sequences, setSequences] = useState<SequenceOption[]>([])
  const [groups, setGroups] = useState<ZapiGroup[]>([])
  const [runs, setRuns] = useState<RunRecord[]>([])

  const fetchAutomation = useCallback(async () => {
    const res = await fetch(`/api/automations/${id}`)
    if (!res.ok) { router.push("/comercial/automacoes"); return }
    const data = await res.json()
    setAutomation(data)
    setLocal(data)
    setLoading(false)
  }, [id, router])

  const fetchRuns = useCallback(async () => {
    const res = await fetch(`/api/automations/${id}/runs`)
    if (res.ok) {
      const data = await res.json()
      setRuns(Array.isArray(data.runs) ? data.runs : [])
    }
  }, [id])

  useEffect(() => {
    fetchAutomation()
    fetchRuns()
    Promise.all([
      fetch("/api/pipeline-stages").then((r) => r.json()),
      fetch("/api/users").then((r) => r.json()),
      fetch("/api/sequences").then((r) => r.json()),
      fetch("/api/zapi/groups").then((r) => r.json()),
    ]).then(([stagesData, usersData, seqData, groupsData]) => {
      setStages(Array.isArray(stagesData) ? stagesData : [])
      setUsers(Array.isArray(usersData) ? usersData : [])
      setSequences(Array.isArray(seqData) ? seqData : [])
      setGroups(Array.isArray(groupsData?.groups) ? groupsData.groups : [])
    }).catch(() => {})
  }, [fetchAutomation, fetchRuns])

  function updateLocal(patch: Partial<AutomationData>) {
    setLocal((prev) => prev ? { ...prev, ...patch } : prev)
    setDirty(true)
  }

  function updateTrigger(trigger: AutomationTrigger) {
    updateLocal({ trigger })
  }

  function addCondition() {
    const newStep: ConditionStep = {
      id: generateId(),
      type: "condition",
      field: "stage",
      operator: "equals",
      value: "",
    }
    const steps = [...(local?.steps ?? []), newStep]
    updateLocal({ steps })
    setSelectedId(newStep.id)
  }

  function addAction(actionType: ActionType) {
    const newStep: ActionStep = {
      id: generateId(),
      type: "action",
      actionType,
      config: {},
    }
    const steps = [...(local?.steps ?? []), newStep]
    updateLocal({ steps })
    setSelectedId(newStep.id)
    setShowActionPicker(false)
  }

  function updateStep(updated: AutomationStep) {
    const steps = (local?.steps ?? []).map((s) => s.id === updated.id ? updated : s)
    updateLocal({ steps })
  }

  function deleteStep(stepId: string) {
    const steps = (local?.steps ?? []).filter((s) => s.id !== stepId)
    updateLocal({ steps })
    if (selectedId === stepId) setSelectedId(null)
  }

  function moveStep(stepId: string, dir: "up" | "down") {
    const steps = [...(local?.steps ?? [])]
    const idx = steps.findIndex((s) => s.id === stepId)
    if (idx < 0) return
    const newIdx = dir === "up" ? idx - 1 : idx + 1
    if (newIdx < 0 || newIdx >= steps.length) return
    const [removed] = steps.splice(idx, 1)
    steps.splice(newIdx, 0, removed)
    updateLocal({ steps })
  }

  async function save() {
    if (!local || !isAdmin) return
    setSaving(true)
    try {
      const res = await fetch(`/api/automations/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: local.name,
          description: local.description,
          active: local.active,
          trigger: local.trigger,
          steps: local.steps,
        }),
      })
      if (res.ok) {
        const data = await res.json()
        setAutomation(data)
        setLocal(data)
        setDirty(false)
      }
    } finally {
      setSaving(false)
    }
  }

  const selectedStep = local?.steps.find((s) => s.id === selectedId) ?? null

  if (loading || !local) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-400">Carregando...</div>
      </div>
    )
  }

  const triggerLabel = TRIGGER_OPTIONS.find((t) => t.type === local.trigger?.type)?.label

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Left panel */}
      <div className="flex w-[420px] shrink-0 flex-col border-r border-gray-200 bg-white overflow-hidden">
        {/* Top bar */}
        <div className="flex items-center gap-3 border-b border-gray-200 px-4 py-3">
          <button
            onClick={() => router.push("/comercial/automacoes")}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </button>
        </div>

        {/* Name + description */}
        <div className="border-b border-gray-100 px-4 py-3 space-y-2">
          <input
            value={local.name}
            onChange={(e) => updateLocal({ name: e.target.value })}
            disabled={!isAdmin}
            className="w-full text-base font-semibold text-gray-900 bg-transparent focus:outline-none focus:ring-0 disabled:cursor-default"
            placeholder="Nome da automação"
          />
          <input
            value={local.description ?? ""}
            onChange={(e) => updateLocal({ description: e.target.value })}
            disabled={!isAdmin}
            className="w-full text-sm text-gray-500 bg-transparent focus:outline-none focus:ring-0 disabled:cursor-default"
            placeholder="Descrição (opcional)"
          />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">Status:</span>
              {isAdmin ? (
                <button
                  onClick={() => updateLocal({ active: !local.active })}
                  className={cn(
                    "relative inline-flex h-5 w-9 rounded-full transition-colors",
                    local.active ? "bg-purple-600" : "bg-gray-300"
                  )}
                >
                  <span
                    className={cn(
                      "absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform",
                      local.active && "translate-x-4"
                    )}
                  />
                </button>
              ) : (
                <span className={cn(
                  "rounded-full px-2 py-0.5 text-xs font-medium",
                  local.active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
                )}>
                  {local.active ? "Ativa" : "Inativa"}
                </span>
              )}
            </div>
            {isAdmin && (
              <div className="flex gap-2">
                {dirty && (
                  <button
                    onClick={() => { setLocal(automation); setDirty(false) }}
                    className="text-xs text-gray-500 hover:text-gray-700"
                  >
                    Cancelar
                  </button>
                )}
                <button
                  onClick={save}
                  disabled={saving || !dirty}
                  className="flex items-center gap-1.5 rounded-lg bg-purple-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-purple-700 disabled:opacity-50"
                >
                  <Save className="h-3.5 w-3.5" />
                  {saving ? "Salvando..." : "Salvar"}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Flow */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {/* Trigger block */}
          <button
            onClick={() => { setSelectedId("trigger"); setShowActionPicker(false) }}
            className={cn(
              "w-full rounded-xl border-2 p-4 text-left transition-all",
              selectedId === "trigger"
                ? "border-purple-500 bg-purple-50"
                : "border-gray-200 bg-white hover:border-gray-300"
            )}
          >
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-100">
                <Zap className="h-4 w-4 text-purple-600" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">GATILHO</p>
                <p className="text-sm font-medium text-gray-900 mt-0.5">
                  {triggerLabel ?? (
                    <span className="text-gray-400">+ Selecionar gatilho</span>
                  )}
                </p>
              </div>
            </div>
          </button>

          {/* Connector */}
          <div className="flex justify-center">
            <div className="h-4 w-px bg-gray-300" />
          </div>

          {/* Add condition/action buttons */}
          {isAdmin && (
            <div className="flex gap-2">
              <button
                onClick={addCondition}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-dashed border-gray-300 py-2 text-xs font-medium text-gray-500 hover:border-purple-400 hover:text-purple-600 transition-colors"
              >
                <Plus className="h-3.5 w-3.5" /> Condição
              </button>
              <button
                onClick={() => { setShowActionPicker(true); setSelectedId("action-picker") }}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-dashed border-gray-300 py-2 text-xs font-medium text-gray-500 hover:border-purple-400 hover:text-purple-600 transition-colors"
              >
                <Plus className="h-3.5 w-3.5" /> Ação
              </button>
            </div>
          )}

          {/* Steps */}
          {local.steps.map((step, idx) => {
            const isCondition = step.type === "condition"
            const isSelected = selectedId === step.id
            const condStep = isCondition ? (step as ConditionStep) : null
            const actStep = !isCondition ? (step as ActionStep) : null
            const actionOpt = actStep ? ACTION_OPTIONS.find((a) => a.type === actStep.actionType) : null
            const ActionIcon = actionOpt?.icon ?? Globe

            return (
              <div key={step.id}>
                <div className="flex justify-center">
                  <div className="h-4 w-px bg-gray-300" />
                </div>
                <button
                  onClick={() => { setSelectedId(step.id); setShowActionPicker(false) }}
                  className={cn(
                    "w-full rounded-xl border-2 p-3 text-left transition-all group",
                    isSelected ? "border-purple-500 bg-purple-50" : "border-gray-200 bg-white hover:border-gray-300"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg",
                      isCondition ? "bg-amber-100" : "bg-blue-100"
                    )}>
                      {isCondition ? (
                        <GitBranch className="h-3.5 w-3.5 text-amber-600" />
                      ) : (
                        <ActionIcon className="h-3.5 w-3.5 text-blue-600" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                        {isCondition ? "CONDIÇÃO" : "AÇÃO"}
                      </p>
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {isCondition
                          ? `${CONDITION_FIELDS.find((f) => f.value === condStep!.field)?.label} ${CONDITION_OPERATORS.find((o) => o.value === condStep!.operator)?.label}${condStep!.value ? ` "${condStep!.value}"` : ""}`
                          : actionOpt?.label ?? actStep?.actionType
                        }
                      </p>
                    </div>
                    {isAdmin && (
                      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => { e.stopPropagation(); moveStep(step.id, "up") }}
                          disabled={idx === 0}
                          className="rounded p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                        >
                          <ChevronUp className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); moveStep(step.id, "down") }}
                          disabled={idx === local.steps.length - 1}
                          className="rounded p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                        >
                          <ChevronDown className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); deleteStep(step.id) }}
                          className="rounded p-1 text-gray-400 hover:text-red-500"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </button>
              </div>
            )
          })}

          {/* Connector + end */}
          <div className="flex justify-center">
            <div className="h-4 w-px bg-gray-300" />
          </div>
          <div className="rounded-xl border border-dashed border-gray-300 p-3 text-center">
            <p className="text-xs text-gray-400">Fim do fluxo</p>
          </div>
        </div>

        {/* Stats */}
        <div className="border-t border-gray-100 px-4 py-3 flex gap-4 text-xs text-gray-500">
          <span>Execuções: <strong className="text-gray-700">{automation?.runCount ?? 0}</strong></span>
          {automation?.lastRunAt && (
            <span>Última: <strong className="text-gray-700">{formatDate(automation.lastRunAt)}</strong></span>
          )}
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 overflow-y-auto p-6">
        {/* Nothing selected */}
        {!selectedId && !showActionPicker && (
          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">Sobre esta automação</h3>
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-gray-500">Status</dt>
                <dd className={cn(
                  "rounded-full px-2.5 py-0.5 text-xs font-medium",
                  local.active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
                )}>
                  {local.active ? "Ativa" : "Inativa"}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Execuções totais</dt>
                <dd className="font-medium text-gray-900">{automation?.runCount ?? 0}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Última execução</dt>
                <dd className="font-medium text-gray-900">
                  {automation?.lastRunAt ? formatDate(automation.lastRunAt) : "Nunca"}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Passos</dt>
                <dd className="font-medium text-gray-900">{local.steps.length}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Criada em</dt>
                <dd className="font-medium text-gray-900">{formatDate(local.createdAt)}</dd>
              </div>
            </dl>

            {!isAdmin && (
              <div className="mt-4 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-700">
                Apenas administradores podem editar automações.
              </div>
            )}

            {/* Run history */}
            {runs.length > 0 && (
              <div className="mt-6">
                <h4 className="text-sm font-semibold text-gray-700 mb-3">Histórico de execuções</h4>
                <div className="space-y-2">
                  {runs.map((run) => {
                    const StatusIcon = STATUS_ICONS[run.status] ?? AlertCircle
                    return (
                      <div key={run.id}>
                        <button
                          onClick={() => setExpandedRunId(expandedRunId === run.id ? null : run.id)}
                          className="w-full flex items-center justify-between rounded-lg border border-gray-100 px-3 py-2 hover:bg-gray-50"
                        >
                          <div className="flex items-center gap-2">
                            <span className={cn("flex h-5 w-5 items-center justify-center rounded-full text-xs", STATUS_COLORS[run.status] ?? "bg-gray-50 text-gray-500")}>
                              <StatusIcon className="h-3.5 w-3.5" />
                            </span>
                            <span className="text-xs text-gray-700">
                              {run.leadName ?? run.leadId ?? "Lead desconhecido"}
                            </span>
                          </div>
                          <span className="text-xs text-gray-400">{formatDate(run.createdAt)}</span>
                        </button>
                        {expandedRunId === run.id && (
                          <div className="rounded-b-lg border border-t-0 border-gray-100 bg-gray-50 px-3 py-2">
                            <pre className="text-xs text-gray-600 overflow-x-auto whitespace-pre-wrap">
                              {JSON.stringify(run.stepResults, null, 2)}
                            </pre>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Action type picker */}
        {showActionPicker && isAdmin && (
          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-700">Selecionar tipo de ação</h3>
              <button onClick={() => setShowActionPicker(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-4 w-4" />
              </button>
            </div>
            <ActionTypePicker onSelect={addAction} />
          </div>
        )}

        {/* Trigger config */}
        {selectedId === "trigger" && isAdmin && (
          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <TriggerPanel
              trigger={local.trigger}
              stages={stages}
              onChange={updateTrigger}
            />
          </div>
        )}

        {/* Step config */}
        {selectedStep && isAdmin && (
          <div className="rounded-xl border border-gray-200 bg-white p-6">
            {selectedStep.type === "condition" ? (
              <ConditionPanel
                step={selectedStep as ConditionStep}
                onChange={(s) => updateStep(s)}
              />
            ) : (
              <ActionPanel
                step={selectedStep as ActionStep}
                stages={stages}
                users={users}
                sequences={sequences}
                groups={groups}
                onChange={(s) => updateStep(s)}
              />
            )}
          </div>
        )}

        {/* Read-only view for non-admins when selecting */}
        {selectedStep && !isAdmin && (
          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <p className="text-sm text-gray-500 text-center py-8">
              Apenas administradores podem editar os passos da automação.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
