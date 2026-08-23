import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { ClientsClient } from "./clients-client"
import type { Client } from "@/types/models"

export const metadata: Metadata = {
  title: "Clientes — Agency CRM",
}

export default async function ClientsPage() {
  const session = await auth()
  if (!session) redirect("/login")

  const rawClients = await prisma.client.findMany({
    orderBy: { createdAt: "desc" },
  })

  const clients: Client[] = JSON.parse(JSON.stringify(rawClients))

  return <ClientsClient initialClients={clients} />
}
