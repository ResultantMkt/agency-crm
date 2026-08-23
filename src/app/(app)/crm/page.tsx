import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { KanbanBoard } from "@/components/crm/kanban-board"
import type { Lead, User } from "@/types/models"

export const metadata: Metadata = {
  title: "CRM — Agency CRM",
}

export default async function CrmPage() {
  const session = await auth()
  if (!session) redirect("/login")

  const [rawLeads, rawUsers] = await Promise.all([
    prisma.lead.findMany({
      include: {
        assignedTo: { select: { name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.user.findMany({
      select: { id: true, name: true, email: true, role: true },
      orderBy: { name: "asc" },
    }),
  ])

  // Serializar Decimal e Dates para JSON-safe
  const leads: Lead[] = JSON.parse(JSON.stringify(rawLeads))
  const users: User[] = JSON.parse(JSON.stringify(rawUsers))

  return <KanbanBoard initialLeads={leads} users={users} />
}
