"use client"

import { useState, useEffect, useCallback } from "react"
import { Plus, Trash2, CheckCircle, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { formatDate } from "@/lib/utils"
import { TaskForm } from "@/components/tasks/task-form"
import type { Task, User } from "@/types/models"

interface TaskGroup {
  label: string
  tasks: Task[]
  isOverdue?: boolean
}

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [leads, setLeads] = useState<{ id: string; name: string }[]>([])
  const [clients, setClients] = useState<{ id: string; name: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | undefined>()
  const [filterUserId, setFilterUserId] = useState("")

  const fetchTasks = useCallback(async () => {
    const res = await fetch("/api/tasks?limit=200")
    if (res.ok) {
      const data = await res.json()
      setTasks(JSON.parse(JSON.stringify(Array.isArray(data) ? data : data.tasks ?? [])))
    }
  }, [])

  useEffect(() => {
    async function init() {
      setLoading(true)
      await Promise.all([
        fetchTasks(),
        fetch("/api/users")
          .then((r) => r.ok && r.json())
          .then((d) => d && setUsers(d)),
        fetch("/api/leads?limit=200")
          .then((r) => r.ok && r.json())
          .then((d) => d && setLeads(Array.isArray(d) ? d : d.leads ?? [])),
        fetch("/api/clients?limit=200")
          .then((r) => r.ok && r.json())
          .then((d) => d && setClients(Array.isArray(d) ? d : d.clients ?? [])),
      ])
      setLoading(false)
    }
    init()
  }, [fetchTasks])

  async function completeTask(id: string) {
    await fetch(`/api/tasks/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "DONE" }),
    })
    fetchTasks()
  }

  async function deleteTask(id: string) {
    if (!confirm("Excluir esta tarefa?")) return
    await fetch(`/api/tasks/${id}`, { method: "DELETE" })
    fetchTasks()
  }

  const now = new Date()

  const filtered = filterUserId
    ? tasks.filter((t) => t.assignedToId === filterUserId)
    : tasks

  const overdue = filtered.filter(
    (t) =>
      t.status === "PENDING" &&
      t.dueDate &&
      new Date(t.dueDate) < now
  )
  const pending = filtered.filter(
    (t) =>
      t.status === "PENDING" &&
      (!t.dueDate || new Date(t.dueDate) >= now)
  )
  const done = filtered.filter((t) => t.status === "DONE")

  const groups: TaskGroup[] = [
    { label: "Atrasadas", tasks: overdue, isOverdue: true },
    { label: "Pendentes", tasks: pending },
    { label: "Concluídas", tasks: done },
  ]

  function TaskItem({ task, isOverdue }: { task: Task; isOverdue?: boolean }) {
    return (
      <div
        className={`rounded-lg border p-4 transition-colors ${
          isOverdue
            ? "bg-red-900/20 border-red-700/50"
            : "bg-gray-800/30 border-gray-700/30 hover:bg-gray-800/50"
        }`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium text-white">{task.title}</span>
              {isOverdue && (
                <Badge variant="destructive" className="shrink-0">
                  <AlertCircle className="h-3 w-3 mr-1" />
                  Atrasada
                </Badge>
              )}
              {task.status === "DONE" && (
                <Badge variant="success">Concluída</Badge>
              )}
            </div>

            <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500">
              {task.assignedTo && (
                <span>Responsável: {task.assignedTo.name}</span>
              )}
              {task.dueDate && (
                <span className={isOverdue ? "text-red-400" : ""}>
                  Prazo: {formatDate(task.dueDate)}
                </span>
              )}
              {task.lead && <span>Lead: {task.lead.name}</span>}
              {task.client && <span>Cliente: {task.client.name}</span>}
            </div>

            {task.description && (
              <p className="mt-1.5 text-sm text-gray-400 line-clamp-2">
                {task.description}
              </p>
            )}
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {task.status === "PENDING" && (
              <button
                onClick={() => completeTask(task.id)}
                className="flex items-center gap-1 rounded px-2 py-1 text-xs text-emerald-400 hover:text-emerald-300 hover:bg-emerald-900/20 transition-colors"
              >
                <CheckCircle className="h-3.5 w-3.5" />
                Concluir
              </button>
            )}
            <button
              onClick={() => {
                setEditingTask(task)
                setFormOpen(true)
              }}
              className="rounded p-1.5 text-gray-500 hover:text-white hover:bg-gray-700/50 transition-colors text-xs"
            >
              Editar
            </button>
            <button
              onClick={() => deleteTask(task.id)}
              className="rounded p-1.5 text-gray-500 hover:text-red-400 hover:bg-red-900/20 transition-colors"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">Tarefas</h2>
          <p className="mt-1 text-sm text-gray-400">
            {overdue.length > 0
              ? `${overdue.length} tarefa${overdue.length !== 1 ? "s" : ""} atrasada${overdue.length !== 1 ? "s" : ""}`
              : "Tudo em dia"}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {users.length > 0 && (
            <select
              value={filterUserId}
              onChange={(e) => setFilterUserId(e.target.value)}
              className="h-9 rounded-lg border border-gray-700 bg-gray-800 px-3 text-sm text-white outline-none focus:border-blue-500"
            >
              <option value="">Todos os responsáveis</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
          )}

          <Button
            onClick={() => {
              setEditingTask(undefined)
              setFormOpen(true)
            }}
          >
            <Plus className="h-4 w-4" />
            Nova Tarefa
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="py-12 text-center text-gray-500">Carregando tarefas...</div>
      ) : (
        <div className="space-y-8">
          {groups.map((group) =>
            group.tasks.length === 0 && group.label === "Concluídas" ? null : (
              <section key={group.label}>
                <div className="mb-3 flex items-center gap-2">
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-400">
                    {group.label}
                  </h3>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      group.isOverdue
                        ? "bg-red-900/30 text-red-400"
                        : "bg-gray-700/50 text-gray-400"
                    }`}
                  >
                    {group.tasks.length}
                  </span>
                </div>

                {group.tasks.length === 0 ? (
                  <p className="text-sm text-gray-600">
                    {group.label === "Atrasadas"
                      ? "Nenhuma tarefa atrasada."
                      : "Nenhuma tarefa pendente."}
                  </p>
                ) : (
                  <div className="space-y-2">
                    {group.tasks.map((task) => (
                      <TaskItem key={task.id} task={task} isOverdue={group.isOverdue} />
                    ))}
                  </div>
                )}
              </section>
            )
          )}

          {filtered.length === 0 && (
            <div className="py-12 text-center text-gray-500">
              Nenhuma tarefa encontrada.
            </div>
          )}
        </div>
      )}

      <TaskForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSuccess={() => {
          setFormOpen(false)
          fetchTasks()
        }}
        task={editingTask}
        users={users}
        leads={leads}
        clients={clients}
      />
    </div>
  )
}
