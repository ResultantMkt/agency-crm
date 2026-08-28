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
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { Task, User } from "@/types/models"

interface TaskFormProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
  task?: Task
  users: User[]
  leads?: { id: string; name: string }[]
  clients?: { id: string; name: string }[]
}

const NONE = "__none__"

export function TaskForm({
  open,
  onClose,
  onSuccess,
  task,
  users,
  leads = [],
  clients = [],
}: TaskFormProps) {
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [assignedToId, setAssignedToId] = useState(NONE)
  const [dueDate, setDueDate] = useState("")
  const [status, setStatus] = useState<"PENDING" | "DONE">("PENDING")
  const [leadId, setLeadId] = useState(NONE)
  const [clientId, setClientId] = useState(NONE)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    if (open) {
      if (task) {
        setTitle(task.title)
        setDescription(task.description ?? "")
        setAssignedToId(task.assignedToId ?? NONE)
        setDueDate(task.dueDate ? task.dueDate.slice(0, 10) : "")
        setStatus(task.status)
        setLeadId(task.leadId ?? NONE)
        setClientId(task.clientId ?? NONE)
      } else {
        setTitle("")
        setDescription("")
        setAssignedToId(NONE)
        setDueDate("")
        setStatus("PENDING")
        setLeadId(NONE)
        setClientId(NONE)
      }
      setError("")
    }
  }, [open, task])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setLoading(true)

    const body: Record<string, unknown> = {
      title,
      description: description || null,
      assignedToId: assignedToId === NONE ? null : assignedToId,
      dueDate: dueDate || null,
      status,
      leadId: leadId === NONE ? null : leadId,
      clientId: clientId === NONE ? null : clientId,
    }

    try {
      const url = task ? `/api/tasks/${task.id}` : "/api/tasks"
      const method = task ? "PATCH" : "POST"

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        if (data.details && Array.isArray(data.details)) {
          const fieldLabels: Record<string, string> = {
            title: "Título", description: "Descrição", assignedToId: "Responsável",
            dueDate: "Prazo", status: "Status", leadId: "Lead", clientId: "Cliente",
          }
          const msg = data.details
            .map((i: { path: string[]; message: string }) =>
              `${fieldLabels[i.path[0]] ?? i.path.join(".")}: ${i.message}`
            )
            .join(" | ")
          throw new Error(msg)
        }
        throw new Error(data.error ?? "Erro ao salvar tarefa")
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
          <DialogTitle>{task ? "Editar Tarefa" : "Nova Tarefa"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <p className="rounded-lg bg-red-900/30 border border-red-700/50 px-3 py-2 text-sm text-red-400">
              {error}
            </p>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="task-title">Título</Label>
            <Input
              id="task-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Título da tarefa"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="task-desc">Descrição</Label>
            <Textarea
              id="task-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descreva os detalhes da tarefa..."
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="task-user">Responsável</Label>
              <Select value={assignedToId} onValueChange={setAssignedToId}>
                <SelectTrigger id="task-user">
                  <SelectValue placeholder="Selecionar..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>Nenhum</SelectItem>
                  {users.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="task-due">Prazo</Label>
              <Input
                id="task-due"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="task-status">Status</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as "PENDING" | "DONE")}>
              <SelectTrigger id="task-status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="PENDING">Pendente</SelectItem>
                <SelectItem value="DONE">Concluída</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {leads.length > 0 && (
            <div className="space-y-1.5">
              <Label htmlFor="task-lead">Vincular a Lead (opcional)</Label>
              <Select value={leadId} onValueChange={setLeadId}>
                <SelectTrigger id="task-lead">
                  <SelectValue placeholder="Selecionar lead..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>Nenhuma</SelectItem>
                  {leads.map((l) => (
                    <SelectItem key={l.id} value={l.id}>
                      {l.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {clients.length > 0 && (
            <div className="space-y-1.5">
              <Label htmlFor="task-client">Vincular a Cliente (opcional)</Label>
              <Select value={clientId} onValueChange={setClientId}>
                <SelectTrigger id="task-client">
                  <SelectValue placeholder="Selecionar cliente..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>Nenhum</SelectItem>
                  {clients.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Salvando..." : task ? "Salvar Alterações" : "Criar Tarefa"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </DialogRoot>
  )
}
