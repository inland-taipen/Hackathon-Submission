'use client'

import { useState, useEffect } from 'react'
import { Reply, Smile, Paperclip } from 'lucide-react'
import axios from 'axios'

interface Message {
  id: string
  user_id: string
  content: string
  created_at: string
  username: string
  avatar?: string
  file_url?: string
  file_name?: string
  thread_id?: string
}

interface MessageListProps {
  messages: Message[]
  currentUserId: string
  onThreadClick: (messageId: string) => void
  onReactionClick: (messageId: string, emoji: string) => void
  reactions: Record<string, any[]>
}

export default function MessageList({
  messages,
  currentUserId,
  onThreadClick,
  onReactionClick,
  reactions
}: MessageListProps) {
  const [hoveredMessage, setHoveredMessage] = useState<string | null>(null)

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))

    if (days === 0) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    } else if (days === 1) {
      return 'Yesterday'
    } else if (days < 7) {
      return date.toLocaleDateString([], { weekday: 'short' })
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' })
    }
  }

  const getReactionCount = (messageId: string, emoji: string) => {
    return reactions[messageId]?.[emoji]?.length || 0
  }

  const hasUserReacted = (messageId: string, emoji: string) => {
    return reactions[messageId]?.[emoji]?.some((r: any) => r.user_id === currentUserId) || false
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {messages.map(message => (
        <div
          key={message.id}
          className="flex gap-3 group hover:bg-gray-50 dark:hover:bg-gray-800/50 rounded-lg p-2 -m-2 transition-colors"
          onMouseEnter={() => setHoveredMessage(message.id)}
          onMouseLeave={() => setHoveredMessage(null)}
        >
          <div className="w-10 h-10 rounded-full bg-purple-500 dark:bg-purple-600 flex items-center justify-center text-white font-semibold flex-shrink-0">
            {message.username?.[0]?.toUpperCase() || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-2">
              <span className="font-semibold text-gray-900 dark:text-white">{message.username}</span>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {formatTime(message.created_at)}
              </span>
            </div>
            <p className="text-gray-800 dark:text-gray-200 mt-1 break-words">{message.content}</p>
            
            {message.file_url && (
              <div className="mt-2">
                <a
                  href={message.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-purple-600 dark:text-purple-400 hover:underline"
                >
                  <Paperclip className="w-4 h-4" />
                  <span>{message.file_name || 'Attachment'}</span>
                </a>
              </div>
            )}

            {/* Reactions */}
            {reactions[message.id] && Object.keys(reactions[message.id]).length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {Object.entries(reactions[message.id]).map(([emoji, reactionList]: [string, any]) => (
                  <button
                    key={emoji}
                    onClick={() => onReactionClick(message.id, emoji)}
                    className={`flex items-center gap-1 px-2 py-1 rounded border text-sm transition-colors ${
                      hasUserReacted(message.id, emoji)
                        ? 'bg-purple-100 dark:bg-purple-900 border-purple-300 dark:border-purple-700'
                        : 'bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    <span>{emoji}</span>
                    <span className="text-xs">{reactionList.length}</span>
                  </button>
                ))}
              </div>
            )}

            {/* Action buttons (show on hover) */}
            {hoveredMessage === message.id && (
              <div className="flex items-center gap-2 mt-2">
                <button
                  onClick={() => onThreadClick(message.id)}
                  className="flex items-center gap-1 px-2 py-1 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                >
                  <Reply className="w-4 h-4" />
                  Reply
                </button>
                <button
                  onClick={() => onReactionClick(message.id, '👍')}
                  className="flex items-center gap-1 px-2 py-1 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                >
                  <Smile className="w-4 h-4" />
                  React
                </button>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

