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
import type { Client, ClientStatus } from "@/types/models"

interface ClientFormProps {
  open: boolean
  onClose: () => void
  onSuccess: (client: Client) => void
  client?: Client
}

interface FormState {
  name: string
  contractValue: string
  billingType: "MONTHLY" | "OTHER"
  startDate: string
  endDate: string
  duration: string
  status: ClientStatus
  notes: string
}

const DEFAULT_FORM: FormState = {
  name: "",
  contractValue: "",
  billingType: "MONTHLY",
  startDate: "",
  endDate: "",
  duration: "",
  status: "ACTIVE",
  notes: "",
}

function toInputDate(dateStr?: string | null): string {
  if (!dateStr) return ""
  return dateStr.split("T")[0]
}

export function ClientForm({ open, onClose, onSuccess, client }: ClientFormProps) {
  const [form, setForm] = useState<FormState>(DEFAULT_FORM)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isEditing = !!client

  useEffect(() => {
    if (client) {
      setForm({
        name: client.name,
        contractValue: client.contractValue,
        billingType: client.billingType,
        startDate: toInputDate(client.startDate),
        endDate: toInputDate(client.endDate),
        duration: client.duration?.toString() ?? "",
        status: client.status,
        notes: client.notes ?? "",
      })
    } else {
      setForm(DEFAULT_FORM)
    }
    setError(null)
  }, [client, open])

  function set(field: keyof FormState, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const payload = {
      name: form.name.trim(),
      contractValue: form.contractValue,
      billingType: form.billingType,
      startDate: form.startDate || undefined,
      endDate: form.endDate || null,
      duration: form.duration ? parseInt(form.duration, 10) : null,
      status: form.status,
      notes: form.notes.trim() || null,
    }

    try {
      const url = isEditing ? `/api/clients/${client.id}` : "/api/clients"
      const method = isEditing ? "PATCH" : "POST"

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error ?? "Erro ao salvar cliente")
      }

      const saved: Client = await res.json()
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
          <DialogTitle>{isEditing ? "Editar Cliente" : "Novo Cliente"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Nome */}
          <div className="space-y-1.5">
            <Label htmlFor="client-name">Nome *</Label>
            <Input
              id="client-name"
              placeholder="Nome da empresa"
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Valor do contrato */}
            <div className="space-y-1.5">
              <Label htmlFor="client-value">Valor do contrato (R$) *</Label>
              <Input
                id="client-value"
                type="number"
                min="0"
                step="0.01"
                placeholder="0,00"
                value={form.contractValue}
                onChange={(e) => set("contractValue", e.target.value)}
                required
              />
            </div>

            {/* Tipo de cobrança */}
            <div className="space-y-1.5">
              <Label>Tipo de cobrança</Label>
              <Select
                value={form.billingType}
                onValueChange={(v) => set("billingType", v as "MONTHLY" | "OTHER")}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MONTHLY">Mensal</SelectItem>
                  <SelectItem value="OTHER">Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Data de início */}
            <div className="space-y-1.5">
              <Label htmlFor="client-start">Data de início *</Label>
              <Input
                id="client-start"
                type="date"
                value={form.startDate}
                onChange={(e) => set("startDate", e.target.value)}
                required
              />
            </div>

            {/* Data de vencimento */}
            <div className="space-y-1.5">
              <Label htmlFor="client-end">Data de vencimento</Label>
              <Input
                id="client-end"
                type="date"
                value={form.endDate}
                onChange={(e) => set("endDate", e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Duração em meses */}
            <div className="space-y-1.5">
              <Label htmlFor="client-duration">Duração (meses)</Label>
              <Input
                id="client-duration"
                type="number"
                min="1"
                placeholder="Ex: 12"
                value={form.duration}
                onChange={(e) => set("duration", e.target.value)}
              />
            </div>

            {/* Status */}
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select
                value={form.status}
                onValueChange={(v) => set("status", v as ClientStatus)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ACTIVE">Ativo</SelectItem>
                  <SelectItem value="CHURN">Churn</SelectItem>
                  <SelectItem value="NOT_RENEWED">Não Renovou</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Notas */}
          <div className="space-y-1.5">
            <Label htmlFor="client-notes">Notas</Label>
            <Textarea
              id="client-notes"
              placeholder="Observações sobre o cliente..."
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
              {loading ? "Salvando..." : isEditing ? "Salvar alterações" : "Criar cliente"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </DialogRoot>
  )
}
