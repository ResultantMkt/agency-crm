"use client"

import { useState, useEffect, useCallback, useRef, useMemo } from "react"
import { useSearchParams } from "next/navigation"
import { MessageSquare, Search, ChevronDown, ChevronRight, MoreVertical, Pin, Archive, Trash2, Star } from "lucide-react"
import { ChatWindow } from "@/components/chat/chat-window"
import type { Conversation } from "@/types/models"

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTime(dateStr: string): string {
  const d = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" }).format(d)
  if (diffDays === 1) return "Ontem"
  if (diffDays < 7) return new Intl.DateTimeFormat("pt-BR", { weekday: "short" }).format(d)
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit" }).format(d)
}

function normalizePhone(p: string) { return p.replace(/\D/g, "") }

function getInitials(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("")
}

const AVATAR_COLORS = [
  "bg-blue-600", "bg-purple-600", "bg-green-600", "bg-orange-600",
  "bg-pink-600", "bg-teal-600", "bg-red-600", "bg-indigo-600",
]

function avatarColor(name: string): string {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

// ─── Avatar ───────────────────────────────────────────────────────────────────

function ContactAvatar({ name, photoUrl }: { name: string; photoUrl?: string | null }) {
  const [imgError, setImgError] = useState(false)

  if (photoUrl && !imgError) {
    return (
      <img
        src={photoUrl}
        alt={name}
        onError={() => setImgError(true)}
        className="h-10 w-10 rounded-full object-cover shrink-0"
      />
    )
  }

  return (
    <div className={`h-10 w-10 rounded-full flex items-center justify-center shrink-0 text-white text-sm font-semibold ${avatarColor(name)}`}>
      {getInitials(name) || "?"}
    </div>
  )
}

// ─── Conversation Item ────────────────────────────────────────────────────────

interface ConvItemProps {
  conv: Conversation
  isSelected: boolean
  photoUrl?: string | null
  onSelect: () => void
  onAction: (action: "archive" | "unarchive" | "pin" | "unpin" | "favorite" | "unfavorite" | "delete") => void
}

function ConvItem({ conv, isSelected, photoUrl, onSelect, onAction }: ConvItemProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  const name = conv.contactName ?? conv.lead?.name ?? conv.client?.name ?? conv.phoneNumber
  const lastMessage = conv.messages?.[0] ?? null

  useEffect(() => {
    if (!menuOpen) return
    function onOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false)
    }
    document.addEventListener("mousedown", onOutside)
    return () => document.removeEventListener("mousedown", onOutside)
  }, [menuOpen])

  return (
    <div className={`relative group flex items-center gap-3 px-3 py-2.5 cursor-pointer transition-colors hover:bg-gray-700/30 ${isSelected ? "bg-gray-700/50 border-l-2 border-blue-500" : "border-l-2 border-transparent"}`}>
      {/* Avatar — click selects conversation */}
      <div onClick={onSelect} className="shrink-0">
        <ContactAvatar name={name} photoUrl={photoUrl} />
      </div>

      {/* Content — click selects conversation */}
      <div className="flex-1 min-w-0" onClick={onSelect}>
        <div className="flex items-center justify-between gap-1">
          <div className="flex items-center gap-1.5 min-w-0">
            {conv.pinned && <Pin className="h-3 w-3 text-blue-400 shrink-0" />}
            {conv.favorite && <Star className="h-3 w-3 text-yellow-400 shrink-0 fill-yellow-400" />}
            <p className="text-sm font-medium text-white truncate">{name}</p>
          </div>
          {lastMessage && (
            <span className="shrink-0 text-[10px] text-gray-500">{formatTime(lastMessage.sentAt)}</span>
          )}
        </div>
        {lastMessage ? (
          <p className="mt-0.5 text-xs text-gray-500 truncate">
            {lastMessage.direction === "OUTBOUND" ? "Você: " : ""}{lastMessage.content}
          </p>
        ) : (
          <p className="mt-0.5 text-xs text-gray-600 italic">Sem mensagens</p>
        )}
      </div>

      {/* 3-dot menu */}
      <div ref={menuRef} className="shrink-0 relative">
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); setMenuOpen((v) => !v) }}
          className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-gray-600/50 text-gray-400 hover:text-gray-200 transition-all"
        >
          <MoreVertical className="h-4 w-4" />
        </button>

        {menuOpen && (
          <div className="absolute right-0 top-7 z-50 w-44 rounded-lg border border-gray-700 bg-gray-900 shadow-2xl py-1">
            <button
              type="button"
              onClick={() => { onAction(conv.pinned ? "unpin" : "pin"); setMenuOpen(false) }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-gray-300 hover:bg-gray-800 hover:text-white"
            >
              <Pin className="h-4 w-4" />
              {conv.pinned ? "Desfixar" : "Fixar conversa"}
            </button>
            <button
              type="button"
              onClick={() => { onAction(conv.favorite ? "unfavorite" : "favorite"); setMenuOpen(false) }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-gray-300 hover:bg-gray-800 hover:text-white"
            >
              <Star className="h-4 w-4" />
              {conv.favorite ? "Remover dos Favoritos" : "Adicionar aos Favoritos"}
            </button>
            <button
              type="button"
              onClick={() => { onAction(conv.archived ? "unarchive" : "archive"); setMenuOpen(false) }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-gray-300 hover:bg-gray-800 hover:text-white"
            >
              <Archive className="h-4 w-4" />
              {conv.archived ? "Desarquivar" : "Arquivar conversa"}
            </button>
            <div className="border-t border-gray-800 my-1" />
            <button
              type="button"
              onClick={() => { onAction("delete"); setMenuOpen(false) }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-red-400 hover:bg-gray-800 hover:text-red-300"
            >
              <Trash2 className="h-4 w-4" />
              Apagar conversa
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ChatPage() {
  const searchParams = useSearchParams()
  const phoneParam = searchParams.get("phone")

  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [archivedOpen, setArchivedOpen] = useState(false)
  const [profilePhotos, setProfilePhotos] = useState<Record<string, string | null>>({})
  const photoLoadingRef = useRef<Set<string>>(new Set())
  const autoSelectedRef = useRef(false)

  // ── Fetch conversations ──

  const fetchConversations = useCallback(async () => {
    const res = await fetch("/api/conversations")
    if (res.ok) {
      const data = await res.json()
      setConversations(Array.isArray(data) ? data : data.conversations ?? [])
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchConversations()
    const interval = setInterval(fetchConversations, 5000)
    return () => clearInterval(interval)
  }, [fetchConversations])

  // ── Auto-select from ?phone= param ──

  useEffect(() => {
    if (!phoneParam || autoSelectedRef.current || conversations.length === 0) return
    const normalized = normalizePhone(phoneParam)
    const match = conversations.find((c) => normalizePhone(c.phoneNumber) === normalized)
    if (match) setSelectedId(match.id)
    autoSelectedRef.current = true
  }, [phoneParam, conversations])

  // ── Profile photo lazy fetch ──

  function ensurePhoto(conv: Conversation) {
    if (conv.id in profilePhotos || photoLoadingRef.current.has(conv.id)) return
    photoLoadingRef.current.add(conv.id)
    fetch(`/api/zapi/profile-photo?phone=${encodeURIComponent(conv.phoneNumber)}`)
      .then((r) => r.ok ? r.json() : { url: null })
      .then((data) => setProfilePhotos((prev) => ({ ...prev, [conv.id]: data?.url ?? null })))
      .catch(() => setProfilePhotos((prev) => ({ ...prev, [conv.id]: null })))
  }

  // ── Filter + sort ──

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return conversations
    return conversations.filter((c) => {
      const name = (c.contactName ?? c.lead?.name ?? c.client?.name ?? c.phoneNumber).toLowerCase()
      const phone = c.phoneNumber.replace(/\D/g, "")
      const lastMsg = (c.messages?.[0]?.content ?? "").toLowerCase()
      return name.includes(q) || phone.includes(q.replace(/\D/g, "")) || lastMsg.includes(q)
    })
  }, [conversations, search])

  const byUpdated = (a: Conversation, b: Conversation) =>
    new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()

  const pinned = useMemo(() => filtered.filter((c) => !c.archived && c.pinned).sort(byUpdated), [filtered])
  const regular = useMemo(() => filtered.filter((c) => !c.archived && !c.pinned).sort(byUpdated), [filtered])
  const archived = useMemo(() => filtered.filter((c) => c.archived).sort(byUpdated), [filtered])

  // ── Actions ──

  async function handleAction(
    conv: Conversation,
    action: "archive" | "unarchive" | "pin" | "unpin" | "favorite" | "unfavorite" | "delete"
  ) {
    if (action === "delete") {
      if (!confirm(`Apagar a conversa com "${conv.contactName ?? conv.phoneNumber}"? Esta ação não pode ser desfeita.`)) return
      await fetch(`/api/conversations/${conv.id}`, { method: "DELETE" })
      setConversations((prev) => prev.filter((c) => c.id !== conv.id))
      if (selectedId === conv.id) setSelectedId(null)
      return
    }

    const patch: Partial<Conversation> = {}
    if (action === "archive") patch.archived = true
    if (action === "unarchive") patch.archived = false
    if (action === "pin") patch.pinned = true
    if (action === "unpin") patch.pinned = false
    if (action === "favorite") patch.favorite = true
    if (action === "unfavorite") patch.favorite = false

    setConversations((prev) => prev.map((c) => (c.id === conv.id ? { ...c, ...patch } : c)))
    await fetch(`/api/conversations/${conv.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    })
  }

  const selectedConversation = conversations.find((c) => c.id === selectedId) ?? null

  // ── Render list section ──

  function renderList(list: Conversation[]) {
    return list.map((conv) => {
      ensurePhoto(conv)
      return (
        <ConvItem
          key={conv.id}
          conv={conv}
          isSelected={conv.id === selectedId}
          photoUrl={profilePhotos[conv.id]}
          onSelect={() => setSelectedId(conv.id)}
          onAction={(action) => handleAction(conv, action)}
        />
      )
    })
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] overflow-hidden rounded-lg border border-gray-700/50">
      {/* ── Sidebar ── */}
      <div className="w-[300px] shrink-0 flex flex-col border-r border-gray-700/50 bg-gray-800/30">

        {/* Header */}
        <div className="shrink-0 px-4 pt-4 pb-3 border-b border-gray-700/50 space-y-3">
          <h2 className="font-semibold text-white">Conversas</h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-500 pointer-events-none" />
            <input
              type="text"
              placeholder="Buscar..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-gray-800 border border-gray-700 text-white rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 placeholder:text-gray-500"
            />
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="py-8 text-center text-sm text-gray-500">Carregando...</div>
          ) : (
            <>
              {/* Arquivadas (collapsible) */}
              {archived.length > 0 && (
                <div>
                  <button
                    type="button"
                    onClick={() => setArchivedOpen((v) => !v)}
                    className="w-full flex items-center gap-2 px-4 py-2.5 text-xs text-gray-400 hover:text-gray-300 hover:bg-gray-700/20 transition-colors"
                  >
                    {archivedOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                    <Archive className="h-3.5 w-3.5" />
                    <span className="font-medium">Arquivadas</span>
                    <span className="ml-auto bg-gray-700 text-gray-400 text-[10px] px-1.5 py-0.5 rounded-full">{archived.length}</span>
                  </button>
                  {archivedOpen && (
                    <div className="border-b border-gray-700/50">
                      {renderList(archived)}
                    </div>
                  )}
                </div>
              )}

              {/* Pinned */}
              {pinned.length > 0 && (
                <div className="border-b border-gray-700/50">
                  <p className="px-4 pt-2.5 pb-1 text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Fixadas</p>
                  {renderList(pinned)}
                </div>
              )}

              {/* Regular */}
              {regular.length > 0 ? (
                <div>
                  {pinned.length > 0 && (
                    <p className="px-4 pt-2.5 pb-1 text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Todas</p>
                  )}
                  {renderList(regular)}
                </div>
              ) : pinned.length === 0 && archived.length === 0 ? (
                <div className="px-4 py-8 text-center text-sm text-gray-500">Nenhuma conversa ainda.</div>
              ) : null}

              {regular.length === 0 && pinned.length === 0 && archived.length > 0 && !archivedOpen && (
                <div className="px-4 py-6 text-center text-xs text-gray-500">Todas as conversas estão arquivadas.</div>
              )}

              {search && regular.length === 0 && pinned.length === 0 && archived.length === 0 && (
                <div className="px-4 py-8 text-center text-sm text-gray-500">Nenhum resultado para "{search}".</div>
              )}
            </>
          )}
        </div>
      </div>

      {/* ── Chat area ── */}
      <div className="flex-1 bg-gray-900/50">
        {selectedConversation ? (
          <ChatWindow
            conversationId={selectedConversation.id}
            conversation={selectedConversation}
            onConversationUpdate={fetchConversations}
            onDelete={() => { setSelectedId(null); fetchConversations() }}
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-gray-600">
            <MessageSquare className="h-12 w-12 opacity-30" />
            <p className="text-sm">Selecione uma conversa</p>
          </div>
        )}
      </div>
    </div>
  )
}
