"use client"

import { useState, useEffect } from "react"
import {
  DialogRoot,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select"
import type { Lead, LeadSource, LeadStage, User } from "@/types/models"

const SOURCE_OPTIONS: { value: LeadSource; label: string }[] = [
  { value: "TRAFFIC", label: "Tráfego pago" },
  { value: "PROSPECTING", label: "Prospecção ativa" },
  { value: "REFERRAL", label: "Indicação" },
  { value: "OTHER", label: "Outro" },
]

const STAGE_OPTIONS: { value: LeadStage; label: string }[] = [
  { value: "LEAD", label: "Lead" },
  { value: "MQL", label: "MQL" },
  { value: "SCREENING_SCHEDULED", label: "Triagem Agendada" },
  { value: "SCREENING_DONE", label: "Triagem Realizada" },
  { value: "CLOSING_MEETING", label: "Reunião de Fechamento" },
  { value: "PROPOSAL_SENT", label: "Proposta Enviada" },
  { value: "CLOSED", label: "Fechamento" },
  { value: "LOST", label: "Perdido" },
]

interface LeadFormProps {
  open: boolean
  onClose: () => void
  onSuccess: (lead: Lead) => void
  lead?: Lead
  users: User[]
}

interface FormState {
  name: string
  phone: string
  email: string
  source: LeadSource
  stage: LeadStage
  assignedToId: string
  estimatedValue: string
  notes: string
}

const DEFAULT_FORM: FormState = {
  name: "",
  phone: "",
  email: "",
  source: "TRAFFIC",
  stage: "LEAD",
  assignedToId: "",
  estimatedValue: "",
  notes: "",
}

export function LeadForm({ open, onClose, onSuccess, lead, users }: LeadFormProps) {
  const [form, setForm] = useState<FormState>(DEFAULT_FORM)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isEditing = !!lead

  useEffect(() => {
    if (lead) {
      setForm({
        name: lead.name,
        phone: lead.phone,
        email: lead.email ?? "",
        source: lead.source,
        stage: lead.stage,
        assignedToId: lead.assignedToId ?? "",
        estimatedValue: lead.estimatedValue ?? "",
        notes: lead.notes ?? "",
      })
    } else {
      setForm(DEFAULT_FORM)
    }
    setError(null)
  }, [lead, open])

  function set(field: keyof FormState, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const payload = {
      name: form.name.trim(),
      phone: form.phone.trim(),
      email: form.email.trim() || null,
      source: form.source,
      stage: form.stage,
      assignedToId: form.assignedToId || null,
      estimatedValue: form.estimatedValue ? form.estimatedValue : null,
      notes: form.notes.trim() || null,
    }

    try {
      const url = isEditing ? `/api/leads/${lead.id}` : "/api/leads"
      const method = isEditing ? "PATCH" : "POST"

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        if (data.details && Array.isArray(data.details)) {
          const fieldLabels: Record<string, string> = {
            name: "Nome", phone: "Telefone", email: "Email",
            source: "Origem", stage: "Estágio", assignedToId: "Responsável",
            estimatedValue: "Valor estimado", notes: "Notas",
          }
          const msg = data.details
            .map((i: { path: string[]; message: string }) =>
              `${fieldLabels[i.path[0]] ?? i.path.join(".")}: ${i.message}`
            )
            .join(" | ")
          throw new Error(msg)
        }
        throw new Error(data.error ?? "Erro ao salvar lead")
      }

      const saved: Lead = await res.json()
      onSuccess(saved)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido")
    } finally {
      setLoading(false)
    }
  }

  return (
    <DialogRoot open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar Lead" : "Novo Lead"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Nome */}
          <div className="space-y-1.5">
            <Label htmlFor="lead-name">Nome *</Label>
            <Input
              id="lead-name"
              placeholder="Nome da empresa ou pessoa"
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              required
            />
          </div>

          {/* Telefone + Email */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="lead-phone">Telefone *</Label>
              <Input
                id="lead-phone"
                type="tel"
                placeholder="(11) 99999-9999"
                value={form.phone}
                onChange={(e) => set("phone", e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="lead-email">Email</Label>
              <Input
                id="lead-email"
                type="email"
                placeholder="email@empresa.com"
                value={form.email}
                onChange={(e) => set("email", e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Source */}
            <div className="space-y-1.5">
              <Label>Origem</Label>
              <Select value={form.source} onValueChange={(v) => set("source", v as LeadSource)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SOURCE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Stage */}
            <div className="space-y-1.5">
              <Label>Estágio</Label>
              <Select value={form.stage} onValueChange={(v) => set("stage", v as LeadStage)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STAGE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Responsável */}
            <div className="space-y-1.5">
              <Label>Responsável</Label>
              <Select
                value={form.assignedToId || "__none__"}
                onValueChange={(v) => set("assignedToId", v === "__none__" ? "" : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Nenhum" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Nenhum</SelectItem>
                  {users.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Valor estimado */}
            <div className="space-y-1.5">
              <Label htmlFor="lead-value">Valor estimado (R$)</Label>
              <Input
                id="lead-value"
                type="number"
                min="0"
                step="0.01"
                placeholder="0,00"
                value={form.estimatedValue}
                onChange={(e) => set("estimatedValue", e.target.value)}
              />
            </div>
          </div>

          {/* Notas */}
          <div className="space-y-1.5">
            <Label htmlFor="lead-notes">Notas</Label>
            <Textarea
              id="lead-notes"
              placeholder="Observações sobre o lead..."
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
              rows={3}
            />
          </div>

          {error && (
            <p className="text-sm text-red-400 bg-red-500/10 rounded-lg px-3 py-2">{error}</p>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Salvando..." : isEditing ? "Salvar alterações" : "Criar lead"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </DialogRoot>
  )
}
