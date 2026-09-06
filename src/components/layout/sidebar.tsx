"use client"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { signOut, useSession } from "next-auth/react"
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
  ChevronUp,
  LogOut,
  UserCircle,
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

function markSeen(section: "crm" | "chats") {
  fetch("/api/notifications/mark-seen", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ section }),
  }).catch(() => {})
}

function getInitials(name?: string | null): string {
  if (!name) return "U"
  return name.split(" ").slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("")
}

export function Sidebar({ overdueCount = 0 }: SidebarProps) {
  const pathname = usePathname()
  const pathnameRef = useRef(pathname)
  const { data: session } = useSession()

  const [crmCount, setCrmCount] = useState(0)
  const [chatsCount, setChatsCount] = useState(0)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const userMenuRef = useRef<HTMLDivElement>(null)

  const comercialActive = isGroupActive(pathname, ["/comercial", "/crm", "/chat", "/tasks"])
  const settingsActive = isGroupActive(pathname, ["/settings"])

  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    comercial: comercialActive,
    settings: settingsActive,
  })

  useEffect(() => { pathnameRef.current = pathname }, [pathname])

  useEffect(() => {
    if (isActiveLink(pathname, "/crm")) { setCrmCount(0); markSeen("crm") }
    if (isActiveLink(pathname, "/chat")) { setChatsCount(0); markSeen("chats") }
  }, [pathname])

  useEffect(() => {
    function fetchCounts() {
      fetch("/api/notifications/counts")
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (!data) return
          if (!isActiveLink(pathnameRef.current, "/crm")) setCrmCount(data.crm ?? 0)
          if (!isActiveLink(pathnameRef.current, "/chat")) setChatsCount(data.chats ?? 0)
        })
        .catch(() => {})
    }
    fetchCounts()
    const id = setInterval(fetchCounts, 20_000)
    return () => clearInterval(id)
  }, [])

  // Close user menu on outside click
  useEffect(() => {
    if (!userMenuOpen) return
    function onOutside(e: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false)
      }
    }
    document.addEventListener("mousedown", onOutside)
    return () => document.removeEventListener("mousedown", onOutside)
  }, [userMenuOpen])

  function toggle(key: string) {
    setExpanded((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  const navItems: NavItem[] = [
    { type: "link", href: "/dashboard", label: "Visão Geral", icon: LayoutDashboard },
    {
      type: "group",
      key: "comercial",
      label: "Comercial",
      icon: TrendingUp,
      activeWhen: ["/comercial", "/crm", "/chat", "/tasks"],
      children: [
        { href: "/comercial/dashboard", label: "Dashboard", icon: BarChart2 },
        { href: "/crm", label: "CRM", icon: Kanban, badge: crmCount },
        { href: "/chat", label: "Chats", icon: MessageSquare, badge: chatsCount },
        { href: "/tasks", label: "Tarefas", icon: CheckSquare, badge: overdueCount },
      ],
    },
    { type: "link", href: "/financial", label: "Financeiro", icon: DollarSign },
    { type: "link", href: "/clients", label: "Gestão de Clientes", icon: Building2 },
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
    <aside className="fixed left-0 top-0 z-40 flex h-screen w-60 flex-col bg-white border-r border-gray-200">
      {/* Logo */}
      <div className="flex h-16 items-center px-6 border-b border-gray-200">
        <span className="text-lg font-bold text-gray-900 tracking-tight">
          Agency <span className="text-purple-600">CRM</span>
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
                        ? "bg-purple-50 text-purple-700"
                        : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span>{item.label}</span>
                  </Link>
                </li>
              )
            }

            const Icon = item.icon
            const groupActive = isGroupActive(pathname, item.activeWhen)
            const isExpanded = expanded[item.key] ?? false
            const Chevron = isExpanded ? ChevronDown : ChevronRight

            return (
              <li key={item.key}>
                <button
                  type="button"
                  onClick={() => toggle(item.key)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                    groupActive
                      ? "text-gray-900 hover:bg-gray-100"
                      : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="flex-1 text-left">{item.label}</span>
                  <Chevron className="h-3.5 w-3.5 shrink-0 transition-transform" />
                </button>

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
                                ? "bg-purple-50 text-purple-700"
                                : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
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

      {/* User block — fixed at bottom */}
      <div ref={userMenuRef} className="relative border-t border-gray-200 p-3">
        {/* Popover menu (opens upward) */}
        {userMenuOpen && (
          <div className="absolute bottom-full left-3 right-3 mb-2 rounded-xl border border-gray-200 bg-white shadow-lg py-1 z-50">
            <Link
              href="/settings/users"
              onClick={() => setUserMenuOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-gray-900 transition-colors"
            >
              <UserCircle className="h-4 w-4 text-gray-400" />
              Gerenciar conta
            </Link>
            <div className="border-t border-gray-100 my-1" />
            <button
              type="button"
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
            >
              <LogOut className="h-4 w-4" />
              Sair
            </button>
          </div>
        )}

        {/* User trigger button */}
        <button
          type="button"
          onClick={() => setUserMenuOpen((v) => !v)}
          className="flex w-full items-center gap-2.5 rounded-lg px-2 py-2 transition-colors hover:bg-gray-100"
        >
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-purple-600 text-xs font-bold text-white uppercase">
            {getInitials(session?.user?.name)}
          </div>
          <div className="flex-1 min-w-0 text-left">
            <p className="text-sm font-medium text-gray-900 truncate leading-none">
              {session?.user?.name ?? "Usuário"}
            </p>
            <p className="text-xs text-gray-500 truncate mt-0.5">
              {session?.user?.email ?? ""}
            </p>
          </div>
          <ChevronUp className={cn("h-3.5 w-3.5 shrink-0 text-gray-400 transition-transform", userMenuOpen && "rotate-180")} />
        </button>
      </div>
    </aside>
  )
}
