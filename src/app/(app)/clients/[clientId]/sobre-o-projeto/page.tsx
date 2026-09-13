import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, FileText } from "lucide-react"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export default async function SobreOProjetoPage({
  params,
}: {
  params: Promise<{ clientId: string }>
}) {
  const session = await auth()
  if (!session) redirect("/login")

  const { clientId } = await params

  const client = await prisma.client.findUnique({ where: { id: clientId }, select: { name: true } })
  if (!client) notFound()

  return (
    <div className="space-y-6 max-w-4xl">
      <Link
        href={`/clients/${clientId}`}
        className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        {client.name}
      </Link>

      <div className="flex items-center gap-3">
        <div className="rounded-md bg-gray-100 p-2 border border-gray-200/60">
          <FileText className="h-5 w-5 text-gray-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900">Sobre o Projeto</h2>
      </div>

      <EmptyState />
    </div>
  )
}

function EmptyState() {
  return (
    <div className="rounded-lg border border-dashed border-gray-200 p-16 text-center">
      <p className="text-sm font-medium text-gray-500">Em construção</p>
      <p className="text-xs text-gray-400 mt-1">Esta seção será implementada em breve.</p>
    </div>
  )
}
