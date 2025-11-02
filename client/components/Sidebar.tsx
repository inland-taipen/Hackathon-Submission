'use client'

import { useState } from 'react'
import { Hash, Lock, MessageCircle, Plus, Users } from 'lucide-react'
import { useTheme } from 'next-themes'

interface SidebarProps {
  user: any
  workspaces: any[]
  channels: any[]
  dmConversations: any[]
  selectedView: 'channel' | 'dm' | null
  selectedId: string | null
  onSelectChannel: (channel: any) => void
  onSelectDM: (conversation: any) => void
  onCreateChannel: (name: string, isPrivate: boolean) => void
  onStartDM: (userId: string) => void
  onLogout: () => void
  workspaceId: string | null
  availableUsers: any[]
}

export default function Sidebar({
  user,
  workspaces,
  channels,
  dmConversations,
  selectedView,
  selectedId,
  onSelectChannel,
  onSelectDM,
  onCreateChannel,
  onStartDM,
  onLogout,
  workspaceId,
  availableUsers
}: SidebarProps) {
  const [showNewChannel, setShowNewChannel] = useState(false)
  const [newChannelName, setNewChannelName] = useState('')
  const [isPrivateChannel, setIsPrivateChannel] = useState(false)
  const [showDMList, setShowDMList] = useState(false)
  const [isMobileOpen, setIsMobileOpen] = useState(false)
  const { theme, setTheme } = useTheme()

  const handleCreateChannel = (e: React.FormEvent) => {
    e.preventDefault()
    if (newChannelName.trim()) {
      onCreateChannel(newChannelName.trim(), isPrivateChannel)
      setNewChannelName('')
      setIsPrivateChannel(false)
      setShowNewChannel(false)
    }
  }

  return (
    <>
      {/* Mobile menu button */}
      <button
        onClick={() => setIsMobileOpen(!isMobileOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-purple-900 text-white rounded-lg"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {/* Sidebar */}
      <div className={`
        fixed lg:static inset-y-0 left-0 z-40
        w-64 bg-purple-900 dark:bg-gray-900 text-white flex flex-col
        transform transition-transform duration-200 ease-in-out
        ${isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* Header */}
        <div className="p-4 border-b border-purple-800 dark:border-gray-700">
          <h1 className="text-2xl font-bold">Midnight</h1>
          <p className="text-sm text-purple-200 dark:text-gray-400">@{user?.username}</p>
        </div>

        {/* Workspaces */}
        {workspaces.length > 0 && (
          <div className="p-4 border-b border-purple-800 dark:border-gray-700">
            <h2 className="text-xs font-semibold text-purple-300 dark:text-gray-400 uppercase mb-2">Workspaces</h2>
            <div className="space-y-1">
              {workspaces.map(workspace => (
                <div key={workspace.id} className="px-2 py-1 rounded hover:bg-purple-800 dark:hover:bg-gray-800">
                  {workspace.name}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Channels */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs font-semibold text-purple-300 dark:text-gray-400 uppercase">Channels</h2>
            <button
              onClick={() => setShowNewChannel(!showNewChannel)}
              className="text-xl hover:text-white transition-colors"
              title="Create channel"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {showNewChannel && (
            <form onSubmit={handleCreateChannel} className="mb-4 space-y-2">
              <input
                type="text"
                value={newChannelName}
                onChange={(e) => setNewChannelName(e.target.value)}
                placeholder="Channel name"
                className="w-full px-3 py-2 bg-purple-800 dark:bg-gray-800 text-white rounded border border-purple-700 dark:border-gray-700 focus:outline-none focus:border-purple-500"
                autoFocus
              />
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={isPrivateChannel}
                  onChange={(e) => setIsPrivateChannel(e.target.checked)}
                  className="rounded"
                />
                Private channel
              </label>
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="flex-1 px-3 py-1 bg-purple-700 hover:bg-purple-600 rounded text-sm"
                >
                  Create
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowNewChannel(false)
                    setNewChannelName('')
                  }}
                  className="flex-1 px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-sm"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          <div className="space-y-1">
            {channels.map(channel => (
              <button
                key={channel.id}
                onClick={() => {
                  onSelectChannel(channel)
                  setIsMobileOpen(false)
                }}
                className={`w-full text-left px-3 py-2 rounded hover:bg-purple-800 dark:hover:bg-gray-800 transition-colors flex items-center gap-2 ${
                  selectedView === 'channel' && selectedId === channel.id ? 'bg-purple-800 dark:bg-gray-800' : ''
                }`}
              >
                {channel.is_private ? (
                  <Lock className="w-4 h-4" />
                ) : (
                  <Hash className="w-4 h-4" />
                )}
                <span>{channel.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Direct Messages */}
        <div className="p-4 border-t border-purple-800 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs font-semibold text-purple-300 dark:text-gray-400 uppercase">Direct Messages</h2>
            <button
              onClick={() => setShowDMList(!showDMList)}
              className="text-xl hover:text-white transition-colors"
              title="Start new DM"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {showDMList && (
            <div className="mb-4 space-y-1 max-h-48 overflow-y-auto">
              {availableUsers.map(availableUser => (
                <button
                  key={availableUser.id}
                  onClick={() => {
                    onStartDM(availableUser.id)
                    setShowDMList(false)
                  }}
                  className="w-full text-left px-3 py-2 rounded hover:bg-purple-800 dark:hover:bg-gray-800 transition-colors flex items-center gap-2"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>{availableUser.username}</span>
                </button>
              ))}
            </div>
          )}

          <div className="space-y-1">
            {dmConversations.map(conversation => (
              <button
                key={conversation.id}
                onClick={() => {
                  onSelectDM(conversation)
                  setIsMobileOpen(false)
                }}
                className={`w-full text-left px-3 py-2 rounded hover:bg-purple-800 dark:hover:bg-gray-800 transition-colors flex items-center gap-2 ${
                  selectedView === 'dm' && selectedId === conversation.id ? 'bg-purple-800 dark:bg-gray-800' : ''
                }`}
              >
                <Users className="w-4 h-4" />
                <span>{conversation.other_username}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-purple-800 dark:border-gray-700 space-y-2">
          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="w-full py-2 px-4 bg-purple-800 dark:bg-gray-800 hover:bg-purple-700 dark:hover:bg-gray-700 rounded transition-colors text-sm"
          >
            {theme === 'dark' ? '☀️ Light' : '🌙 Dark'}
          </button>
          <button
            onClick={onLogout}
            className="w-full py-2 px-4 bg-purple-800 dark:bg-gray-800 hover:bg-purple-700 dark:hover:bg-gray-700 rounded transition-colors text-sm"
          >
            Logout
          </button>
        </div>
      </div>

      {/* Mobile overlay */}
      {isMobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-30"
          onClick={() => setIsMobileOpen(false)}
        />
      )}
    </>
  )
}

