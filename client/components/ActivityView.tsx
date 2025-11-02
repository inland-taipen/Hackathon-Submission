'use client'

import { useState, useEffect } from 'react'
import { config } from '@/lib/config'import { Hash, User, FileText, Heart, Reply } from 'lucide-react'
import { config } from '@/lib/config'import axios from 'axios'
import { config } from '@/lib/config'
interface Activity {
  id: string
  type: 'message' | 'reply' | 'mention' | 'reaction' | 'file'
  channel_id?: string
  channel_name?: string
  dm_conversation_id?: string
  user_id: string
  username: string
  avatar?: string
  content: string
  file_url?: string
  file_name?: string
  created_at: string
  thread_id?: string
  parent_message_id?: string
  emoji?: string
}

interface ActivityViewProps {
  userId: string
  workspaceId: string
  getAuthHeaders: () => Record<string, string>
}

export default function ActivityView({ userId, workspaceId, getAuthHeaders }: ActivityViewProps) {
  const [activities, setActivities] = useState<Activity[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Simple date formatting function
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInMs = now.getTime() - date.getTime()
    const diffInMinutes = Math.floor(diffInMs / (1000 * 60))
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60))
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24))
    
    if (diffInMinutes < 1) return 'just now'
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`
    if (diffInHours < 24) return `${diffInHours}h ago`
    if (diffInDays === 1) return 'Yesterday'
    if (diffInDays < 7) return `${diffInDays}d ago`
    
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    return `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`
  }

  useEffect(() => {
    if (userId && workspaceId) {
      fetchActivity()
    }
  }, [userId, workspaceId])

  const fetchActivity = async () => {
    try {
      setIsLoading(true)
      
      // Fetch recent messages from all channels in workspace
      const channelsResponse = await axios.get(
        `http://localhost:3001/api/workspaces/${workspaceId}/channels`,
        { headers: getAuthHeaders() }
      )
      const channels = channelsResponse.data

      // Fetch messages from each channel
      const allMessages: any[] = []
      for (const channel of channels) {
        try {
          const messagesResponse = await axios.get(
            `http://localhost:3001/api/channels/${channel.id}/messages?limit=50`,
            { headers: getAuthHeaders() }
          )
          const messages = messagesResponse.data.map((msg: any) => ({
            ...msg,
            channel_name: channel.name,
            type: msg.thread_id ? 'reply' : 'message'
          }))
          allMessages.push(...messages)
        } catch (err) {
          console.error(`Failed to fetch messages for channel ${channel.id}:`, err)
        }
      }

      // Fetch DM messages
      try {
        const dmsResponse = await axios.get(
          `http://localhost:3001/api/dm-conversations`,
          { headers: getAuthHeaders() }
        )
        for (const dm of dmsResponse.data) {
          try {
            const dmMessagesResponse = await axios.get(
              `http://localhost:3001/api/dm-conversations/${dm.id}/messages`,
              { headers: getAuthHeaders() }
            )
            const dmMessages = dmMessagesResponse.data.map((msg: any) => ({
              ...msg,
              type: 'message',
              is_dm: true,
              other_username: dm.other_username
            }))
            allMessages.push(...dmMessages)
          } catch (err) {
            console.error(`Failed to fetch DM messages:`, err)
          }
        }
      } catch (err) {
        console.error('Failed to fetch DMs:', err)
      }

      // Filter and sort activities
      const filtered = allMessages
        .filter(msg => {
          // Show messages from last 7 days
          const msgDate = new Date(msg.created_at)
          const daysAgo = (Date.now() - msgDate.getTime()) / (1000 * 60 * 60 * 24)
          return daysAgo <= 7
        })
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 50) // Limit to 50 most recent
        .map(msg => ({
          id: msg.id,
          type: msg.thread_id ? 'reply' as const : msg.file_url ? 'file' as const : 'message' as const,
          channel_id: msg.channel_id,
          channel_name: msg.channel_name,
          dm_conversation_id: msg.dm_conversation_id,
          user_id: msg.user_id,
          username: msg.username,
          avatar: msg.avatar,
          content: msg.content,
          file_url: msg.file_url,
          file_name: msg.file_name,
          created_at: msg.created_at,
          thread_id: msg.thread_id,
          is_dm: msg.is_dm,
          other_username: msg.other_username
        }))

      setActivities(filtered)
    } catch (error) {
      console.error('Failed to fetch activity:', error)
    } finally {
      setIsLoading(false)
    }
  }


  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1264a3] mx-auto mb-4"></div>
          <p className="text-[#616061] dark:text-[#868686]">Loading activity...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col bg-white dark:bg-[#1a1d21]">
      <div className="border-b border-[#DDD] dark:border-[#343a40] px-6 py-4">
        <h2 className="text-xl font-bold text-[#1d1c1d] dark:text-[#d1d2d3]">Activity</h2>
        <p className="text-sm text-[#616061] dark:text-[#868686] mt-1">
          Recent messages and updates from your workspace
        </p>
      </div>

      <div className="flex-1 overflow-y-auto">
        {activities.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-[#2eb67d] flex items-center justify-center text-white text-2xl mb-4 mx-auto">
                ✓
              </div>
              <p className="text-[#616061] dark:text-[#868686]">
                You've caught up with everything. Looks like things are quiet for now.
              </p>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-[#e8e8e8] dark:divide-[#343a40]">
            {activities.map((activity) => {
              const isDM = activity.dm_conversation_id && !activity.channel_id
              
              return (
                <div
                  key={activity.id}
                  className="px-6 py-4 hover:bg-[#f8f8f8] dark:hover:bg-[#2c2d30] transition-colors cursor-pointer"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-[#2eb67d] flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
                      {activity.username?.[0]?.toUpperCase() || 'U'}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-[#1d1c1d] dark:text-[#d1d2d3]">
                          {activity.username}
                        </span>
                        {activity.type === 'reply' && (
                          <span className="text-xs text-[#616061] dark:text-[#868686] flex items-center gap-1">
                            <Reply className="w-3 h-3" />
                            replied
                          </span>
                        )}
                        {activity.file_url && (
                          <span className="text-xs text-[#616061] dark:text-[#868686] flex items-center gap-1">
                            <FileText className="w-3 h-3" />
                            shared a file
                          </span>
                        )}
                        {isDM ? (
                          <span className="text-xs text-[#616061] dark:text-[#868686]">in a direct message</span>
                        ) : activity.channel_name ? (
                          <span className="text-xs text-[#616061] dark:text-[#868686] flex items-center gap-1">
                            in <Hash className="w-3 h-3" />{activity.channel_name}
                          </span>
                        ) : null}
                      </div>
                      
                      {activity.content && (
                        <p className="text-[#1d1c1d] dark:text-[#d1d2d3] mb-2 whitespace-pre-wrap break-words">
                          {activity.content}
                        </p>
                      )}
                      
                      {activity.file_url && activity.file_name && (
                        <div className="mb-2">
                          <a
                            href={activity.file_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#f8f8f8] dark:bg-[#2c2d30] rounded text-sm text-[#1264a3] hover:underline"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <FileText className="w-4 h-4" />
                            {activity.file_name}
                          </a>
                        </div>
                      )}
                      
                      <div className="text-xs text-[#616061] dark:text-[#868686]">
                        {formatDate(activity.created_at)}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

