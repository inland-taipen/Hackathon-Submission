'use client'

import { Hash, Users, Phone, Download, MoreHorizontal, Search, Plus, Pin } from 'lucide-react'

interface ChannelHeaderProps {
  channel?: {
    name: string
    description?: string
    topic?: string
  }
  dmUser?: {
    name: string
  }
  isDM?: boolean
  memberCount?: number
  activeTab?: 'messages' | 'canvas'
  onTabChange?: (tab: 'messages' | 'canvas') => void
  onInviteTeammates?: () => void
  pinnedCount?: number
  onShowPinned?: () => void
}

export default function ChannelHeader({ channel, dmUser, isDM, memberCount, activeTab = 'messages', onTabChange, onInviteTeammates, pinnedCount = 0, onShowPinned }: ChannelHeaderProps) {
  return (
    <>
      <div className="bg-white border-b border-[#DDD]">
        {/* Header Bar */}
        <div className="h-[60px] px-6 flex items-center justify-between">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {isDM ? (
              <>
                <div className="w-8 h-8 rounded-full bg-[#2EB67D] flex items-center justify-center text-white font-semibold flex-shrink-0 text-sm">
                  {dmUser?.name?.[0]?.toUpperCase() || 'U'}
                </div>
                <div className="min-w-0">
                  <h1 className="text-[15px] font-bold text-[#1d1c1d] truncate">
                    {dmUser?.name || 'Direct Message'}
                  </h1>
                </div>
              </>
            ) : (
              <>
                <Hash className="w-5 h-5 text-[#616061] flex-shrink-0" />
                <div className="min-w-0">
                  <h1 className="text-[15px] font-bold text-[#1d1c1d] truncate">
                    {channel?.name || 'channel'}
                  </h1>
                  {(channel?.topic || channel?.description) && (
                    <p className="text-xs text-[#616061] truncate mt-0.5">
                      {channel.topic || channel.description}
                    </p>
                  )}
                </div>
              </>
            )}
          </div>

          <div className="flex items-center gap-1">
            {!isDM && pinnedCount > 0 && onShowPinned && (
              <button 
                onClick={onShowPinned}
                className="px-3 py-1.5 flex items-center gap-2 text-sm font-semibold text-[#1d1c1d] hover:bg-[#f8f8f8] rounded transition-colors"
              >
                <Pin className="w-4 h-4" />
                <span>{pinnedCount} pinned</span>
              </button>
            )}
            {!isDM && (
              <button 
                onClick={onInviteTeammates}
                className="px-3 py-1.5 flex items-center gap-2 text-sm font-semibold text-[#1d1c1d] hover:bg-[#f8f8f8] rounded transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Invite teammates</span>
              </button>
            )}
            {!isDM && memberCount !== undefined && (
              <button className="p-2 text-[#616061] hover:bg-[#f8f8f8] rounded transition-colors" title={`${memberCount} members`}>
                <Users className="w-5 h-5" />
              </button>
            )}
            <button className="px-3 py-1.5 flex items-center gap-1 text-sm font-semibold text-[#1d1c1d] hover:bg-[#f8f8f8] rounded transition-colors" title="Huddle">
              <Phone className="w-4 h-4" />
              <span>Huddle</span>
            </button>
            <button className="p-2 text-[#616061] hover:bg-[#f8f8f8] rounded transition-colors" title="Search">
              <Search className="w-5 h-5" />
            </button>
            <button className="p-2 text-[#616061] hover:bg-[#f8f8f8] rounded transition-colors" title="More options">
              <MoreHorizontal className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tabs for channel - positioned below header */}
        {!isDM && (
          <div className="px-6 flex items-center gap-1 border-t border-[#DDD]">
            <button
              onClick={() => onTabChange?.('messages')}
              className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors relative ${
                activeTab === 'messages'
                  ? 'border-[#1264a3] text-[#1d1c1d]'
                  : 'border-transparent text-[#616061] hover:text-[#1d1c1d]'
              }`}
            >
              Messages
            </button>
            <button
              onClick={() => onTabChange?.('canvas')}
              className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors relative ${
                activeTab === 'canvas'
                  ? 'border-[#1264a3] text-[#1d1c1d]'
                  : 'border-transparent text-[#616061] hover:text-[#1d1c1d]'
              }`}
            >
              Add canvas
            </button>
            <button className="px-2 py-2 text-[#616061] hover:text-[#1d1c1d] transition-colors">
              <Plus className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </>
  )
}

