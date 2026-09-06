"use client"

import { usePathname } from "next/navigation"

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
  const pathname = usePathname()
  const title = getPageTitle(pathname)

  return (
    <header className="flex h-16 items-center border-b border-gray-200 bg-white px-6">
      <h1 className="text-lg font-semibold text-gray-900">{title}</h1>
    </header>
  )
}
