"use client"

import type { Message } from "@/types/models"

interface MessageBubbleProps {
  message: Message
}

function formatTime(dateStr: string): string {
  const d = new Date(dateStr)
  return new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(d)
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isOutbound = message.direction === "OUTBOUND"

  return (
    <div className={`flex ${isOutbound ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${
          isOutbound
            ? "rounded-br-sm bg-blue-600 text-white"
            : "rounded-bl-sm bg-gray-700 text-white"
        }`}
      >
        {!isOutbound && message.senderName && (
          <p className="mb-0.5 text-xs font-semibold text-blue-300">
            {message.senderName}
          </p>
        )}
        <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">
          {message.content}
        </p>
        <p
          className={`mt-1 text-right text-[10px] ${
            isOutbound ? "text-blue-200" : "text-gray-400"
          }`}
        >
          {formatTime(message.sentAt)}
        </p>
      </div>
    </div>
  )
}
