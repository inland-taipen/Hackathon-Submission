'use client'

import { useState } from 'react'
import { Reply, Smile, Paperclip, MoreHorizontal } from 'lucide-react'

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

interface SlackMessageListProps {
  messages: Message[]
  currentUserId: string
  onThreadClick: (messageId: string) => void
  onReactionClick: (messageId: string, emoji: string) => void
  reactions: Record<string, Record<string, any[]>>
}

export default function SlackMessageList({
  messages,
  currentUserId,
  onThreadClick,
  onReactionClick,
  reactions
}: SlackMessageListProps) {
  const [hoveredMessage, setHoveredMessage] = useState<string | null>(null)

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const minutes = Math.floor(diff / (1000 * 60))

    if (minutes < 1) return 'now'
    if (minutes < 60) return `${minutes}m`
    
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours}h`
    
    const days = Math.floor(hours / 24)
    if (days === 1) return 'Yesterday'
    if (days < 7) return `${days}d`
    
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' })
  }

  const getDateSeparatorText = (timestamp: string) => {
    const date = new Date(timestamp)
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    
    const isSameDay = (d1: Date, d2: Date) => {
      return d1.getDate() === d2.getDate() &&
        d1.getMonth() === d2.getMonth() &&
        d1.getFullYear() === d2.getFullYear()
    }
    
    if (isSameDay(date, today)) return 'Today'
    if (isSameDay(date, yesterday)) return 'Yesterday'
    
    // Show full date
    return date.toLocaleDateString([], { 
      weekday: 'long', 
      month: 'long', 
      day: 'numeric',
      year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined
    })
  }

  const getInitials = (name: string) => {
    return name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'U'
  }

  const hasUserReacted = (messageId: string, emoji: string) => {
    return reactions[messageId]?.[emoji]?.some((r: any) => r.user_id === currentUserId) || false
  }

  return (
    <div className="flex-1 overflow-y-auto bg-white dark:bg-[#1a1d21]">
      <div className="max-w-[calc(100vw-400px)] mx-auto py-4">
        {messages.length === 0 ? null : (
          <div className="px-4 space-y-1">
            {messages.map((message, index) => {
              const showAvatar = index === 0 || messages[index - 1].user_id !== message.user_id
              const prevMessage = index > 0 ? messages[index - 1] : null
              const showTimestamp = !prevMessage || 
                new Date(message.created_at).getTime() - new Date(prevMessage.created_at).getTime() > 600000 // 10 minutes

              return (
                <div key={message.id}>
                  {showTimestamp && (
                    <div className="flex items-center gap-2 py-4 my-2">
                      <div className="h-px bg-[#e8e8e8] dark:bg-[#343a40] flex-1"></div>
                      <span className="text-xs text-[#1d1c1d] dark:text-[#d1d2d3] font-bold px-3 py-1 rounded-full bg-white dark:bg-[#1a1d21] border border-[#e8e8e8] dark:border-[#343a40]">
                        {getDateSeparatorText(message.created_at)}
                      </span>
                      <div className="h-px bg-[#e8e8e8] dark:bg-[#343a40] flex-1"></div>
                    </div>
                  )}
                  
                  {/* Check if this is a system/join message */}
                  {message.content.toLowerCase().includes('joined') || message.content.toLowerCase().includes('initialized') ? (
                    <div className="px-4 py-1.5">
                      <div className="flex items-center gap-2 text-[13px] text-[#616061]">
                        <div className="flex items-center gap-1.5">
                          <div className="w-5 h-5 rounded-full bg-[#2EB67D] flex items-center justify-center text-white text-xs font-semibold">
                            {message.username?.[0]?.toUpperCase() || 'U'}
                          </div>
                          <span className="font-semibold text-[#1d1c1d]">{message.username}</span>
                          <span>{message.content}</span>
                        </div>
                        <span className="text-[#868686] ml-1">{formatTime(message.created_at)}</span>
                      </div>
                    </div>
                  ) : (
                    <div
                      className={`flex gap-3 px-2 py-0.5 group hover:bg-[#f8f8f8] dark:hover:bg-[#2c2d30] rounded transition-colors ${
                      !showAvatar ? 'pl-[52px]' : ''
                    }`}
                    onMouseEnter={() => setHoveredMessage(message.id)}
                    onMouseLeave={() => setHoveredMessage(null)}
                  >
                    {showAvatar && (
                      <div className="w-9 h-9 rounded-full bg-[#2eb67d] flex items-center justify-center text-white font-semibold text-sm flex-shrink-0 mt-1">
                        {getInitials(message.username)}
                      </div>
                    )}
                    
                    <div className="flex-1 min-w-0">
                      {showAvatar && (
                        <div className="flex items-baseline gap-2 mb-0.5">
                          <span className="text-[15px] font-bold text-[#1d1c1d] dark:text-[#d1d2d3]">
                            {message.username}
                          </span>
                          <span className="text-xs text-[#616061] dark:text-[#868686]">
                            {formatTime(message.created_at)}
                          </span>
                        </div>
                      )}
                      
                      {/* Only show content if it exists and is not just the file placeholder */}
                      {message.content && !message.content.startsWith('📎') && (
                        <div className="text-[15px] text-[#1d1c1d] dark:text-[#d1d2d3] leading-relaxed break-words whitespace-pre-wrap">
                          {message.content}
                        </div>
                      )}
                      
                      {message.file_url && (
                        <div className="mt-2">
                          {/* Handle images with preview */}
                          {message.file_url.startsWith('data:image') || message.file_url.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i) ? (
                            <div className="flex flex-col gap-2">
                              <img
                                src={message.file_url}
                                alt={message.file_name || 'Image attachment'}
                                className="max-w-md rounded border border-[#e8e8e8] dark:border-[#343a40] cursor-pointer"
                                onClick={() => window.open(message.file_url, '_blank')}
                                onError={(e) => {
                                  // Fallback to link if image fails to load
                                  const target = e.target as HTMLImageElement
                                  target.style.display = 'none'
                                  const link = target.nextElementSibling as HTMLElement
                                  if (link) link.style.display = 'inline-flex'
                                }}
                              />
                              <a
                                href={message.file_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                download={message.file_name}
                                className="inline-flex items-center gap-2 text-[#1264a3] hover:text-[#0d5085] text-[15px] hover:underline"
                                style={{ display: 'none' }}
                              >
                                <Paperclip className="w-4 h-4" />
                                <span>{message.file_name || 'Attachment'}</span>
                              </a>
                            </div>
                          ) : (
                            // Other file types - show download link
                            <a
                              href={message.file_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              download={message.file_name}
                              className="inline-flex items-center gap-2 px-3 py-2 bg-[#f8f8f8] dark:bg-[#2c2d30] border border-[#e8e8e8] dark:border-[#343a40] rounded text-[#1264a3] hover:text-[#0d5085] hover:bg-[#f0f0f0] dark:hover:bg-[#35373a] text-[15px] transition-colors"
                              onClick={(e) => {
                                // Handle data URLs by creating a blob and downloading
                                if (message.file_url && message.file_url.startsWith('data:')) {
                                  e.preventDefault()
                                  const link = document.createElement('a')
                                  link.href = message.file_url
                                  link.download = message.file_name || 'attachment'
                                  document.body.appendChild(link)
                                  link.click()
                                  document.body.removeChild(link)
                                }
                              }}
                            >
                              <Paperclip className="w-4 h-4 flex-shrink-0" />
                              <span className="font-medium">{message.file_name || 'Attachment'}</span>
                              <span className="text-xs text-[#616061] dark:text-[#868686] ml-1">(click to download)</span>
                            </a>
                          )}
                        </div>
                      )}

                      {/* Reactions */}
                      {reactions[message.id] && Object.keys(reactions[message.id]).length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {Object.entries(reactions[message.id]).map(([emoji, reactionList]: [string, any]) => (
                            <button
                              key={emoji}
                              onClick={() => onReactionClick(message.id, emoji)}
                              className={`flex items-center gap-1.5 px-2 py-1 rounded border text-[13px] transition-colors ${
                                hasUserReacted(message.id, emoji)
                                  ? 'bg-[#f8f8f8] dark:bg-[#2c2d30] border-[#1264a3]'
                                  : 'bg-white dark:bg-[#1a1d21] border-[#e8e8e8] dark:border-[#343a40] hover:bg-[#f8f8f8] dark:hover:bg-[#2c2d30]'
                              }`}
                            >
                              <span>{emoji}</span>
                              <span className="text-[#616061] dark:text-[#868686] font-medium">
                                {reactionList.length}
                              </span>
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Action buttons (show on hover) */}
                      {hoveredMessage === message.id && (
                        <div className="flex items-center gap-1 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => onThreadClick(message.id)}
                            className="flex items-center gap-1 px-2 py-1 text-[13px] text-[#616061] dark:text-[#868686] hover:text-[#1d1c1d] dark:hover:text-[#d1d2d3] hover:bg-[#f8f8f8] dark:hover:bg-[#2c2d30] rounded transition-colors"
                          >
                            <Reply className="w-4 h-4" />
                            Reply
                          </button>
                          <button
                            onClick={() => onReactionClick(message.id, '👍')}
                            className="flex items-center gap-1 px-2 py-1 text-[13px] text-[#616061] dark:text-[#868686] hover:text-[#1d1c1d] dark:hover:text-[#d1d2d3] hover:bg-[#f8f8f8] dark:hover:bg-[#2c2d30] rounded transition-colors"
                          >
                            <Smile className="w-4 h-4" />
                            Add reaction
                          </button>
                          <button className="p-1 text-[#616061] dark:text-[#868686] hover:text-[#1d1c1d] dark:hover:text-[#d1d2d3] hover:bg-[#f8f8f8] dark:hover:bg-[#2c2d30] rounded transition-colors">
                            <MoreHorizontal className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

