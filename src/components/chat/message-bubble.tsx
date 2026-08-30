"use client"

import { useState, useRef, useEffect } from "react"
import { Pin, MoreVertical, FileText, Play } from "lucide-react"
import type { Message } from "@/types/models"

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatTime(dateStr: string) {
  return new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" }).format(new Date(dateStr))
}

function HighlightedText({ text, query }: { text: string; query: string }) {
  if (!query) return <>{text}</>
  const parts = text.split(new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi"))
  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === query.toLowerCase() ? (
          <mark key={i} className="bg-yellow-400/80 text-gray-900 rounded-sm px-0.5">{part}</mark>
        ) : part
      )}
    </>
  )
}

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

// ─── Mini avatar ─────────────────────────────────────────────────────────────

function MiniAvatar({ name, photoUrl }: { name: string; photoUrl?: string | null }) {
  const [err, setErr] = useState(false)
  if (photoUrl && !err) {
    return (
      <img
        src={photoUrl}
        alt={name}
        onError={() => setErr(true)}
        className="h-7 w-7 rounded-full object-cover shrink-0 self-end mb-1"
      />
    )
  }
  return (
    <div className={`h-7 w-7 rounded-full flex items-center justify-center shrink-0 self-end mb-1 text-white text-[10px] font-bold ${avatarColor(name)}`}>
      {getInitials(name) || "?"}
    </div>
  )
}

// ─── Media renderers ─────────────────────────────────────────────────────────

function MediaContent({ message, isOutbound }: { message: Message; isOutbound: boolean }) {
  const [lightboxOpen, setLightboxOpen] = useState(false)

  if (!message.mediaType) return null

  if (message.mediaType === "image") {
    const src = message.mediaUrl
    if (!src) return <p className="text-xs italic opacity-70">[Imagem]</p>
    return (
      <>
        <img
          src={src}
          alt="Imagem"
          onClick={() => setLightboxOpen(true)}
          className="max-w-full max-h-48 rounded-lg cursor-pointer object-cover mb-1"
        />
        {lightboxOpen && (
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4"
            onClick={() => setLightboxOpen(false)}
          >
            <img src={src} alt="Imagem" className="max-w-full max-h-full rounded-lg" onClick={(e) => e.stopPropagation()} />
          </div>
        )}
      </>
    )
  }

  if (message.mediaType === "video") {
    const src = message.mediaUrl
    if (!src) return <p className="text-xs italic opacity-70">[Vídeo]</p>
    return (
      <video
        src={src}
        controls
        className="max-w-full max-h-48 rounded-lg mb-1"
        preload="metadata"
      />
    )
  }

  if (message.mediaType === "audio") {
    const src = message.mediaUrl
    if (!src) return <p className="text-xs italic opacity-70">[Áudio]</p>
    return (
      <audio
        src={src}
        controls
        className="max-w-full mb-1"
        style={{ height: 36 }}
        preload="metadata"
      />
    )
  }

  if (message.mediaType === "document") {
    const src = message.mediaUrl
    const name = message.mediaName ?? message.content ?? "Documento"
    return (
      <a
        href={src ?? "#"}
        target="_blank"
        rel="noopener noreferrer"
        className={`flex items-center gap-2 mb-1 px-2 py-1.5 rounded-lg ${isOutbound ? "bg-blue-500/40" : "bg-gray-600/40"} hover:opacity-80 transition-opacity`}
      >
        <FileText className="h-5 w-5 shrink-0" />
        <span className="text-xs truncate max-w-[140px]">{name}</span>
      </a>
    )
  }

  return null
}

// ─── MessageBubble ────────────────────────────────────────────────────────────

interface MessageBubbleProps {
  message: Message
  isPinned?: boolean
  highlight?: string
  onPin?: () => void
  contactName?: string
  contactPhoto?: string | null
}

export function MessageBubble({ message, isPinned, highlight, onPin, contactName, contactPhoto }: MessageBubbleProps) {
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

  const hasText = !message.mediaType || !!message.content
  const showCaption = message.mediaType && message.content && message.content !== message.mediaType

  return (
    <div className={`flex group ${isOutbound ? "justify-end" : "justify-start"}`}>
      <div className={`flex items-end gap-1.5 max-w-[80%] ${isOutbound ? "flex-row-reverse" : "flex-row"}`}>

        {/* Avatar for inbound */}
        {!isOutbound && contactName && (
          <MiniAvatar name={contactName} photoUrl={contactPhoto} />
        )}

        {/* Pin/menu button */}
        {onPin && (
          <div
            ref={menuRef}
            className={`shrink-0 self-end mb-1 relative`}
          >
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              className="opacity-0 group-hover:opacity-100 p-1 rounded-full hover:bg-gray-700/60 text-gray-500 hover:text-gray-300 transition-all"
            >
              <MoreVertical className="h-3.5 w-3.5" />
            </button>
            {menuOpen && (
              <div className={`absolute bottom-7 z-50 w-36 rounded-lg border border-gray-700 bg-gray-900 shadow-2xl py-1 ${isOutbound ? "right-0" : "left-0"}`}>
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

        {/* Bubble */}
        <div className="flex flex-col">
          {/* Outbound sender name */}
          {isOutbound && message.senderName && (
            <p className="text-[10px] text-gray-500 text-right mb-0.5 pr-1">{message.senderName}</p>
          )}

          <div
            className={`rounded-2xl px-3 py-2 ${
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

            {/* Inbound sender name (group messages) */}
            {!isOutbound && message.senderName && (
              <p className="mb-0.5 text-xs font-semibold text-blue-300">{message.senderName}</p>
            )}

            {/* Media content */}
            <MediaContent message={message} isOutbound={isOutbound} />

            {/* Text content */}
            {hasText && !message.mediaType && (
              <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">
                <HighlightedText text={message.content} query={highlight ?? ""} />
              </p>
            )}
            {/* Caption for media */}
            {showCaption && (
              <p className="text-xs mt-1 opacity-80 whitespace-pre-wrap break-words">
                <HighlightedText text={message.content} query={highlight ?? ""} />
              </p>
            )}

            <p className={`mt-1 text-right text-[10px] ${isOutbound ? "text-blue-200" : "text-gray-400"}`}>
              {formatTime(message.sentAt)}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
