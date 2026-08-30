"use client"

import { useState, useEffect, useRef, useCallback, useMemo } from "react"
import {
  Send, Clock, AlertTriangle, Pencil, Check, X,
  Search, Pin, Archive, Star, Trash2, MoreVertical,
  ChevronUp, ChevronDown,
} from "lucide-react"
import { MessageBubble } from "@/components/chat/message-bubble"
import { ContactPanel } from "@/components/chat/contact-panel"
import type { Conversation, Message } from "@/types/models"

interface ChatWindowProps {
  conversationId: string
  conversation: Conversation
  photoUrl?: string | null
  onConversationUpdate?: () => void
  onDelete?: () => void
}

export function ChatWindow({
  conversationId,
  conversation,
  photoUrl,
  onConversationUpdate,
  onDelete,
}: ChatWindowProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [sending, setSending] = useState(false)
  const [queuePaused, setQueuePaused] = useState(false)
  const [queuePendingCount, setQueuePendingCount] = useState(0)
  const [dailyLimitReached, setDailyLimitReached] = useState(false)

  // Contact panel
  const [contactPanelOpen, setContactPanelOpen] = useState(false)

  // Name editing
  const [editingName, setEditingName] = useState(false)
  const [nameInput, setNameInput] = useState("")
  const [savingName, setSavingName] = useState(false)

  // Search in conversation
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [matchCursor, setMatchCursor] = useState(0)

  // Header 3-dot menu
  const [headerMenuOpen, setHeaderMenuOpen] = useState(false)
  const headerMenuRef = useRef<HTMLDivElement>(null)

  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const nameInputRef = useRef<HTMLInputElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const matchRefs = useRef<(HTMLDivElement | null)[]>([])

  // ── Fetch messages ──

  const fetchMessages = useCallback(async () => {
    const res = await fetch(`/api/conversations/${conversationId}/messages`)
    if (res.ok) {
      const data = await res.json()
      setMessages(Array.isArray(data) ? data : data.messages ?? [])
    }
  }, [conversationId])

  const triggerQueueProcess = useCallback(async () => {
    try {
      const res = await fetch("/api/queue/process", { method: "POST" })
      if (!res.ok) return
      const result = await res.json()
      if (result.status === "paused") setQueuePaused(true)
      else setQueuePaused(false)
      if (result.status === "daily_limit_reached") {
        setDailyLimitReached(true)
        setQueuePendingCount(result.pendingCount ?? 0)
      } else {
        setDailyLimitReached(false)
      }
      if (result.status === "sent") fetchMessages()
    } catch { /* silently ignore */ }
  }, [fetchMessages])

  useEffect(() => {
    fetchMessages()
    const msgInterval = setInterval(fetchMessages, 3000)
    return () => clearInterval(msgInterval)
  }, [fetchMessages])

  useEffect(() => {
    const queueInterval = setInterval(triggerQueueProcess, 3000)
    return () => clearInterval(queueInterval)
  }, [triggerQueueProcess])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  // ── Header menu outside click ──

  useEffect(() => {
    if (!headerMenuOpen) return
    function onOutside(e: MouseEvent) {
      if (headerMenuRef.current && !headerMenuRef.current.contains(e.target as Node)) {
        setHeaderMenuOpen(false)
      }
    }
    document.addEventListener("mousedown", onOutside)
    return () => document.removeEventListener("mousedown", onOutside)
  }, [headerMenuOpen])

  // ── Search ──

  const matchIds = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return []
    return messages.filter((m) => m.content.toLowerCase().includes(q)).map((m) => m.id)
  }, [messages, searchQuery])

  useEffect(() => { setMatchCursor(0) }, [matchIds])

  useEffect(() => {
    if (matchIds.length === 0) return
    const el = matchRefs.current[matchCursor]
    el?.scrollIntoView({ behavior: "smooth", block: "center" })
  }, [matchCursor, matchIds])

  function openSearch() {
    setSearchOpen(true)
    setTimeout(() => searchInputRef.current?.focus(), 0)
  }

  function closeSearch() {
    setSearchOpen(false)
    setSearchQuery("")
    setMatchCursor(0)
  }

  function navMatch(dir: 1 | -1) {
    if (matchIds.length === 0) return
    setMatchCursor((prev) => (prev + dir + matchIds.length) % matchIds.length)
  }

  // ── Send ──

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault()
    const content = input.trim()
    if (!content || sending) return

    const optimistic: Message = {
      id: `opt-${Date.now()}`,
      conversationId,
      content,
      direction: "OUTBOUND",
      sentAt: new Date().toISOString(),
      senderName: null,
    }
    setMessages((prev) => [...prev, optimistic])
    setInput("")
    setSending(true)

    try {
      const res = await fetch("/api/messages/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId, content }),
      })
      if (res.ok) {
        await fetchMessages()
        triggerQueueProcess()
      }
    } finally {
      setSending(false)
      inputRef.current?.focus()
    }
  }

  // ── Name editing ──

  const resolvedName =
    conversation.contactName ?? conversation.lead?.name ?? conversation.client?.name ?? conversation.phoneNumber

  function startEditing() {
    setNameInput(resolvedName)
    setEditingName(true)
    setTimeout(() => nameInputRef.current?.select(), 0)
  }

  function cancelEditing() { setEditingName(false); setNameInput("") }

  async function saveName() {
    const trimmed = nameInput.trim()
    if (!trimmed || trimmed === resolvedName) { cancelEditing(); return }
    setSavingName(true)
    try {
      const res = await fetch(`/api/conversations/${conversationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contactName: trimmed }),
      })
      if (res.ok) onConversationUpdate?.()
    } finally {
      setSavingName(false)
      setEditingName(false)
      setNameInput("")
    }
  }

  // ── Conversation-level actions ──

  async function patchConversation(patch: Record<string, unknown>) {
    await fetch(`/api/conversations/${conversationId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    })
    onConversationUpdate?.()
  }

  async function handleHeaderAction(
    action: "archive" | "unarchive" | "pin" | "unpin" | "favorite" | "unfavorite" | "delete"
  ) {
    setHeaderMenuOpen(false)
    if (action === "delete") {
      if (!confirm(`Apagar a conversa com "${resolvedName}"? Esta ação não pode ser desfeita.`)) return
      await fetch(`/api/conversations/${conversationId}`, { method: "DELETE" })
      onDelete?.()
      return
    }
    const patch: Record<string, boolean> = {}
    if (action === "archive") patch.archived = true
    if (action === "unarchive") patch.archived = false
    if (action === "pin") patch.pinned = true
    if (action === "unpin") patch.pinned = false
    if (action === "favorite") patch.favorite = true
    if (action === "unfavorite") patch.favorite = false
    await patchConversation(patch)
  }

  // ── Pin message ──

  async function handlePinMessage(msgId: string) {
    const newPinnedId = conversation.pinnedMessageId === msgId ? null : msgId
    await patchConversation({ pinnedMessageId: newPinnedId })
  }

  const pinnedMessage = messages.find((m) => m.id === conversation.pinnedMessageId) ?? null

  // ── Render ──

  return (
    <div className="flex h-full flex-row overflow-hidden">
    <div className="flex flex-1 flex-col min-w-0">

      {/* ── Header ── */}
      <div className="shrink-0 border-b border-gray-700/50 px-4 py-3">
        {searchOpen ? (
          /* Search bar replaces header content */
          <div className="flex items-center gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-500 pointer-events-none" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") navMatch(e.shiftKey ? -1 : 1)
                  if (e.key === "Escape") closeSearch()
                }}
                placeholder="Buscar na conversa..."
                className="w-full pl-8 pr-3 py-1.5 text-sm bg-gray-800 border border-gray-700 text-white rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 placeholder:text-gray-500"
              />
            </div>
            {matchIds.length > 0 && (
              <span className="text-xs text-gray-400 shrink-0">
                {matchCursor + 1}/{matchIds.length}
              </span>
            )}
            {searchQuery && matchIds.length === 0 && (
              <span className="text-xs text-gray-500 shrink-0">Sem resultados</span>
            )}
            <button type="button" onClick={() => navMatch(-1)} disabled={matchIds.length === 0} className="p-1 text-gray-400 hover:text-white disabled:opacity-30">
              <ChevronUp className="h-4 w-4" />
            </button>
            <button type="button" onClick={() => navMatch(1)} disabled={matchIds.length === 0} className="p-1 text-gray-400 hover:text-white disabled:opacity-30">
              <ChevronDown className="h-4 w-4" />
            </button>
            <button type="button" onClick={closeSearch} className="p-1 text-gray-400 hover:text-white">
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : (
          /* Normal header */
          <div className="flex items-center gap-3">
            {/* Name + phone — click opens contact panel */}
            <div
              className="flex-1 min-w-0 cursor-pointer group/header"
              onClick={() => !editingName && setContactPanelOpen((v) => !v)}
              title="Ver detalhes do contato"
            >
              {editingName ? (
                <div className="flex items-center gap-2">
                  <input
                    ref={nameInputRef}
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") saveName()
                      if (e.key === "Escape") cancelEditing()
                    }}
                    disabled={savingName}
                    className="flex-1 rounded border border-gray-600 bg-gray-800 px-2 py-0.5 text-sm font-semibold text-white outline-none focus:border-blue-500"
                  />
                  <button onClick={saveName} disabled={savingName} className="text-green-400 hover:text-green-300 disabled:opacity-50">
                    <Check className="h-4 w-4" />
                  </button>
                  <button onClick={cancelEditing} disabled={savingName} className="text-gray-500 hover:text-gray-300 disabled:opacity-50">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 group">
                  <h3 className="font-semibold text-white truncate">{resolvedName}</h3>
                  <button onClick={startEditing} className="opacity-0 group-hover:opacity-100 text-gray-500 hover:text-gray-300 transition-opacity shrink-0">
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
              <p className="text-xs text-gray-500 group-hover/header:text-gray-400 transition-colors">{conversation.phoneNumber}</p>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={openSearch}
                className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700/50 transition-colors"
                title="Buscar na conversa"
              >
                <Search className="h-4 w-4" />
              </button>

              {/* 3-dot menu */}
              <div ref={headerMenuRef} className="relative">
                <button
                  type="button"
                  onClick={() => setHeaderMenuOpen((v) => !v)}
                  className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700/50 transition-colors"
                >
                  <MoreVertical className="h-4 w-4" />
                </button>

                {headerMenuOpen && (
                  <div className="absolute right-0 top-10 z-50 w-48 rounded-lg border border-gray-700 bg-gray-900 shadow-2xl py-1">
                    <button type="button" onClick={() => handleHeaderAction(conversation.pinned ? "unpin" : "pin")}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-gray-300 hover:bg-gray-800 hover:text-white">
                      <Pin className="h-4 w-4" />
                      {conversation.pinned ? "Desfixar conversa" : "Fixar conversa"}
                    </button>
                    <button type="button" onClick={() => handleHeaderAction(conversation.favorite ? "unfavorite" : "favorite")}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-gray-300 hover:bg-gray-800 hover:text-white">
                      <Star className="h-4 w-4" />
                      {conversation.favorite ? "Remover dos Favoritos" : "Adicionar aos Favoritos"}
                    </button>
                    <button type="button" onClick={() => handleHeaderAction(conversation.archived ? "unarchive" : "archive")}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-gray-300 hover:bg-gray-800 hover:text-white">
                      <Archive className="h-4 w-4" />
                      {conversation.archived ? "Desarquivar" : "Arquivar conversa"}
                    </button>
                    <div className="border-t border-gray-800 my-1" />
                    <button type="button" onClick={() => handleHeaderAction("delete")}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-red-400 hover:bg-gray-800 hover:text-red-300">
                      <Trash2 className="h-4 w-4" />
                      Apagar conversa
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Pinned message banner ── */}
      {pinnedMessage && !searchOpen && (
        <div className="shrink-0 flex items-center gap-3 bg-yellow-500/10 border-b border-yellow-500/20 px-4 py-2">
          <Pin className="h-3.5 w-3.5 text-yellow-400 shrink-0" />
          <div
            className="flex-1 min-w-0 cursor-pointer"
            onClick={() => {
              const idx = messages.findIndex((m) => m.id === pinnedMessage.id)
              if (idx >= 0) matchRefs.current[idx]?.scrollIntoView({ behavior: "smooth", block: "center" })
            }}
          >
            <p className="text-[10px] text-yellow-400 font-medium mb-0.5">Mensagem fixada</p>
            <p className="text-xs text-gray-300 truncate">{pinnedMessage.content}</p>
          </div>
          <button
            type="button"
            onClick={() => patchConversation({ pinnedMessageId: null })}
            className="shrink-0 p-1 text-gray-500 hover:text-gray-300"
            title="Desafixar"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* ── Queue status banners ── */}
      {queuePaused && (
        <div className="shrink-0 flex items-center gap-2 bg-red-500/10 border-b border-red-500/20 px-6 py-2 text-sm text-red-400">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          Fila de envio pausada por erros consecutivos. Verifique Configurações → Integrações.
        </div>
      )}
      {dailyLimitReached && !queuePaused && (
        <div className="shrink-0 flex items-center gap-2 bg-yellow-500/10 border-b border-yellow-500/20 px-6 py-2 text-sm text-yellow-400">
          <Clock className="h-4 w-4 shrink-0" />
          Limite diário atingido. {queuePendingCount > 0 && `${queuePendingCount} mensagem(ns) na fila para amanhã.`}
        </div>
      )}

      {/* ── Messages ── */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        <div className="space-y-3">
          {messages.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-600">Nenhuma mensagem ainda. Inicie a conversa!</p>
          ) : (
            messages.map((msg, idx) => {
              const isMatch = searchQuery && matchIds.includes(msg.id)
              const isCurrentMatch = isMatch && matchIds[matchCursor] === msg.id
              return (
                <div
                  key={msg.id}
                  ref={(el) => {
                    matchRefs.current[idx] = el
                    // also index by match position
                    const matchIdx = matchIds.indexOf(msg.id)
                    if (matchIdx >= 0) matchRefs.current[matchIdx] = el
                  }}
                  className={isCurrentMatch ? "rounded-lg ring-2 ring-blue-400/40 ring-offset-2 ring-offset-gray-900" : ""}
                >
                  <MessageBubble
                    message={msg}
                    isPinned={msg.id === conversation.pinnedMessageId}
                    highlight={searchQuery.trim() || undefined}
                    onPin={() => handlePinMessage(msg.id)}
                  />
                </div>
              )
            })
          )}
          <div ref={bottomRef} />
        </div>
      </div>

      {/* ── Input ── */}
      <div className="shrink-0 border-t border-gray-700/50 px-6 py-4">
        <form onSubmit={sendMessage} className="flex gap-3">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Digite uma mensagem..."
            disabled={sending}
            className="flex-1 rounded-lg border border-gray-700 bg-gray-800 px-4 py-2.5 text-sm text-white placeholder:text-gray-500 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={sending || !input.trim()}
            className="flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2.5 text-white transition-colors hover:bg-blue-500 disabled:opacity-50 disabled:pointer-events-none"
          >
            <Send className="h-4 w-4" />
          </button>
        </form>
      </div>
    </div>

    {/* ── Contact panel ── */}
    {contactPanelOpen && (
      <ContactPanel
        conversationId={conversationId}
        name={resolvedName}
        phone={conversation.phoneNumber}
        photoUrl={photoUrl}
        onClose={() => setContactPanelOpen(false)}
      />
    )}
    </div>
  )
}
