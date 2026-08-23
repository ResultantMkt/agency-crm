"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  TrendingUp,
  BarChart2,
  Kanban,
  MessageSquare,
  CheckSquare,
  DollarSign,
  Building2,
  Settings,
  Users,
  Plug,
  ChevronDown,
  ChevronRight,
} from "lucide-react"
import { cn } from "@/lib/utils"

interface SidebarProps {
  overdueCount?: number
}

interface SubItem {
  href: string
  label: string
  icon: React.ElementType
  badge?: number
}

interface NavGroup {
  type: "group"
  key: string
  label: string
  icon: React.ElementType
  activeWhen: string[]
  children: SubItem[]
}

interface NavLink {
  type: "link"
  href: string
  label: string
  icon: React.ElementType
}

type NavItem = NavGroup | NavLink

function isActiveLink(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(href + "/")
}

function isGroupActive(pathname: string, activeWhen: string[]): boolean {
  return activeWhen.some((prefix) => pathname.startsWith(prefix))
}

export function Sidebar({ overdueCount = 0 }: SidebarProps) {
  const pathname = usePathname()

  const comercialActive = isGroupActive(pathname, [
    "/comercial",
    "/crm",
    "/chat",
    "/tasks",
  ])
  const settingsActive = isGroupActive(pathname, ["/settings"])

  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    comercial: comercialActive,
    settings: settingsActive,
  })

  function toggle(key: string) {
    setExpanded((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  const navItems: NavItem[] = [
    {
      type: "link",
      href: "/dashboard",
      label: "Visão Geral",
      icon: LayoutDashboard,
    },
    {
      type: "group",
      key: "comercial",
      label: "Comercial",
      icon: TrendingUp,
      activeWhen: ["/comercial", "/crm", "/chat", "/tasks"],
      children: [
        { href: "/comercial/dashboard", label: "Dashboard", icon: BarChart2 },
        { href: "/crm", label: "CRM", icon: Kanban },
        { href: "/chat", label: "Chats", icon: MessageSquare },
        {
          href: "/tasks",
          label: "Tarefas",
          icon: CheckSquare,
          badge: overdueCount,
        },
      ],
    },
    {
      type: "link",
      href: "/financial",
      label: "Financeiro",
      icon: DollarSign,
    },
    {
      type: "link",
      href: "/clients",
      label: "Gestão de Clientes",
      icon: Building2,
    },
    {
      type: "group",
      key: "settings",
      label: "Configurações",
      icon: Settings,
      activeWhen: ["/settings"],
      children: [
        { href: "/settings/users", label: "Usuários", icon: Users },
        { href: "/settings/integrations", label: "Integrações", icon: Plug },
      ],
    },
  ]

  return (
    <aside className="fixed left-0 top-0 z-40 flex h-screen w-60 flex-col bg-gray-900 border-r border-gray-700/50">
      {/* Logo */}
      <div className="flex h-16 items-center px-6 border-b border-gray-700/50">
        <span className="text-lg font-bold text-white tracking-tight">
          Agency <span className="text-blue-500">CRM</span>
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-3">
        <ul className="space-y-1">
          {navItems.map((item) => {
            if (item.type === "link") {
              const Icon = item.icon
              const active = isActiveLink(pathname, item.href)

              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                      active
                        ? "bg-blue-600 text-white"
                        : "text-gray-400 hover:bg-gray-700/50 hover:text-white"
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span>{item.label}</span>
                  </Link>
                </li>
              )
            }

            // type === "group"
            const Icon = item.icon
            const groupActive = isGroupActive(pathname, item.activeWhen)
            const isExpanded = expanded[item.key] ?? false
            const Chevron = isExpanded ? ChevronDown : ChevronRight

            return (
              <li key={item.key}>
                {/* Group header — toggles expand, does not navigate */}
                <button
                  type="button"
                  onClick={() => toggle(item.key)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                    groupActive
                      ? "text-white hover:bg-gray-700/50"
                      : "text-gray-400 hover:bg-gray-700/50 hover:text-white"
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="flex-1 text-left">{item.label}</span>
                  <Chevron className="h-3.5 w-3.5 shrink-0 transition-transform" />
                </button>

                {/* Sub-items */}
                {isExpanded && (
                  <ul className="mt-1 space-y-1">
                    {item.children.map((child) => {
                      const ChildIcon = child.icon
                      const childActive = isActiveLink(pathname, child.href)

                      return (
                        <li key={child.href}>
                          <Link
                            href={child.href}
                            className={cn(
                              "flex items-center gap-3 rounded-lg pl-8 pr-3 py-2 text-sm font-medium transition-colors",
                              childActive
                                ? "bg-blue-600 text-white"
                                : "text-gray-400 hover:bg-gray-700/50 hover:text-white"
                            )}
                          >
                            <ChildIcon className="h-4 w-4 shrink-0" />
                            <span className="flex-1">{child.label}</span>
                            {child.badge != null && child.badge > 0 && (
                              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-xs font-bold text-white">
                                {child.badge > 99 ? "99+" : child.badge}
                              </span>
                            )}
                          </Link>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </li>
            )
          })}
        </ul>
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-gray-700/50">
        <p className="text-xs text-gray-600 text-center">Agency CRM v1.0</p>
      </div>
    </aside>
  )
}
