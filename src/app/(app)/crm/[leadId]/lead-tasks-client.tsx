"use client"

import { useState } from "react"
import { Plus, Clock, CheckCircle2, Circle } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { QuickTaskModal, type CreatedTask } from "@/components/crm/quick-task-modal"
import { formatDate, cn } from "@/lib/utils"
import type { Task, User } from "@/types/models"

interface LeadTasksClientProps {
  leadId: string
  initialTasks: Task[]
  users: User[]
}

export function LeadTasksClient({ leadId, initialTasks, users }: LeadTasksClientProps) {
  const [tasks, setTasks] = useState<Task[]>(initialTasks)
  const [modalOpen, setModalOpen] = useState(false)

  function handleTaskCreated(task: CreatedTask) {
    const newTask: Task = {
      id: task.id,
      title: task.title,
      description: task.description,
      status: task.status,
      dueDate: task.dueDate,
      assignedToId: task.assignedToId,
      leadId: task.leadId,
      clientId: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      assignedTo: task.assignedTo,
    }
    setTasks((prev) => [newTask, ...prev])
    setModalOpen(false)
  }

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-base font-semibold text-white">
          Tarefas ({tasks.length})
        </h3>
        <Button variant="ghost" size="sm" onClick={() => setModalOpen(true)}>
          <Plus className="h-3.5 w-3.5" />
          Nova Tarefa
        </Button>
      </div>

      {tasks.length === 0 ? (
        <p className="text-sm text-gray-500">Nenhuma tarefa vinculada a este lead.</p>
      ) : (
        <ul className="space-y-2">
          {tasks.map((task) => (
            <li
              key={task.id}
              className="flex items-start gap-3 bg-gray-800/60 border border-gray-700/50 rounded-lg px-4 py-3"
            >
              {task.status === "DONE" ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-400 mt-0.5 shrink-0" />
              ) : (
                <Circle className="h-4 w-4 text-gray-500 mt-0.5 shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <p
                  className={cn(
                    "text-sm font-medium",
                    task.status === "DONE" ? "text-gray-500 line-through" : "text-white"
                  )}
                >
                  {task.title}
                </p>
                {task.description && (
                  <p className="text-xs text-gray-500 mt-0.5 truncate">{task.description}</p>
                )}
                <div className="flex items-center gap-3 mt-1">
                  {task.assignedTo && (
                    <span className="text-xs text-gray-500">{task.assignedTo.name}</span>
                  )}
                  {task.dueDate && (
                    <span className="text-xs text-gray-500 flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatDate(task.dueDate)}
                    </span>
                  )}
                </div>
              </div>
              <Badge
                variant={task.status === "DONE" ? "success" : "warning"}
                className="shrink-0 text-xs"
              >
                {task.status === "DONE" ? "Concluída" : "Pendente"}
              </Badge>
            </li>
          ))}
        </ul>
      )}

      <QuickTaskModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={handleTaskCreated}
        leadId={leadId}
        users={users}
      />
    </section>
  )
}
