"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Send, Clock, AlertTriangle } from "lucide-react"
import { MessageBubble } from "@/components/chat/message-bubble"
import type { Conversation, Message } from "@/types/models"

interface ChatWindowProps {
  conversationId: string
  conversation: Conversation
}

export function ChatWindow({ conversationId, conversation }: ChatWindowProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [sending, setSending] = useState(false)
  const [queuePaused, setQueuePaused] = useState(false)
  const [queuePendingCount, setQueuePendingCount] = useState(0)
  const [dailyLimitReached, setDailyLimitReached] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const fetchMessages = useCallback(async () => {
    const res = await fetch(`/api/conversations/${conversationId}/messages`)
    if (res.ok) {
      const data = await res.json()
      setMessages(JSON.parse(JSON.stringify(Array.isArray(data) ? data : data.messages ?? [])))
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
    } catch {
      // silently ignore
    }
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

  const contactName =
    conversation.lead?.name ??
    conversation.client?.name ??
    conversation.phoneNumber

  return (
    <div className="flex h-full flex-col">
      <div className="shrink-0 border-b border-gray-700/50 px-6 py-4">
        <h3 className="font-semibold text-white">{contactName}</h3>
        <p className="text-xs text-gray-500">{conversation.phoneNumber}</p>
      </div>

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

      <div className="flex-1 overflow-y-auto px-6 py-4">
        <div className="space-y-3">
          {messages.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-600">
              Nenhuma mensagem ainda. Inicie a conversa!
            </p>
          ) : (
            messages.map((msg) => <MessageBubble key={msg.id} message={msg} />)
          )}
          <div ref={bottomRef} />
        </div>
      </div>

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
  )
}
