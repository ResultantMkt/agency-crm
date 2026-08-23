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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface Receivable {
  id: string
  clientId: string
  value: string
  referenceMonth: string
  dueDate: string
  status: "PAID" | "PENDING"
}

interface ReceivableFormProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
  receivable?: Receivable
  clients: { id: string; name: string }[]
}

function toMonthInput(dateStr: string): string {
  return dateStr ? dateStr.slice(0, 7) : ""
}

function toDateInput(dateStr: string): string {
  return dateStr ? dateStr.slice(0, 10) : ""
}

export function ReceivableForm({
  open,
  onClose,
  onSuccess,
  receivable,
  clients,
}: ReceivableFormProps) {
  const [clientId, setClientId] = useState("")
  const [value, setValue] = useState("")
  const [referenceMonth, setReferenceMonth] = useState("")
  const [dueDate, setDueDate] = useState("")
  const [status, setStatus] = useState<"PAID" | "PENDING">("PENDING")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    if (open) {
      if (receivable) {
        setClientId(receivable.clientId)
        setValue(receivable.value)
        setReferenceMonth(toMonthInput(receivable.referenceMonth))
        setDueDate(toDateInput(receivable.dueDate))
        setStatus(receivable.status)
      } else {
        setClientId("")
        setValue("")
        setReferenceMonth("")
        setDueDate("")
        setStatus("PENDING")
      }
      setError("")
    }
  }, [open, receivable])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setLoading(true)

    const body = {
      clientId,
      value: parseFloat(value),
      referenceMonth: referenceMonth ? `${referenceMonth}-01` : undefined,
      dueDate: dueDate || undefined,
      status,
    }

    try {
      const url = receivable ? `/api/receivables/${receivable.id}` : "/api/receivables"
      const method = receivable ? "PATCH" : "POST"

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error ?? "Erro ao salvar recebível")
      }

      onSuccess()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro inesperado")
    } finally {
      setLoading(false)
    }
  }

  return (
    <DialogRoot open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{receivable ? "Editar Recebível" : "Novo Recebível"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <p className="rounded-lg bg-red-900/30 border border-red-700/50 px-3 py-2 text-sm text-red-400">
              {error}
            </p>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="rec-client">Cliente</Label>
            <Select value={clientId} onValueChange={setClientId} required>
              <SelectTrigger id="rec-client">
                <SelectValue placeholder="Selecione o cliente" />
              </SelectTrigger>
              <SelectContent>
                {clients.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="rec-value">Valor (R$)</Label>
            <Input
              id="rec-value"
              type="number"
              min="0"
              step="0.01"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="0,00"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="rec-month">Mês de Referência</Label>
              <Input
                id="rec-month"
                type="month"
                value={referenceMonth}
                onChange={(e) => setReferenceMonth(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="rec-duedate">Vencimento</Label>
              <Input
                id="rec-duedate"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="rec-status">Status</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as "PAID" | "PENDING")}>
              <SelectTrigger id="rec-status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="PENDING">Pendente</SelectItem>
                <SelectItem value="PAID">Pago</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading || !clientId}>
              {loading ? "Salvando..." : receivable ? "Salvar Alterações" : "Criar Recebível"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </DialogRoot>
  )
}
