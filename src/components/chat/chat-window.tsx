"use client"

import { useState, useEffect, useRef, useCallback, useMemo } from "react"
import {
  Send, Clock, AlertTriangle, X,
  Search, Pin, Archive, Star, Trash2, MoreVertical,
  ChevronUp, ChevronDown, Paperclip, FileText, Image, Mic, MicOff,
} from "lucide-react"
import { MessageBubble } from "@/components/chat/message-bubble"
import { ContactPanel } from "@/components/chat/contact-panel"
import type { Conversation, Message } from "@/types/models"

// ─── Avatar helpers ───────────────────────────────────────────────────────────

const AVATAR_COLORS = [
  "bg-blue-600", "bg-purple-600", "bg-green-600", "bg-orange-600",
  "bg-pink-600", "bg-teal-600", "bg-red-600", "bg-indigo-600",
]

function avatarColor(name: string) {
  let h = 0
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h)
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length]
}

function getInitials(name: string) {
  return name.split(" ").slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("")
}

function HeaderAvatar({ name, photoUrl, size = 9 }: { name: string; photoUrl?: string | null; size?: number }) {
  const [err, setErr] = useState(false)
  const sizeClass = `h-${size} w-${size}`
  if (photoUrl && !err) {
    return <img src={photoUrl} alt={name} onError={() => setErr(true)} className={`${sizeClass} rounded-full object-cover shrink-0`} />
  }
  return (
    <div className={`${sizeClass} rounded-full flex items-center justify-center shrink-0 text-white text-xs font-bold ${avatarColor(name)}`}>
      {getInitials(name) || "?"}
    </div>
  )
}

// ─── Props ────────────────────────────────────────────────────────────────────

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

  // Search
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [matchCursor, setMatchCursor] = useState(0)

  // Header 3-dot menu
  const [headerMenuOpen, setHeaderMenuOpen] = useState(false)
  const headerMenuRef = useRef<HTMLDivElement>(null)

  // Attachment menu
  const [attachMenuOpen, setAttachMenuOpen] = useState(false)
  const attachMenuRef = useRef<HTMLDivElement>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)
  const docInputRef = useRef<HTMLInputElement>(null)

  // Audio recording
  const [recording, setRecording] = useState(false)
  const [recordingSeconds, setRecordingSeconds] = useState(0)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const recordTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Optimistic media blobs (shown during session only)
  const [optimisticMedia, setOptimisticMedia] = useState<Record<string, string>>({})

  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const matchRefs = useRef<(HTMLDivElement | null)[]>([])

  // ── Fetch messages ──────────────────────────────────────────────────────────

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
      setQueuePaused(result.status === "paused")
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

  // ── Outside-click handlers ──────────────────────────────────────────────────

  useEffect(() => {
    if (!headerMenuOpen && !attachMenuOpen) return
    function onOutside(e: MouseEvent) {
      if (headerMenuRef.current && !headerMenuRef.current.contains(e.target as Node)) setHeaderMenuOpen(false)
      if (attachMenuRef.current && !attachMenuRef.current.contains(e.target as Node)) setAttachMenuOpen(false)
    }
    document.addEventListener("mousedown", onOutside)
    return () => document.removeEventListener("mousedown", onOutside)
  }, [headerMenuOpen, attachMenuOpen])

  // ── Search ──────────────────────────────────────────────────────────────────

  const matchIds = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return []
    return messages.filter((m) => m.content.toLowerCase().includes(q)).map((m) => m.id)
  }, [messages, searchQuery])

  useEffect(() => { setMatchCursor(0) }, [matchIds])
  useEffect(() => {
    if (matchIds.length === 0) return
    matchRefs.current[matchCursor]?.scrollIntoView({ behavior: "smooth", block: "center" })
  }, [matchCursor, matchIds])

  function openSearch() { setSearchOpen(true); setTimeout(() => searchInputRef.current?.focus(), 0) }
  function closeSearch() { setSearchOpen(false); setSearchQuery(""); setMatchCursor(0) }
  function navMatch(dir: 1 | -1) {
    if (matchIds.length === 0) return
    setMatchCursor((prev) => (prev + dir + matchIds.length) % matchIds.length)
  }

  // ── Send text ───────────────────────────────────────────────────────────────

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
      if (res.ok) { await fetchMessages(); triggerQueueProcess() }
    } finally {
      setSending(false)
      inputRef.current?.focus()
    }
  }

  // ── Send media ──────────────────────────────────────────────────────────────

  async function sendMedia(file: File, mediaType: "image" | "video" | "audio" | "document") {
    const objectUrl = URL.createObjectURL(file)
    const optId = `opt-${Date.now()}`

    const optimistic: Message = {
      id: optId,
      conversationId,
      content: file.name,
      direction: "OUTBOUND",
      sentAt: new Date().toISOString(),
      senderName: null,
      mediaType,
      mediaUrl: objectUrl,
      mediaName: file.name,
    }
    setMessages((prev) => [...prev, optimistic])
    setOptimisticMedia((prev) => ({ ...prev, [optId]: objectUrl }))

    const reader = new FileReader()
    reader.onload = async (e) => {
      const base64 = e.target?.result as string
      await fetch("/api/messages/send-media", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId, mediaType, mediaBase64: base64, mediaName: file.name }),
      })
      await fetchMessages()
    }
    reader.readAsDataURL(file)
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const isVideo = file.type.startsWith("video/")
    sendMedia(file, isVideo ? "video" : "image")
    e.target.value = ""
    setAttachMenuOpen(false)
  }

  function handleDocSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    sendMedia(file, "document")
    e.target.value = ""
    setAttachMenuOpen(false)
  }

  // ── Audio recording ──────────────────────────────────────────────────────────

  async function toggleRecording() {
    if (recording) {
      // Stop
      mediaRecorderRef.current?.stop()
      mediaRecorderRef.current?.stream.getTracks().forEach((t) => t.stop())
      if (recordTimerRef.current) clearInterval(recordTimerRef.current)
      setRecording(false)
      setRecordingSeconds(0)
    } else {
      // Start
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
        const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
          ? "audio/webm;codecs=opus"
          : "audio/ogg;codecs=opus"
        const recorder = new MediaRecorder(stream, { mimeType })
        audioChunksRef.current = []
        recorder.ondataavailable = (ev) => { if (ev.data.size > 0) audioChunksRef.current.push(ev.data) }
        recorder.onstop = () => {
          const blob = new Blob(audioChunksRef.current, { type: mimeType })
          const file = new File([blob], "audio.ogg", { type: mimeType })
          sendMedia(file, "audio")
        }
        recorder.start()
        mediaRecorderRef.current = recorder
        setRecording(true)
        setRecordingSeconds(0)
        recordTimerRef.current = setInterval(() => setRecordingSeconds((s) => s + 1), 1000)
      } catch {
        alert("Não foi possível acessar o microfone.")
      }
    }
  }

  // ── Conversation actions ────────────────────────────────────────────────────

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

  async function handlePinMessage(msgId: string) {
    const newPinnedId = conversation.pinnedMessageId === msgId ? null : msgId
    await patchConversation({ pinnedMessageId: newPinnedId })
  }

  const pinnedMessage = messages.find((m) => m.id === conversation.pinnedMessageId) ?? null
  const resolvedName =
    conversation.contactName ?? conversation.lead?.name ?? conversation.client?.name ?? conversation.phoneNumber

  const formatSeconds = (s: number) => `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="flex h-full flex-row overflow-hidden">
      <div className="flex flex-1 flex-col min-w-0">

        {/* ── Header ── */}
        <div className="shrink-0 border-b border-gray-700/50 px-4 py-3">
          {searchOpen ? (
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
              {matchIds.length > 0 && <span className="text-xs text-gray-400 shrink-0">{matchCursor + 1}/{matchIds.length}</span>}
              {searchQuery && matchIds.length === 0 && <span className="text-xs text-gray-500 shrink-0">Sem resultados</span>}
              <button type="button" onClick={() => navMatch(-1)} disabled={matchIds.length === 0} className="p-1 text-gray-400 hover:text-white disabled:opacity-30"><ChevronUp className="h-4 w-4" /></button>
              <button type="button" onClick={() => navMatch(1)} disabled={matchIds.length === 0} className="p-1 text-gray-400 hover:text-white disabled:opacity-30"><ChevronDown className="h-4 w-4" /></button>
              <button type="button" onClick={closeSearch} className="p-1 text-gray-400 hover:text-white"><X className="h-4 w-4" /></button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              {/* Avatar + name/phone — click opens contact panel */}
              <button
                type="button"
                onClick={() => setContactPanelOpen((v) => !v)}
                className="flex items-center gap-2.5 flex-1 min-w-0 text-left hover:opacity-80 transition-opacity"
              >
                <HeaderAvatar name={resolvedName} photoUrl={photoUrl} size={9} />
                <div className="min-w-0">
                  <h3 className="font-semibold text-white truncate text-sm">{resolvedName}</h3>
                  <p className="text-xs text-gray-500">{conversation.phoneNumber}</p>
                </div>
              </button>

              {/* Actions */}
              <div className="flex items-center gap-1 shrink-0">
                <button type="button" onClick={openSearch} className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700/50 transition-colors" title="Buscar">
                  <Search className="h-4 w-4" />
                </button>
                <div ref={headerMenuRef} className="relative">
                  <button type="button" onClick={() => setHeaderMenuOpen((v) => !v)} className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700/50 transition-colors">
                    <MoreVertical className="h-4 w-4" />
                  </button>
                  {headerMenuOpen && (
                    <div className="absolute right-0 top-10 z-50 w-48 rounded-lg border border-gray-700 bg-gray-900 shadow-2xl py-1">
                      <button type="button" onClick={() => handleHeaderAction(conversation.pinned ? "unpin" : "pin")} className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-gray-300 hover:bg-gray-800 hover:text-white">
                        <Pin className="h-4 w-4" />
                        {conversation.pinned ? "Desfixar conversa" : "Fixar conversa"}
                      </button>
                      <button type="button" onClick={() => handleHeaderAction(conversation.favorite ? "unfavorite" : "favorite")} className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-gray-300 hover:bg-gray-800 hover:text-white">
                        <Star className="h-4 w-4" />
                        {conversation.favorite ? "Remover dos Favoritos" : "Favoritar"}
                      </button>
                      <button type="button" onClick={() => handleHeaderAction(conversation.archived ? "unarchive" : "archive")} className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-gray-300 hover:bg-gray-800 hover:text-white">
                        <Archive className="h-4 w-4" />
                        {conversation.archived ? "Desarquivar" : "Arquivar"}
                      </button>
                      <div className="border-t border-gray-800 my-1" />
                      <button type="button" onClick={() => handleHeaderAction("delete")} className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-red-400 hover:bg-gray-800 hover:text-red-300">
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
            <div className="flex-1 min-w-0 cursor-pointer" onClick={() => {
              const idx = messages.findIndex((m) => m.id === pinnedMessage.id)
              if (idx >= 0) matchRefs.current[idx]?.scrollIntoView({ behavior: "smooth", block: "center" })
            }}>
              <p className="text-[10px] text-yellow-400 font-medium mb-0.5">Mensagem fixada</p>
              <p className="text-xs text-gray-300 truncate">{pinnedMessage.content}</p>
            </div>
            <button type="button" onClick={() => patchConversation({ pinnedMessageId: null })} className="shrink-0 p-1 text-gray-500 hover:text-gray-300">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {/* ── Queue status ── */}
        {queuePaused && (
          <div className="shrink-0 flex items-center gap-2 bg-red-500/10 border-b border-red-500/20 px-6 py-2 text-sm text-red-400">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            Fila pausada por erros consecutivos. Verifique Configurações → Integrações.
          </div>
        )}
        {dailyLimitReached && !queuePaused && (
          <div className="shrink-0 flex items-center gap-2 bg-yellow-500/10 border-b border-yellow-500/20 px-6 py-2 text-sm text-yellow-400">
            <Clock className="h-4 w-4 shrink-0" />
            Limite diário atingido. {queuePendingCount > 0 && `${queuePendingCount} mensagem(ns) na fila para amanhã.`}
          </div>
        )}

        {/* ── Messages ── */}
        <div className="flex-1 overflow-y-auto px-4 py-4">
          <div className="space-y-2">
            {messages.length === 0 ? (
              <p className="py-8 text-center text-sm text-gray-600">Nenhuma mensagem ainda.</p>
            ) : (
              messages.map((msg, idx) => {
                const isMatch = searchQuery && matchIds.includes(msg.id)
                const isCurrentMatch = isMatch && matchIds[matchCursor] === msg.id
                // For optimistic media, use local blob URL if no mediaUrl stored
                const displayMsg = optimisticMedia[msg.id]
                  ? { ...msg, mediaUrl: optimisticMedia[msg.id] }
                  : msg
                return (
                  <div
                    key={msg.id}
                    ref={(el) => {
                      matchRefs.current[idx] = el
                      const mi = matchIds.indexOf(msg.id)
                      if (mi >= 0) matchRefs.current[mi] = el
                    }}
                    className={isCurrentMatch ? "rounded-lg ring-2 ring-blue-400/40 ring-offset-2 ring-offset-gray-900" : ""}
                  >
                    <MessageBubble
                      message={displayMsg}
                      isPinned={msg.id === conversation.pinnedMessageId}
                      highlight={searchQuery.trim() || undefined}
                      onPin={() => handlePinMessage(msg.id)}
                      contactName={resolvedName}
                      contactPhoto={photoUrl}
                    />
                  </div>
                )
              })
            )}
            <div ref={bottomRef} />
          </div>
        </div>

        {/* ── Input ── */}
        <div className="shrink-0 border-t border-gray-700/50 px-4 py-3">
          {recording ? (
            <div className="flex items-center gap-3">
              <div className="flex-1 flex items-center gap-2 rounded-lg border border-red-500/50 bg-red-500/10 px-4 py-2.5">
                <div className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                <span className="text-sm text-red-400">Gravando... {formatSeconds(recordingSeconds)}</span>
              </div>
              <button
                type="button"
                onClick={toggleRecording}
                className="flex items-center justify-center rounded-lg bg-red-600 px-4 py-2.5 text-white hover:bg-red-500 transition-colors"
                title="Parar e enviar"
              >
                <MicOff className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <form onSubmit={sendMessage} className="flex items-center gap-2">
              {/* Hidden file inputs */}
              <input ref={imageInputRef} type="file" accept="image/*,video/*" className="hidden" onChange={handleFileSelect} />
              <input ref={docInputRef} type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip" className="hidden" onChange={handleDocSelect} />

              {/* Attachment button */}
              <div ref={attachMenuRef} className="relative shrink-0">
                <button
                  type="button"
                  onClick={() => setAttachMenuOpen((v) => !v)}
                  className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700/50 transition-colors"
                  title="Anexar"
                >
                  <Paperclip className="h-5 w-5" />
                </button>
                {attachMenuOpen && (
                  <div className="absolute bottom-12 left-0 z-50 w-44 rounded-lg border border-gray-700 bg-gray-900 shadow-2xl py-1">
                    <button
                      type="button"
                      onClick={() => { imageInputRef.current?.click() }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-gray-300 hover:bg-gray-800 hover:text-white"
                    >
                      <Image className="h-4 w-4" />
                      Foto / Vídeo
                    </button>
                    <button
                      type="button"
                      onClick={() => { docInputRef.current?.click() }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-gray-300 hover:bg-gray-800 hover:text-white"
                    >
                      <FileText className="h-4 w-4" />
                      Documento
                    </button>
                  </div>
                )}
              </div>

              {/* Text input */}
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Digite uma mensagem..."
                disabled={sending}
                className="flex-1 rounded-lg border border-gray-700 bg-gray-800 px-4 py-2.5 text-sm text-white placeholder:text-gray-500 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
              />

              {/* Audio button */}
              <button
                type="button"
                onClick={toggleRecording}
                className="shrink-0 p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700/50 transition-colors"
                title="Gravar áudio"
              >
                <Mic className="h-5 w-5" />
              </button>

              {/* Send */}
              <button
                type="submit"
                disabled={sending || !input.trim()}
                className="shrink-0 flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2.5 text-white transition-colors hover:bg-blue-500 disabled:opacity-50 disabled:pointer-events-none"
              >
                <Send className="h-4 w-4" />
              </button>
            </form>
          )}
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
          onConversationUpdate={onConversationUpdate}
        />
      )}
    </div>
  )
}
