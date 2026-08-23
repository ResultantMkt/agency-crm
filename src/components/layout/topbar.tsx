"use client"

import { signOut, useSession } from "next-auth/react"
import { usePathname } from "next/navigation"
import { LogOut } from "lucide-react"

const PAGE_TITLES: Record<string, string> = {
  "/dashboard": "Visão Geral",
  "/comercial/dashboard": "Comercial — Dashboard de Vendas",
  "/crm": "CRM — Pipeline de Leads",
  "/chat": "Chats — WhatsApp",
  "/tasks": "Tarefas",
  "/financial": "Financeiro",
  "/clients": "Gestão de Clientes",
  "/settings/users": "Configurações — Usuários",
  "/settings/integrations": "Configurações — Integrações",
}

function getPageTitle(pathname: string): string {
  if (PAGE_TITLES[pathname]) return PAGE_TITLES[pathname]
  for (const [key, title] of Object.entries(PAGE_TITLES)) {
    if (pathname.startsWith(key + "/")) return title
  }
  return "Agency CRM"
}

export function Topbar() {
  const { data: session } = useSession()
  const pathname = usePathname()
  const title = getPageTitle(pathname)

  return (
    <header className="flex h-16 items-center justify-between border-b border-gray-700/50 bg-gray-900 px-6">
      {/* Page title */}
      <h1 className="text-lg font-semibold text-white">{title}</h1>

      {/* User menu */}
      <div className="flex items-center gap-3">
        {/* User info */}
        <div className="hidden sm:block text-right">
          <p className="text-sm font-medium text-white leading-none">
            {session?.user?.name ?? "Usuário"}
          </p>
          <p className="text-xs text-gray-400 mt-0.5">
            {session?.user?.email ?? ""}
          </p>
        </div>

        {/* Avatar */}
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white uppercase shrink-0">
          {session?.user?.name?.charAt(0) ?? "U"}
        </div>

        {/* Logout button */}
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-gray-400 transition-colors hover:bg-gray-700/50 hover:text-white"
          aria-label="Sair"
        >
          <LogOut className="h-4 w-4" />
          <span className="hidden sm:inline">Sair</span>
        </button>
      </div>
    </header>
  )
}
