'use client'

import { useState, useMemo } from 'react'
import { X, Search } from 'lucide-react'

interface UserSearchModalProps {
  isOpen: boolean
  onClose: () => void
  onSelectUser: (userId: string) => void
  availableUsers: any[]
  currentUserId: string
}

export default function UserSearchModal({
  isOpen,
  onClose,
  onSelectUser,
  availableUsers,
  currentUserId
}: UserSearchModalProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  // Filter out current user and apply search
  // IMPORTANT: Hooks must be called before any conditional returns
  const filteredUsers = useMemo(() => {
    return availableUsers
      .filter(user => user.id !== currentUserId)
      .filter(user =>
        user.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchQuery.toLowerCase())
      )
  }, [availableUsers, currentUserId, searchQuery])

  if (!isOpen) return null

  const handleSelectUser = async (userId: string) => {
    setIsLoading(true)
    try {
      await onSelectUser(userId)
      setSearchQuery('')
      onClose()
    } catch (err) {
      console.error('Failed to start DM:', err)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-[#1a1d21] rounded-lg shadow-xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between p-6 border-b border-[#e8e8e8] dark:border-[#343a40]">
          <h2 className="text-xl font-semibold text-[#1d1c1d] dark:text-[#d1d2d3]">
            Start a direct message
          </h2>
          <button
            onClick={onClose}
            className="text-[#616061] dark:text-[#868686] hover:text-[#1d1c1d] dark:hover:text-[#d1d2d3]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#616061] dark:text-[#868686]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name or email"
              className="w-full pl-10 pr-4 py-2 text-[15px] border border-[#868686] rounded focus:outline-none focus:ring-2 focus:ring-[#1264a3] bg-white dark:bg-[#2c2d30] text-[#1d1c1d] dark:text-[#d1d2d3]"
              autoFocus
            />
          </div>

          <div className="max-h-96 overflow-y-auto space-y-1">
            {filteredUsers.length === 0 ? (
              <div className="text-center py-8 text-[#616061] dark:text-[#868686]">
                {searchQuery ? 'No users found' : 'Start typing to search for users'}
              </div>
            ) : (
              filteredUsers.map(user => (
                <button
                  key={user.id}
                  onClick={() => handleSelectUser(user.id)}
                  disabled={isLoading}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded hover:bg-[#f8f8f8] dark:hover:bg-[#2c2d30] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div className="w-10 h-10 rounded-full bg-[#2eb67d] flex items-center justify-center text-white font-semibold flex-shrink-0">
                    {user.username?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || 'U'}
                  </div>
                  <div className="flex-1 text-left min-w-0">
                    <div className="text-sm font-semibold text-[#1d1c1d] dark:text-[#d1d2d3] truncate">
                      {user.username || 'User'}
                    </div>
                    {user.email && (
                      <div className="text-xs text-[#616061] dark:text-[#868686] truncate">
                        {user.email}
                      </div>
                    )}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

