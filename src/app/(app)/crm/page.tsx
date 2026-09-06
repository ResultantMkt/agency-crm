import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { KanbanBoard } from "@/components/crm/kanban-board"
import type { Lead, User, PipelineStage } from "@/types/models"

export const metadata: Metadata = {
  title: "CRM — Agency CRM",
}

export default async function CrmPage() {
  const session = await auth()
  if (!session) redirect("/login")

  const [rawLeads, rawUsers, rawStages] = await Promise.all([
    prisma.lead.findMany({
      include: {
        assignedTo: { select: { name: true, email: true } },
        tasks: { select: { id: true, title: true, status: true, dueDate: true } },
      },
      orderBy: [{ position: "asc" }, { createdAt: "desc" }],
    }),
    prisma.user.findMany({
      select: { id: true, name: true, email: true, role: true },
      orderBy: { name: "asc" },
    }),
    prisma.pipelineStage.findMany({ orderBy: { position: "asc" } }),
  ])

  // Serializar Decimal e Dates para JSON-safe
  const leads: Lead[] = JSON.parse(JSON.stringify(rawLeads))
  const users: User[] = JSON.parse(JSON.stringify(rawUsers))
  const stages: PipelineStage[] = JSON.parse(JSON.stringify(rawStages))

  return <KanbanBoard initialLeads={leads} users={users} stages={stages} isAdmin={session.user.role === "ADMIN"} />
}
