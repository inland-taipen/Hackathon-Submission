'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import axios from 'axios'
import io, { Socket } from 'socket.io-client'
import { Hash, MessageCircle } from 'lucide-react'
import SlackSidebar from '@/components/SlackSidebar'
import ChannelHeader from '@/components/ChannelHeader'
import SlackMessageList from '@/components/SlackMessageList'
import MessageInput from '@/components/MessageInput'
import WorkspaceOnboarding from '@/components/WorkspaceOnboarding'
import CreateChannelModal from '@/components/CreateChannelModal'
import UserSearchModal from '@/components/UserSearchModal'
import ChannelWelcomeScreen from '@/components/ChannelWelcomeScreen'
import CanvasTab from '@/components/CanvasTab'
import InviteTeammatesModal from '@/components/InviteTeammatesModal'
import ActivityView from '@/components/ActivityView'
import FilesView from '@/components/FilesView'
import { config } from '@/lib/config'

interface User {
  id: string
  username: string
  email: string
  avatar?: string
}

interface Workspace {
  id: string
  name: string
  slug: string
}

interface Channel {
  id: string
  name: string
  description?: string
  is_private: boolean
  workspace_id: string
  topic?: string
}

interface DMConversation {
  id: string
  other_username: string
  other_avatar?: string
  other_user_id: string
  status?: string
  custom_status?: string
  status_emoji?: string
}

interface Message {
  id: string
  channel_id?: string
  dm_conversation_id?: string
  thread_id?: string
  user_id: string
  content: string
  created_at: string
  username: string
  avatar?: string
  file_url?: string
  file_name?: string
}

export default function ChatPage() {
  const [user, setUser] = useState<User | null>(null)
  const [workspaces, setWorkspaces] = useState<Workspace[]>([])
  const [currentWorkspace, setCurrentWorkspace] = useState<Workspace | null>(null)
  const [channels, setChannels] = useState<Channel[]>([])
  const [dmConversations, setDMConversations] = useState<DMConversation[]>([])
  const [availableUsers, setAvailableUsers] = useState<User[]>([])
  const [selectedView, setSelectedView] = useState<'home' | 'dms' | 'activity' | 'files' | 'channel' | 'dm' | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [threadMessages, setThreadMessages] = useState<Record<string, Message[]>>({})
  const [selectedThread, setSelectedThread] = useState<string | null>(null)
  const [socket, setSocket] = useState<Socket | null>(null)
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set())
  const [reactions, setReactions] = useState<Record<string, Record<string, any[]>>>({})
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [showCreateChannelModal, setShowCreateChannelModal] = useState(false)
  const [showUserSearchModal, setShowUserSearchModal] = useState(false)
  const [showInviteTeammatesModal, setShowInviteTeammatesModal] = useState(false)
  const [channelTab, setChannelTab] = useState<'messages' | 'canvas'>('messages')
  const [userPresence, setUserPresence] = useState<Record<string, { status: string, custom_status?: string, status_emoji?: string }>>({})
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({})
  const [pinnedMessages, setPinnedMessages] = useState<Message[]>([])
  const [channelTopic, setChannelTopic] = useState<string>('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const router = useRouter()

  const getSessionId = () => {
    return localStorage.getItem('sessionId') || ''
  }

  const getAuthHeaders = () => {
    return {
      'Authorization': `Bearer ${getSessionId()}`,
      'X-Session-Id': getSessionId()
    }
  }

  useEffect(() => {
    const sessionId = getSessionId()
    const userData = localStorage.getItem('user')

    console.log('Chat page loaded:', { sessionId: !!sessionId, userData: !!userData })

    if (!sessionId || !userData) {
      console.log('No session or user data, redirecting to home')
      router.push('/')
      return
    }

    try {
      const user = JSON.parse(userData)
      setUser(user)
      console.log('User set from localStorage:', user)
    } catch (e) {
      console.error('Failed to parse user data:', e)
      // Clear invalid session data
      localStorage.removeItem('sessionId')
      localStorage.removeItem('user')
      router.push('/')
      return
    }

    // Initialize socket connection
    const newSocket = io(config.apiUrl, {
      auth: { sessionId },
      transports: ['websocket', 'polling'], // Use both transports for better reliability
      upgrade: true,
      rememberUpgrade: true
    })
    setSocket(newSocket)

    // Verify session
    axios.get(`${config.apiUrl}/api/auth/me`, { headers: getAuthHeaders() })
      .then(res => {
        console.log('Session verified:', res.data)
        setUser(res.data.user)
      })
      .catch((err) => {
        console.error('Session verification failed:', err.response?.status, err.response?.data)
        // Only redirect if it's a 401 (unauthorized)
        if (err.response?.status === 401) {
          router.push('/')
        }
      })

    // Fetch workspaces
    axios.get(`${config.apiUrl}/api/workspaces`, { headers: getAuthHeaders() })
      .then(res => {
        setWorkspaces(res.data)
        if (res.data.length > 0) {
          setCurrentWorkspace(res.data[0])
        } else {
          // Show onboarding for new users
          setShowOnboarding(true)
        }
      })
      .catch(err => {
        console.error('Failed to fetch workspaces:', err)
        if (err.response?.status === 401) {
          router.push('/')
        } else {
          setShowOnboarding(true)
        }
      })

    // Socket event listeners
    newSocket.on('new-message', (message: Message) => {
      console.log('📥 Received new-message via socket:', message)
      console.log('📎 Message file_url:', message.file_url)
      console.log('📎 Message file_name:', message.file_name)
      console.log('Current selectedView:', selectedView)
      console.log('Current selectedId:', selectedId)
      console.log('Message channel_id:', message.channel_id)
      console.log('Message dm_conversation_id:', message.dm_conversation_id)
      
      // Only add message if it's for the current channel/DM
      const isForCurrentChannel = selectedView === 'channel' && message.channel_id === selectedId
      const isForCurrentDM = selectedView === 'dm' && message.dm_conversation_id === selectedId
      
      if (isForCurrentChannel || isForCurrentDM) {
        console.log('✅ Message is for current view, adding to list')
        setMessages(prev => {
          // Check if message already exists
          if (prev.find(m => m.id === message.id)) {
            console.log('Message already exists, skipping:', message.id)
            return prev
          }
          console.log('Adding new message to list:', message.id, 'with file:', message.file_url)
          const updated = [...prev, message]
          console.log('Updated messages count:', updated.length)
          return updated
        })
        // Scroll to bottom when new message arrives
        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
        }, 100)
      } else {
        console.log('⚠️ Message is not for current view, ignoring')
      }
    })

    newSocket.on('user-typing', (data: { userId: string; username: string }) => {
      setTypingUsers(prev => new Set([...Array.from(prev), data.username]))
    })

    newSocket.on('user-stop-typing', () => {
      setTypingUsers(new Set())
    })

    newSocket.on('error', (error: { message: string; details?: string }) => {
      console.error('❌ Socket error:', error)
      alert(`Error: ${error.message}${error.details ? ` - ${error.details}` : ''}`)
    })

    newSocket.on('connect', () => {
      console.log('✅ Socket connected:', newSocket.id)
    })

    newSocket.on('disconnect', () => {
      console.warn('⚠️ Socket disconnected')
    })

    // Presence updates
    newSocket.on('presence-update', (data: { user_id: string; status: string }) => {
      setUserPresence(prev => ({
        ...prev,
        [data.user_id]: { status: data.status }
      }))
    })

    return () => {
      newSocket.close()
    }
  }, [router])

  // Fetch presence data when workspace changes
  useEffect(() => {
    if (!currentWorkspace || !user) return

    axios.get(`${config.apiUrl}/api/workspaces/${currentWorkspace.id}/presence`, {
      headers: getAuthHeaders()
    })
      .then(res => {
        const presenceMap: Record<string, any> = {}
        res.data.forEach((p: any) => {
          presenceMap[p.id] = {
            status: p.status || 'offline',
            custom_status: p.custom_status,
            status_emoji: p.status_emoji
          }
        })
        setUserPresence(presenceMap)
      })
      .catch(console.error)

    // Announce we're online
    if (socket) {
      socket.emit('user-online', { userId: user.id, workspaceId: currentWorkspace.id })
    }
  }, [currentWorkspace, user, socket])

  // Fetch unread counts when workspace or channels change
  useEffect(() => {
    if (!currentWorkspace || !user) return

    axios.get(`${config.apiUrl}/api/workspaces/${currentWorkspace.id}/unread-counts`, {
      headers: getAuthHeaders()
    })
      .then(res => {
        const countsMap: Record<string, number> = {}
        res.data.forEach((c: any) => {
          countsMap[c.channel_id] = c.unread_count
        })
        setUnreadCounts(countsMap)
      })
      .catch(console.error)
  }, [currentWorkspace, user, channels])

  // Mark channel as read when viewing it
  useEffect(() => {
    if (selectedView === 'channel' && selectedId) {
      axios.post(`${config.apiUrl}/api/channels/${selectedId}/mark-read`, {}, {
        headers: getAuthHeaders()
      })
        .then(() => {
          setUnreadCounts(prev => ({ ...prev, [selectedId]: 0 }))
        })
        .catch(console.error)
    }
  }, [selectedView, selectedId])

  // Fetch pinned messages when channel changes
  useEffect(() => {
    if (selectedView === 'channel' && selectedId) {
      axios.get(`${config.apiUrl}/api/channels/${selectedId}/pinned`, {
        headers: getAuthHeaders()
      })
        .then(res => setPinnedMessages(res.data || []))
        .catch(console.error)
    } else {
      setPinnedMessages([])
    }
  }, [selectedView, selectedId])

  // Get channel topic
  useEffect(() => {
    if (selectedView === 'channel' && selectedId) {
      const channel = channels.find(c => c.id === selectedId)
      setChannelTopic(channel?.topic || '')
    } else {
      setChannelTopic('')
    }
  }, [selectedView, selectedId, channels])

  useEffect(() => {
    if (!currentWorkspace || showOnboarding) return

    // Fetch channels
    axios.get(`${config.apiUrl}/api/workspaces/${currentWorkspace.id}/channels`, {
      headers: getAuthHeaders()
    })
      .then(res => {
        console.log('Channels loaded:', res.data)
        console.log('Current selectedView:', selectedView)
        setChannels(res.data)
        // Auto-select first channel if no view is selected
        if (res.data.length > 0) {
          console.log('Auto-selecting first channel:', res.data[0])
          setSelectedView('channel')
          setSelectedId(res.data[0].id)
        } else {
          console.log('No channels available, showing home')
          setSelectedView('home')
        }
      })
      .catch(console.error)

    // Fetch available users
    axios.get(`${config.apiUrl}/api/users`, {
      params: { workspaceId: currentWorkspace.id },
      headers: getAuthHeaders()
    })
      .then(res => setAvailableUsers(res.data))
      .catch(console.error)
  }, [currentWorkspace, showOnboarding])

  useEffect(() => {
    if (showOnboarding) return
    
    // Fetch DM conversations
    axios.get(`${config.apiUrl}/api/dm-conversations`, {
      headers: getAuthHeaders()
    })
      .then(res => setDMConversations(res.data))
      .catch(console.error)
  }, [showOnboarding])

  useEffect(() => {
    if (!selectedView || !selectedId || !socket || showOnboarding) return

    // Join room
    if (selectedView === 'channel') {
      socket.emit('join-channel', selectedId)
    } else if (selectedView === 'dm') {
      socket.emit('join-dm', selectedId)
    }

    // Fetch messages
    const endpoint = selectedView === 'channel'
      ? `${config.apiUrl}/api/channels/${selectedId}/messages`
      : `${config.apiUrl}/api/dm-conversations/${selectedId}/messages`

    axios.get(endpoint, { headers: getAuthHeaders() })
      .then(res => {
        setMessages(res.data)
        // Load reactions for all messages
        Promise.all(res.data.map((msg: Message) =>
          axios.get(`${config.apiUrl}/api/messages/${msg.id}/reactions`, {
            headers: getAuthHeaders()
          }).then(reactionRes => ({ messageId: msg.id, reactions: reactionRes.data }))
            .catch(() => ({ messageId: msg.id, reactions: {} }))
        )).then(reactionData => {
          const reactionsMap: Record<string, Record<string, any[]>> = {}
          reactionData.forEach(({ messageId, reactions }) => {
            reactionsMap[messageId] = reactions
          })
          setReactions(reactionsMap)
        })
      })
      .catch(console.error)

    return () => {
      if (selectedView === 'channel') {
        socket.emit('leave-channel', selectedId)
      }
    }
  }, [selectedView, selectedId, socket, showOnboarding])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSendMessage = (content: string, fileUrl?: string, fileName?: string) => {
    console.log('=== handleSendMessage called ===')
    console.log('Content:', content)
    console.log('FileUrl:', fileUrl)
    console.log('User:', user)
    console.log('Socket:', socket)
    console.log('Selected view:', selectedView)
    console.log('Selected ID:', selectedId)
    
    // Allow messages with just a file (no content) or just content (no file)
    if ((!content || !content.trim()) && !fileUrl) {
      console.error('Cannot send message - no content and no file:', {
        content: content,
        fileUrl: fileUrl,
        hasContent: !!content?.trim(),
        hasFileUrl: !!fileUrl
      })
      return
    }

    if (!user || !socket) {
      console.error('Cannot send message - missing user or socket:', {
        hasUser: !!user,
        hasSocket: !!socket
      })
      return
    }

    if (selectedView === 'channel' && selectedId) {
      console.log('Sending message to channel:', selectedId)
      const messageData = {
        channelId: selectedId,
        userId: user.id,
        content: content || '', // Always send content, even if empty
        threadId: selectedThread || null,
        fileUrl: fileUrl || null,
        fileName: fileName || null
      }
      const fileSizeMB = fileUrl ? (fileUrl.length / 1024 / 1024).toFixed(2) : 0
      console.log('📤 Message data being sent:', {
        channelId: messageData.channelId,
        userId: messageData.userId,
        contentLength: messageData.content.length,
        fileUrlLength: fileUrl?.length || 0,
        fileSizeMB: fileSizeMB,
        fileName: messageData.fileName
      })
      
      // Add error handling for socket emission
      try {
        socket.emit('send-message', messageData)
      } catch (err) {
        console.error('❌ Error emitting message:', err)
        alert('Failed to send message. File might be too large.')
      }
    } else if (selectedView === 'dm' && selectedId) {
      console.log('Sending message to DM:', selectedId)
      const messageData = {
        dmConversationId: selectedId,
        userId: user.id,
        content: content || '', // Always send content, even if empty
        fileUrl: fileUrl || null,
        fileName: fileName || null
      }
      const fileSizeMB = fileUrl ? (fileUrl.length / 1024 / 1024).toFixed(2) : 0
      console.log('📤 Message data being sent:', {
        dmConversationId: messageData.dmConversationId,
        userId: messageData.userId,
        contentLength: messageData.content.length,
        fileUrlLength: fileUrl?.length || 0,
        fileSizeMB: fileSizeMB,
        fileName: messageData.fileName
      })
      
      // Add error handling for socket emission
      try {
        socket.emit('send-message', messageData)
      } catch (err) {
        console.error('❌ Error emitting message:', err)
        alert('Failed to send message. File might be too large.')
      }
    } else {
      console.error('No valid channel or DM selected')
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }
    socket.emit('stop-typing', {
      channelId: selectedView === 'channel' ? selectedId : null,
      dmConversationId: selectedView === 'dm' ? selectedId : null
    })
  }

  const handleTyping = useCallback(() => {
    if (!socket || !user) return

    socket.emit('typing', {
      channelId: selectedView === 'channel' ? selectedId : null,
      dmConversationId: selectedView === 'dm' ? selectedId : null,
      userId: user.id,
      username: user.username
    })

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }

    typingTimeoutRef.current = setTimeout(() => {
      socket.emit('stop-typing', {
        channelId: selectedView === 'channel' ? selectedId : null,
        dmConversationId: selectedView === 'dm' ? selectedId : null
      })
    }, 3000)
  }, [socket, user, selectedView, selectedId])

  const handleCreateChannel = async (name: string, description: string, isPrivate: boolean, memberIds?: string[]) => {
    if (!currentWorkspace) return

    try {
      const res = await axios.post(
        `${config.apiUrl}/api/workspaces/${currentWorkspace.id}/channels`,
        { name, description, isPrivate, memberIds: memberIds || [] },
        { headers: getAuthHeaders() }
      )
      setChannels(prev => [...prev, res.data])
      setSelectedView('channel')
      setSelectedId(res.data.id)
      setShowCreateChannelModal(false)
    } catch (err: any) {
      console.error('Failed to create channel:', err)
      alert(err.response?.data?.error || 'Failed to create channel')
      throw err
    }
  }

  const handleStartDM = async (userId: string) => {
    try {
      const res = await axios.post(
        `${config.apiUrl}/api/dm-conversations`,
        { userId },
        { headers: getAuthHeaders() }
      )
      console.log('DM conversation created/fetched:', res.data)
      setDMConversations(prev => {
        // Check if conversation already exists
        if (prev.find(c => c.id === res.data.id)) {
          console.log('DM conversation already in list')
          return prev
        }
        console.log('Adding new DM conversation to list')
        return [...prev, res.data]
      })
      setSelectedView('dm')
      setSelectedId(res.data.id)
      setShowUserSearchModal(false)
    } catch (err) {
      console.error('Failed to start DM:', err)
      alert('Failed to start conversation. Please try again.')
    }
  }

  const handleThreadClick = async (messageId: string) => {
    if (threadMessages[messageId]) {
      setSelectedThread(messageId)
      return
    }

    try {
      const res = await axios.get(
        `${config.apiUrl}/api/messages/${messageId}/threads`,
        { headers: getAuthHeaders() }
      )
      setThreadMessages(prev => ({ ...prev, [messageId]: res.data }))
      setSelectedThread(messageId)
    } catch (err) {
      console.error('Failed to fetch thread:', err)
    }
  }

  const handleReactionClick = async (messageId: string, emoji: string) => {
    try {
      await axios.post(
        `${config.apiUrl}/api/messages/${messageId}/reactions`,
        { emoji },
        { headers: getAuthHeaders() }
      )
      // Refetch reactions
      const res = await axios.get(
        `${config.apiUrl}/api/messages/${messageId}/reactions`,
        { headers: getAuthHeaders() }
      )
      setReactions(prev => ({ ...prev, [messageId]: res.data }))
    } catch (err) {
      console.error('Failed to toggle reaction:', err)
    }
  }

  const handleOnboardingComplete = async (workspaceName: string) => {
    console.log('handleOnboardingComplete called with:', workspaceName)
    console.log('Current user:', user)
    console.log('Session ID:', getSessionId())
    console.log('Auth headers:', getAuthHeaders())
    
    if (!user || !getSessionId()) {
      console.error('No user or session found! Redirecting to login...')
      router.push('/')
      return
    }
    
    try {
      console.log('Creating workspace:', workspaceName)
      const res = await axios.post(
        'http://localhost:3001/api/workspaces',
        { name: workspaceName },
        { headers: getAuthHeaders() }
      )
      console.log('Workspace created:', res.data)
      setWorkspaces([res.data])
      setCurrentWorkspace(res.data)
      setShowOnboarding(false)
      
      // Create default channel
      console.log('Creating default channel...')
      const channelRes = await axios.post(
        `${config.apiUrl}/api/workspaces/${res.data.id}/channels`,
        { name: 'general', isPrivate: false },
        { headers: getAuthHeaders() }
      )
      console.log('Channel created:', channelRes.data)
      setChannels([channelRes.data])
      setSelectedView('channel')
      setSelectedId(channelRes.data.id)
    } catch (err: any) {
      console.error('Failed to create workspace:', err)
      console.error('Error details:', {
        status: err.response?.status,
        data: err.response?.data,
        message: err.message
      })
      
      if (err.response?.status === 401) {
        alert('Session expired. Please log in again.')
        router.push('/')
      } else {
        alert(`Failed to create workspace: ${err.response?.data?.error || err.message}. Please check console for details.`)
      }
      throw err // Re-throw so component can handle it
    }
  }

  const handleAddWorkspace = async (name: string, slug: string) => {
    try {
      const res = await axios.post(
        `${config.apiUrl}/api/workspaces`,
        { name, slug },
        { headers: getAuthHeaders() }
      )
      
      // Add to workspaces list
      setWorkspaces(prev => [...prev, res.data])
      
      // Switch to new workspace
      setCurrentWorkspace(res.data)
      
      // Fetch channels for the new workspace
      const channelsRes = await axios.get(
        `${config.apiUrl}/api/workspaces/${res.data.id}/channels`,
        { headers: getAuthHeaders() }
      )
      setChannels(channelsRes.data)
      
      // Switch to home view
      setSelectedView('home')
      setSelectedId(null)
    } catch (err: any) {
      console.error('Failed to create workspace:', err)
      throw err
    }
  }

  if (showOnboarding) {
    return <WorkspaceOnboarding onComplete={handleOnboardingComplete} />
  }

  const currentChannel = selectedView === 'channel' ? channels.find(c => c.id === selectedId) : null
  const currentDM = selectedView === 'dm' ? dmConversations.find(d => d.id === selectedId) : null


  return (
    <div className="flex h-screen bg-white dark:bg-[#1a1d21]">
      <SlackSidebar
        user={user}
        workspace={currentWorkspace}
        channels={channels}
        dmConversations={dmConversations}
        selectedView={selectedView}
        selectedId={selectedId}
        onSelectView={(view) => {
          console.log('Manual view selection:', view)
          setSelectedView(view)
          setSelectedId(null)
          setSelectedThread(null)
        }}
        onSelectChannel={(channel) => {
          console.log('Selecting channel:', channel)
          setSelectedView('channel')
          setSelectedId(channel.id)
          setSelectedThread(null)
          setChannelTab('messages') // Reset to messages tab when switching channels
        }}
        onSelectDM={(conversation) => {
          console.log('Selecting DM conversation:', conversation)
          setSelectedView('dm')
          setSelectedId(conversation.id)
          setSelectedThread(null)
        }}
        onCreateChannel={() => setShowCreateChannelModal(true)}
        onStartDM={() => setShowUserSearchModal(true)}
        onAddWorkspace={handleAddWorkspace}
        userPresence={userPresence}
        unreadCounts={unreadCounts}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col bg-white dark:bg-[#1a1d21]">
        {/* Loading state */}
        {!currentWorkspace && !showOnboarding && (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#611f69] mx-auto mb-4"></div>
              <p className="text-[#616061] dark:text-[#868686]">Loading workspace...</p>
            </div>
          </div>
        )}
        
        {/* Views */}
        {selectedView === 'home' && currentWorkspace && (
          <div className="flex-1 flex items-center justify-center bg-white dark:bg-[#1a1d21]">
            <div className="text-center max-w-2xl px-8">
              <div className="mb-8">
                <div className="w-24 h-24 rounded-2xl bg-[#4a154b] flex items-center justify-center text-white text-4xl font-bold mx-auto mb-6">
                  {currentWorkspace?.name?.slice(0, 2).toUpperCase() || 'WS'}
                </div>
                <h1 className="text-4xl font-bold text-[#1d1c1d] dark:text-[#d1d2d3] mb-3">
                  Welcome to {currentWorkspace?.name || 'your workspace'}!
                </h1>
                <p className="text-lg text-[#616061] dark:text-[#868686]">
                  This is where you and your team collaborate
                </p>
              </div>
              
              <div className="grid grid-cols-2 gap-4 mt-12">
                <button
                  onClick={() => {
                    if (channels.length > 0) {
                      setSelectedView('channel')
                      setSelectedId(channels[0].id)
                    }
                  }}
                  className="p-6 bg-[#f8f8f8] dark:bg-[#2c2d30] rounded-lg hover:bg-[#e8e8e8] dark:hover:bg-[#343a40] transition-colors text-left"
                >
                  <Hash className="w-8 h-8 text-[#1264a3] mb-3" />
                  <h3 className="text-lg font-semibold text-[#1d1c1d] dark:text-[#d1d2d3] mb-2">
                    Browse channels
                  </h3>
                  <p className="text-sm text-[#616061] dark:text-[#868686]">
                    Explore all channels in your workspace
                  </p>
                </button>
                
                <button
                  onClick={() => setShowUserSearchModal(true)}
                  className="p-6 bg-[#f8f8f8] dark:bg-[#2c2d30] rounded-lg hover:bg-[#e8e8e8] dark:hover:bg-[#343a40] transition-colors text-left"
                >
                  <MessageCircle className="w-8 h-8 text-[#2eb67d] mb-3" />
                  <h3 className="text-lg font-semibold text-[#1d1c1d] dark:text-[#d1d2d3] mb-2">
                    Start a conversation
                  </h3>
                  <p className="text-sm text-[#616061] dark:text-[#868686]">
                    Send a direct message to a teammate
                  </p>
                </button>
              </div>
            </div>
          </div>
        )}

        {selectedView === 'dms' && (
          <div className="flex-1 flex items-center justify-center bg-white dark:bg-[#1a1d21]">
            <div className="text-center max-w-md px-8">
              <div className="w-20 h-20 rounded-full bg-[#2eb67d] flex items-center justify-center text-white mx-auto mb-6">
                <MessageCircle className="w-10 h-10" />
              </div>
              <h2 className="text-2xl font-bold text-[#1d1c1d] dark:text-[#d1d2d3] mb-3">
                Direct Messages
              </h2>
              <p className="text-[#616061] dark:text-[#868686] mb-6">
                Send messages directly to anyone in your workspace
              </p>
              {dmConversations.length > 0 ? (
                <div className="space-y-2 max-w-sm mx-auto">
                  <p className="text-sm text-[#616061] dark:text-[#868686] mb-3">
                    Your conversations:
                  </p>
                  {dmConversations.map(conv => (
                    <button
                      key={conv.id}
                      onClick={() => {
                        setSelectedView('dm')
                        setSelectedId(conv.id)
                      }}
                      className="w-full flex items-center gap-3 p-3 bg-[#f8f8f8] dark:bg-[#2c2d30] rounded-lg hover:bg-[#e8e8e8] dark:hover:bg-[#343a40] transition-colors"
                    >
                      <div className="w-10 h-10 rounded-full bg-[#2eb67d] flex items-center justify-center text-white font-semibold">
                        {conv.other_username?.[0]?.toUpperCase() || 'U'}
                      </div>
                      <span className="text-[#1d1c1d] dark:text-[#d1d2d3] font-medium">
                        {conv.other_username}
                      </span>
                    </button>
                  ))}
                </div>
              ) : (
                <button
                  onClick={() => setShowUserSearchModal(true)}
                  className="px-6 py-3 bg-[#1264a3] text-white rounded hover:bg-[#0d5085] transition-colors font-semibold"
                >
                  Start a new conversation
                </button>
              )}
            </div>
          </div>
        )}

        {selectedView === 'activity' && (
          <ActivityView 
            userId={user?.id || ''} 
            workspaceId={currentWorkspace?.id || ''}
            getAuthHeaders={getAuthHeaders}
          />
        )}

        {selectedView === 'files' && (
          <FilesView 
            workspaceId={currentWorkspace?.id || ''} 
            getAuthHeaders={getAuthHeaders}
          />
        )}

        {/* Channel/DM View */}
        {(selectedView === 'channel' || selectedView === 'dm') && (
          <>
            <ChannelHeader
              channel={currentChannel || undefined}
              dmUser={currentDM ? { name: currentDM.other_username } : undefined}
              isDM={selectedView === 'dm'}
              memberCount={channels.filter(c => c.id === currentChannel?.id).length}
              activeTab={channelTab}
              onTabChange={setChannelTab}
              onInviteTeammates={() => setShowInviteTeammatesModal(true)}
            />
            
            <div className="flex-1 flex overflow-hidden">
              {selectedView === 'channel' && channelTab === 'canvas' ? (
                <CanvasTab 
                  channelName={currentChannel?.name || 'channel'}
                  channelId={currentChannel?.id || ''}
                  getAuthHeaders={getAuthHeaders}
                />
              ) : (
                <div className="flex-1 flex flex-col overflow-hidden">
                  {selectedView === 'channel' && messages.length === 0 ? (
                    <ChannelWelcomeScreen
                      channelName={currentChannel?.name || 'channel'}
                      channelId={currentChannel?.id || ''}
                      onCreateFromTemplate={async (templateId) => {
                        console.log('Template selected:', templateId)
                        // The message should be emitted via Socket.io, but also fetch to ensure we have it
                        if (selectedView === 'channel' && currentChannel?.id) {
                          try {
                            // Wait a bit for socket to receive the message, then fetch
                            setTimeout(async () => {
                              try {
                                const res = await axios.get(
                                  `${config.apiUrl}/api/channels/${currentChannel.id}/messages`,
                                  { headers: getAuthHeaders() }
                                )
                                setMessages(res.data)
                                // Scroll to bottom
                                setTimeout(() => {
                                  messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
                                }, 100)
                              } catch (err) {
                                console.error('Failed to refresh messages:', err)
                              }
                            }, 500)
                          } catch (err) {
                            console.error('Failed to refresh messages:', err)
                          }
                        }
                      }}
                      getAuthHeaders={getAuthHeaders}
                    />
                  ) : selectedView === 'dm' && messages.length === 0 ? (
                    <div className="flex-1 flex items-center justify-center p-8">
                      <div className="text-center max-w-md">
                        <div className="w-16 h-16 rounded-full bg-[#2eb67d] flex items-center justify-center text-white text-2xl font-semibold mx-auto mb-4">
                          {currentDM?.other_username?.[0]?.toUpperCase() || 'U'}
                        </div>
                        <h2 className="text-2xl font-bold text-[#1d1c1d] dark:text-[#d1d2d3] mb-2">
                          This is the beginning of your direct message with {currentDM?.other_username}
                        </h2>
                        <p className="text-[#616061] dark:text-[#868686]">
                          Start a conversation by sending a message below.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <>
                      <SlackMessageList
                        messages={messages}
                        currentUserId={user?.id || ''}
                        onThreadClick={handleThreadClick}
                        onReactionClick={handleReactionClick}
                        reactions={reactions}
                      />
                      <div ref={messagesEndRef} />
                      
                      {/* Typing indicator */}
                      {typingUsers.size > 0 && (
                        <div className="px-6 py-2 text-sm text-[#616061] dark:text-[#868686] italic">
                          {Array.from(typingUsers).join(', ')} {typingUsers.size === 1 ? 'is' : 'are'} typing...
                        </div>
                      )}
                    </>
                  )}

                  <MessageInput
                    placeholder={
                      selectedView === 'channel'
                        ? `Message #${currentChannel?.name || 'channel'}`
                        : `Message ${currentDM?.other_username || 'user'}`
                    }
                    onSubmit={handleSendMessage}
                    onTyping={handleTyping}
                    getAuthHeaders={getAuthHeaders}
                    selectedView={selectedView}
                    selectedId={selectedId || undefined}
                  />
                </div>
              )}

              {/* Thread sidebar */}
              {selectedThread && (
                <div className="w-80 border-l border-[#e8e8e8] dark:border-[#343a40] bg-white dark:bg-[#1a1d21] flex flex-col">
                  <div className="p-4 border-b border-[#e8e8e8] dark:border-[#343a40]">
                    <button
                      onClick={() => setSelectedThread(null)}
                      className="text-sm text-[#616061] dark:text-[#868686] hover:text-[#1d1c1d] dark:hover:text-[#d1d2d3] mb-2"
                    >
                      ← Back
                    </button>
                    <h3 className="font-semibold text-[#1d1c1d] dark:text-[#d1d2d3]">Thread</h3>
                  </div>
                  <div className="flex-1 overflow-y-auto p-4">
                    {threadMessages[selectedThread]?.map(msg => (
                      <div key={msg.id} className="mb-4">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-sm text-[#1d1c1d] dark:text-[#d1d2d3]">{msg.username}</span>
                          <span className="text-xs text-[#616061] dark:text-[#868686]">
                            {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="text-sm text-[#1d1c1d] dark:text-[#d1d2d3]">{msg.content}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {!selectedView && (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-[#616061] dark:text-[#868686]">Select a channel or start a conversation</p>
          </div>
        )}
      </div>

      {/* Modals */}
      <CreateChannelModal
        isOpen={showCreateChannelModal}
        onClose={() => setShowCreateChannelModal(false)}
        onCreateChannel={handleCreateChannel}
        availableUsers={availableUsers}
      />

      <UserSearchModal
        isOpen={showUserSearchModal}
        onClose={() => setShowUserSearchModal(false)}
        onSelectUser={handleStartDM}
        availableUsers={availableUsers}
        currentUserId={user?.id || ''}
      />

      {currentWorkspace?.id && (
        <InviteTeammatesModal
          isOpen={showInviteTeammatesModal}
          onClose={() => setShowInviteTeammatesModal(false)}
          workspaceId={currentWorkspace.id}
          getAuthHeaders={getAuthHeaders}
          onInviteSuccess={() => {
            // Refresh available users list
            axios.get(`${config.apiUrl}/api/users?workspaceId=${currentWorkspace.id}`, {
              headers: getAuthHeaders()
            }).then(res => {
              setAvailableUsers(res.data || [])
            }).catch(err => {
              console.error('Failed to refresh users:', err)
            })
          }}
        />
      )}
    </div>
  )
}
