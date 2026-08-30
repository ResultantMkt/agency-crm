"use client"

import { useState, useRef, useEffect } from "react"
import { Pin, MoreVertical } from "lucide-react"
import type { Message } from "@/types/models"

interface MessageBubbleProps {
  message: Message
  isPinned?: boolean
  highlight?: string
  onPin?: () => void
}

function formatTime(dateStr: string): string {
  const d = new Date(dateStr)
  return new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" }).format(d)
}

function HighlightedText({ text, query }: { text: string; query: string }) {
  if (!query) return <>{text}</>
  const parts = text.split(new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi"))
  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === query.toLowerCase() ? (
          <mark key={i} className="bg-yellow-400/80 text-gray-900 rounded-sm px-0.5">{part}</mark>
        ) : (
          part
        )
      )}
    </>
  )
}

export function MessageBubble({ message, isPinned, highlight, onPin }: MessageBubbleProps) {
  const isOutbound = message.direction === "OUTBOUND"
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!menuOpen) return
    function onOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false)
    }
    document.addEventListener("mousedown", onOutside)
    return () => document.removeEventListener("mousedown", onOutside)
  }, [menuOpen])

  return (
    <div className={`flex group ${isOutbound ? "justify-end" : "justify-start"}`}>
      <div className="relative flex items-end gap-1.5">
        {/* Pin/menu button — appears on hover, on the outer side */}
        {onPin && (
          <div
            ref={menuRef}
            className={`shrink-0 self-end mb-1 relative ${isOutbound ? "order-first" : "order-last"}`}
          >
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              className="opacity-0 group-hover:opacity-100 p-1 rounded-full hover:bg-gray-700/60 text-gray-500 hover:text-gray-300 transition-all"
            >
              <MoreVertical className="h-3.5 w-3.5" />
            </button>

            {menuOpen && (
              <div
                className={`absolute bottom-7 z-50 w-36 rounded-lg border border-gray-700 bg-gray-900 shadow-2xl py-1 ${
                  isOutbound ? "right-0" : "left-0"
                }`}
              >
                <button
                  type="button"
                  onClick={() => { onPin(); setMenuOpen(false) }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-300 hover:bg-gray-800 hover:text-white"
                >
                  <Pin className="h-3.5 w-3.5" />
                  {isPinned ? "Desafixar" : "Fixar mensagem"}
                </button>
              </div>
            )}
          </div>
        )}

        <div
          className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${
            isOutbound
              ? "rounded-br-sm bg-blue-600 text-white"
              : "rounded-bl-sm bg-gray-700 text-white"
          } ${isPinned ? "ring-2 ring-yellow-400/50" : ""}`}
        >
          {isPinned && (
            <div className="flex items-center gap-1 mb-1">
              <Pin className="h-2.5 w-2.5 text-yellow-400" />
              <span className="text-[10px] text-yellow-400 font-medium">Fixada</span>
            </div>
          )}
          {!isOutbound && message.senderName && (
            <p className="mb-0.5 text-xs font-semibold text-blue-300">{message.senderName}</p>
          )}
          <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">
            <HighlightedText text={message.content} query={highlight ?? ""} />
          </p>
          <p className={`mt-1 text-right text-[10px] ${isOutbound ? "text-blue-200" : "text-gray-400"}`}>
            {formatTime(message.sentAt)}
          </p>
        </div>
      </div>
    </div>
  )
}
