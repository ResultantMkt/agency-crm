import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { Sidebar } from "@/components/layout/sidebar"
import { Topbar } from "@/components/layout/topbar"

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()

  if (!session?.user) {
    redirect("/login")
  }

  const overdueCount = await prisma.task.count({
    where: {
      status: "PENDING",
      dueDate: {
        lt: new Date(),
      },
    },
  })

  return (
    <div className="flex h-screen overflow-hidden bg-gray-950">
      <Sidebar overdueCount={overdueCount} />

      {/* Main content area — offset by sidebar width */}
      <div className="flex flex-1 flex-col overflow-hidden pl-60">
        <Topbar />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  )
}
