'use client'

import { useState, useEffect, useRef } from 'react'
import { Home, MessageCircle, Bell, FolderOpen, MoreHorizontal, Hash, Lock, Plus, ChevronDown, Settings, Edit3, Search, Star, Video, Book } from 'lucide-react'
import AddWorkspaceModal from './AddWorkspaceModal'

interface SlackSidebarProps {
  user: any
  workspace: any
  channels: any[]
  dmConversations: any[]
  selectedView: 'home' | 'dms' | 'activity' | 'files' | 'channel' | 'dm' | null
  selectedId: string | null
  onSelectView: (view: 'home' | 'dms' | 'activity' | 'files') => void
  onSelectChannel: (channel: any) => void
  onSelectDM: (conversation: any) => void
  onCreateChannel: () => void
  onStartDM: () => void
  onAddWorkspace?: (name: string, slug: string) => Promise<void>
  userPresence?: Record<string, { status: string, custom_status?: string, status_emoji?: string }>
  unreadCounts?: Record<string, number>
}

export default function SlackSidebar({
  user,
  workspace,
  channels,
  dmConversations,
  selectedView,
  selectedId,
  onSelectView,
  onSelectChannel,
  onSelectDM,
  onCreateChannel,
  onStartDM,
  onAddWorkspace,
  userPresence = {},
  unreadCounts = {}
}: SlackSidebarProps) {
  const [expandedChannels, setExpandedChannels] = useState(true)
  const [expandedDMs, setExpandedDMs] = useState(true)
  const [showMoreMenu, setShowMoreMenu] = useState(false)
  const [showAddWorkspaceModal, setShowAddWorkspaceModal] = useState(false)
  const [expandedHuddles, setExpandedHuddles] = useState(false)
  const [expandedDirectories, setExpandedDirectories] = useState(false)
  const [expandedStarred, setExpandedStarred] = useState(false)
  const [dmSearchQuery, setDmSearchQuery] = useState('')

  const getInitials = (name: string) => {
    return name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'U'
  }

  const filteredDMs = dmConversations.filter(dm =>
    dm.other_username.toLowerCase().includes(dmSearchQuery.toLowerCase())
  )

  return (
    <>
      <AddWorkspaceModal
        isOpen={showAddWorkspaceModal}
        onClose={() => setShowAddWorkspaceModal(false)}
        onCreateWorkspace={onAddWorkspace || (async () => {})}
      />
      
      <div className="flex h-screen bg-[#1a1d21] dark:bg-[#1a1d21]">
        {/* Left Workspace Switcher */}
        <div className="w-[70px] bg-[#350d36] dark:bg-[#350d36] flex flex-col items-center py-2 border-r border-[#3f0e40]">
        <div className="mb-2 relative group">
          <div className="w-10 h-10 rounded-md bg-[#4a154b] flex items-center justify-center text-white font-semibold cursor-pointer hover:bg-[#5a1f5b] transition-colors">
            {workspace?.name?.slice(0, 2).toUpperCase() || 'WS'}
          </div>
          {/* Tooltip */}
          <div className="absolute left-full ml-2 top-0 bg-black text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
            {workspace?.name || 'Workspace'}
          </div>
        </div>
        
        <div className="flex-1 flex flex-col gap-2">
          <button
            onClick={() => onSelectView('home')}
            className={`w-10 h-10 rounded-md flex items-center justify-center transition-colors relative group ${
              selectedView === 'home' ? 'bg-[#1264a3] text-white' : 'text-[#d1d2d3] hover:bg-[#4a154b]'
            }`}
            title="Home"
          >
            <Home className="w-5 h-5" />
            <div className="absolute left-full ml-2 top-0 bg-black text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
              Home
            </div>
          </button>
          <button
            onClick={() => onSelectView('dms')}
            className={`w-10 h-10 rounded-md flex items-center justify-center transition-colors relative group ${
              selectedView === 'dms' ? 'bg-[#1264a3] text-white' : 'text-[#d1d2d3] hover:bg-[#4a154b]'
            }`}
            title="Direct messages"
          >
            <MessageCircle className="w-5 h-5" />
            <div className="absolute left-full ml-2 top-0 bg-black text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
              Direct messages
            </div>
          </button>
          <button
            onClick={() => onSelectView('activity')}
            className={`w-10 h-10 rounded-md flex items-center justify-center transition-colors relative group ${
              selectedView === 'activity' ? 'bg-[#1264a3] text-white' : 'text-[#d1d2d3] hover:bg-[#4a154b]'
            }`}
            title="Activity"
          >
            <Bell className="w-5 h-5" />
            <div className="absolute left-full ml-2 top-0 bg-black text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
              Activity
            </div>
          </button>
          <button
            onClick={() => onSelectView('files')}
            className={`w-10 h-10 rounded-md flex items-center justify-center transition-colors relative group ${
              selectedView === 'files' ? 'bg-[#1264a3] text-white' : 'text-[#d1d2d3] hover:bg-[#4a154b]'
            }`}
            title="Files"
          >
            <FolderOpen className="w-5 h-5" />
            <div className="absolute left-full ml-2 top-0 bg-black text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
              Files
            </div>
          </button>
          <button
            onClick={() => setShowMoreMenu(!showMoreMenu)}
            className="w-10 h-10 rounded-md flex items-center justify-center text-[#d1d2d3] hover:bg-[#4a154b] transition-colors relative group"
            title="More"
          >
            <MoreHorizontal className="w-5 h-5" />
            <div className="absolute left-full ml-2 top-0 bg-black text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
              More
            </div>
            
            {/* More Menu Dropdown */}
            {showMoreMenu && (
              <>
                {/* Backdrop */}
                <div 
                  className="fixed inset-0 z-40" 
                  onClick={() => setShowMoreMenu(false)}
                />
                
                {/* Menu */}
                <div className="absolute left-full ml-2 top-0 bg-white dark:bg-[#1a1d21] border border-[#e8e8e8] dark:border-[#343a40] rounded-lg shadow-lg py-2 min-w-[220px] z-50">
                  <div className="px-4 py-3 border-b border-[#e8e8e8] dark:border-[#343a40]">
                    <div className="text-xs text-[#868686] mb-1">Signed in as</div>
                    <div className="text-sm font-semibold text-[#1d1c1d] dark:text-[#d1d2d3]">
                      {user?.username || 'User'}
                    </div>
                    <div className="text-xs text-[#868686]">
                      {user?.email || ''}
                    </div>
                  </div>
                  
                  <button
                    onClick={() => {
                      setShowMoreMenu(false)
                      localStorage.clear()
                      window.location.href = '/'
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-[#1d1c1d] dark:text-[#d1d2d3] hover:bg-[#f8f8f8] dark:hover:bg-[#2c2d30] transition-colors flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    Sign out
                  </button>
                </div>
              </>
            )}
          </button>
        </div>

        <div className="mt-auto">
          <button 
            onClick={() => setShowAddWorkspaceModal(true)}
            className="w-10 h-10 rounded-md bg-[#2eb67d] flex items-center justify-center text-white hover:bg-[#2a9e6f] transition-colors mb-2 relative group" 
            title="Add workspace"
          >
            <Plus className="w-5 h-5" />
            <div className="absolute left-full ml-2 bottom-0 bg-black text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
              Add workspace
            </div>
          </button>
          <button 
            onClick={() => {
              if (confirm(`Signed in as: ${user?.username}\nEmail: ${user?.email}\n\nWould you like to sign out?`)) {
                localStorage.clear();
                window.location.href = '/';
              }
            }}
            className="w-10 h-10 rounded-md bg-[#2eb67d] flex items-center justify-center text-white font-semibold cursor-pointer hover:opacity-90 transition-opacity relative group"
            title="Profile & Settings"
          >
            {getInitials(user?.username || 'U')}
            <div className="absolute left-full ml-2 bottom-0 bg-black text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
              {user?.username || 'Profile'}
            </div>
          </button>
        </div>
      </div>

      {/* Main Sidebar */}
      <div className="w-[260px] bg-[#3f0e40] dark:bg-[#3f0e40] text-white flex flex-col">
        {/* Workspace Header */}
        <div className="p-3 border-b border-[#5a1f5b]">
          <div className="flex items-center gap-2 mb-2">
            <button className="flex-1 flex items-center justify-between hover:bg-[#4a154b] rounded px-2 py-1.5 transition-colors">
              <span className="font-bold text-lg truncate">{workspace?.name || 'Workspace'}</span>
              <ChevronDown className="w-4 h-4 flex-shrink-0" />
            </button>
            <button 
              className="p-1.5 hover:bg-[#4a154b] rounded transition-colors"
              title="Settings"
              onClick={() => alert('Workspace settings coming soon!')}
            >
              <Settings className="w-4 h-4" />
            </button>
            <button 
              className="p-1.5 hover:bg-[#4a154b] rounded transition-colors"
              title="New message"
              onClick={() => onStartDM()}
            >
              <Edit3 className="w-4 h-4" />
            </button>
          </div>
          
          {/* Trial Banner */}
          <button className="w-full flex items-center justify-between bg-[#4a154b] hover:bg-[#5a1f5b] rounded px-3 py-2 transition-colors text-sm">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                <path d="M10 2L2 7l8 5 8-5-8-5zM2 17l8 5 8-5M2 12l8 5 8-5"/>
              </svg>
              <span className="text-[#d1d2d3]">29 days left in trial</span>
            </div>
            <ChevronDown className="w-3 h-3" />
          </button>
        </div>

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto px-2 py-2">
          {/* Main Navigation Items */}
          <div className="space-y-0.5 mb-3">
            <button
              onClick={() => onSelectView('home')}
              className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm font-medium ${
                selectedView === 'home'
                  ? 'bg-[#1264a3] text-white'
                  : 'text-[#d1d2d3] hover:bg-[#350d36] hover:text-white'
              }`}
            >
              <Home className="w-4 h-4" />
              <span>Home</span>
            </button>

            {/* Huddles Section */}
            <div>
              <button
                onClick={() => setExpandedHuddles(!expandedHuddles)}
                className="w-full flex items-center gap-2 px-2 py-1 rounded text-sm text-[#d1d2d3] hover:bg-[#350d36] hover:text-white"
              >
                <ChevronDown className={`w-3 h-3 transition-transform ${expandedHuddles ? '' : '-rotate-90'}`} />
                <Video className="w-4 h-4" />
                <span>Huddles</span>
              </button>
              {expandedHuddles && (
                <div className="ml-8 mt-1 mb-2 text-xs text-[#b3b3b3]">
                  <p>No active huddles</p>
                </div>
              )}
            </div>

            {/* Directories Section */}
            <div>
              <button
                onClick={() => setExpandedDirectories(!expandedDirectories)}
                className="w-full flex items-center gap-2 px-2 py-1 rounded text-sm text-[#d1d2d3] hover:bg-[#350d36] hover:text-white"
              >
                <ChevronDown className={`w-3 h-3 transition-transform ${expandedDirectories ? '' : '-rotate-90'}`} />
                <Book className="w-4 h-4" />
                <span>Directories</span>
              </button>
              {expandedDirectories && (
                <div className="ml-8 mt-1 mb-2 text-xs text-[#b3b3b3]">
                  <p>No directories yet</p>
                </div>
              )}
            </div>

            {/* Starred Section */}
            <div>
              <button
                onClick={() => setExpandedStarred(!expandedStarred)}
                className="w-full flex items-center gap-2 px-2 py-1 rounded text-sm text-[#d1d2d3] hover:bg-[#350d36] hover:text-white"
              >
                <ChevronDown className={`w-3 h-3 transition-transform ${expandedStarred ? '' : '-rotate-90'}`} />
                <Star className="w-4 h-4" />
                <span>Starred</span>
              </button>
              {expandedStarred && (
                <div className="ml-8 mt-2 mb-2 text-xs text-[#b3b3b3]">
                  <p>Drag and drop important stuff here</p>
                </div>
              )}
            </div>
          </div>

          <div className="border-t border-[#5a1f5b] pt-3 mb-3"></div>

          {/* Channels */}
          <div>
            <button
              onClick={() => setExpandedChannels(!expandedChannels)}
              className="w-full flex items-center gap-2 px-2 py-1 rounded text-sm text-[#d1d2d3] hover:bg-[#350d36] hover:text-white"
            >
              <ChevronDown className={`w-3 h-3 transition-transform ${expandedChannels ? '' : '-rotate-90'}`} />
              <span className="font-medium">Channels</span>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onCreateChannel()
                }}
                className="ml-auto p-0.5 hover:bg-[#4a154b] rounded"
              >
                <Plus className="w-4 h-4" />
              </button>
            </button>
            {expandedChannels && (
              <div className="mt-1 space-y-0.5">
                {channels.map(channel => {
                  const unreadCount = unreadCounts[channel.id] || 0
                  return (
                    <button
                      key={channel.id}
                      onClick={() => onSelectChannel(channel)}
                      className={`w-full flex items-center gap-2 px-2 py-1 rounded text-sm ${
                        selectedView === 'channel' && selectedId === channel.id
                          ? 'bg-[#1264a3] text-white'
                          : 'text-[#d1d2d3] hover:bg-[#350d36] hover:text-white'
                      }`}
                    >
                      {channel.is_private ? (
                        <Lock className="w-4 h-4 flex-shrink-0" />
                      ) : (
                        <Hash className="w-4 h-4 flex-shrink-0" />
                      )}
                      <span className="truncate flex-1 text-left">{channel.name}</span>
                      {unreadCount > 0 && (
                        <span className="bg-red-500 text-white text-xs font-bold rounded-full px-1.5 py-0.5 min-w-[20px] text-center">
                          {unreadCount}
                        </span>
                      )}
                    </button>
                  )
                })}
                <button
                  onClick={onCreateChannel}
                  className="w-full flex items-center gap-2 px-2 py-1 rounded text-sm text-[#d1d2d3] hover:bg-[#350d36] hover:text-white"
                >
                  <Plus className="w-4 h-4 flex-shrink-0" />
                  <span>Add channels</span>
                </button>
              </div>
            )}
          </div>

          {/* Direct Messages */}
          <div className="mt-3">
            <button
              onClick={() => setExpandedDMs(!expandedDMs)}
              className="w-full flex items-center gap-2 px-2 py-1 rounded text-sm text-[#d1d2d3] hover:bg-[#350d36] hover:text-white"
            >
              <ChevronDown className={`w-3 h-3 transition-transform ${expandedDMs ? '' : '-rotate-90'}`} />
              <span className="font-medium">Direct messages</span>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onStartDM()
                }}
                className="ml-auto p-0.5 hover:bg-[#4a154b] rounded"
              >
                <Plus className="w-4 h-4" />
              </button>
            </button>
            {expandedDMs && (
              <div className="mt-1 space-y-0.5">
                {/* Find a DM search */}
                <div className="px-2 py-1">
                  <div className="relative">
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-[#868686]" />
                    <input
                      type="text"
                      placeholder="Find a DM"
                      value={dmSearchQuery}
                      onChange={(e) => setDmSearchQuery(e.target.value)}
                      className="w-full pl-7 pr-2 py-1 text-xs bg-[#4a154b] border border-[#5a1f5b] rounded text-[#d1d2d3] placeholder-[#868686] focus:outline-none focus:ring-1 focus:ring-[#1264a3]"
                    />
                  </div>
                </div>
                {filteredDMs.map(conversation => {
                  const presence = userPresence[conversation.other_user_id]
                  const isOnline = presence?.status === 'online'
                  return (
                    <button
                      key={conversation.id}
                      onClick={() => onSelectDM(conversation)}
                      className={`w-full flex items-center gap-2 px-2 py-1 rounded text-sm ${
                        selectedView === 'dm' && selectedId === conversation.id
                          ? 'bg-[#1264a3] text-white'
                          : 'text-[#d1d2d3] hover:bg-[#350d36] hover:text-white'
                      }`}
                    >
                      <div className="relative w-5 h-5 flex-shrink-0">
                        <div className="w-5 h-5 rounded-full bg-[#2eb67d] flex items-center justify-center text-white text-xs font-semibold">
                          {conversation.other_username?.[0]?.toUpperCase() || 'U'}
                        </div>
                        {isOnline && (
                          <div className="absolute bottom-0 right-0 w-2 h-2 bg-green-500 rounded-full border-2 border-[#3f0e40]"></div>
                        )}
                      </div>
                      <span className="truncate flex-1 text-left">{conversation.other_username}</span>
                      {presence?.custom_status && (
                        <span className="text-xs opacity-70">{presence.status_emoji} {presence.custom_status}</span>
                      )}
                    </button>
                  )
                })}
                <button
                  onClick={onStartDM}
                  className="w-full flex items-center gap-2 px-2 py-1 rounded text-sm text-[#d1d2d3] hover:bg-[#350d36] hover:text-white"
                >
                  <Plus className="w-4 h-4 flex-shrink-0" />
                  <span>Add colleagues</span>
                </button>
              </div>
            )}
          </div>

          {/* Customize Navigation Link */}
          <div className="mt-6 pt-4 border-t border-[#5a1f5b]">
            <button 
              onClick={() => alert('Customize navigation coming soon!')}
              className="text-xs text-[#b3b3b3] hover:text-white px-2 py-1 transition-colors"
            >
              Customise navigation bar
            </button>
          </div>
        </div>
      </div>
    </div>
    </>
  )
}
