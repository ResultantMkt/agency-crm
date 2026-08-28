import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { DashboardClient } from "./dashboard-client"

export const metadata: Metadata = {
  title: "Comercial — Dashboard de Vendas — Agency CRM",
}

export default async function ComercialDashboardPage() {
  const session = await auth()
  if (!session?.user) {
    redirect("/login")
  }

  return <DashboardClient />
}
