"use client"

import { useState, useEffect, useCallback } from "react"
import { MessageSquare } from "lucide-react"
import { ChatWindow } from "@/components/chat/chat-window"
import type { Conversation } from "@/types/models"

function formatTime(dateStr: string): string {
  const d = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays === 0) {
    return new Intl.DateTimeFormat("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    }).format(d)
  }
  if (diffDays === 1) return "Ontem"
  if (diffDays < 7) {
    return new Intl.DateTimeFormat("pt-BR", { weekday: "short" }).format(d)
  }
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
  }).format(d)
}

export default function ChatPage() {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchConversations = useCallback(async () => {
    const res = await fetch("/api/conversations")
    if (res.ok) {
      const data = await res.json()
      setConversations(
        JSON.parse(JSON.stringify(Array.isArray(data) ? data : data.conversations ?? []))
      )
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchConversations()
    const interval = setInterval(fetchConversations, 5000)
    return () => clearInterval(interval)
  }, [fetchConversations])

  const selectedConversation = conversations.find((c) => c.id === selectedId) ?? null

  return (
    <div className="flex h-[calc(100vh-8rem)] overflow-hidden rounded-lg border border-gray-700/50">
      {/* Lista de conversas */}
      <div className="w-[300px] shrink-0 flex flex-col border-r border-gray-700/50 bg-gray-800/30">
        <div className="shrink-0 border-b border-gray-700/50 px-4 py-4">
          <h2 className="font-semibold text-white">Conversas</h2>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="py-8 text-center text-sm text-gray-500">Carregando...</div>
          ) : conversations.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-gray-500">
              Nenhuma conversa ainda.
            </div>
          ) : (
            conversations.map((conv) => {
              const name =
                conv.lead?.name ?? conv.client?.name ?? conv.phoneNumber
              const lastMessage =
                conv.messages && conv.messages.length > 0
                  ? conv.messages[conv.messages.length - 1]
                  : null
              const isSelected = conv.id === selectedId

              return (
                <button
                  key={conv.id}
                  onClick={() => setSelectedId(conv.id)}
                  className={`w-full px-4 py-3 text-left transition-colors hover:bg-gray-700/30 ${
                    isSelected ? "bg-gray-700/50 border-l-2 border-blue-500" : ""
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-medium text-sm text-white truncate">{name}</p>
                    {lastMessage && (
                      <span className="shrink-0 text-[10px] text-gray-500">
                        {formatTime(lastMessage.sentAt)}
                      </span>
                    )}
                  </div>
                  {lastMessage ? (
                    <p className="mt-0.5 text-xs text-gray-500 truncate">
                      {lastMessage.direction === "OUTBOUND" ? "Você: " : ""}
                      {lastMessage.content}
                    </p>
                  ) : (
                    <p className="mt-0.5 text-xs text-gray-600 italic">
                      Sem mensagens
                    </p>
                  )}
                </button>
              )
            })
          )}
        </div>
      </div>

      {/* Área do chat */}
      <div className="flex-1 bg-gray-900/50">
        {selectedConversation ? (
          <ChatWindow
            conversationId={selectedConversation.id}
            conversation={selectedConversation}
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
