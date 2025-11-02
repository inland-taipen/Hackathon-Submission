'use client'

import { useState, useEffect } from 'react'
import { X, Search, Mail, UserPlus } from 'lucide-react'
import axios from 'axios'
import { config } from '@/lib/config'
interface User {
  id: string
  username: string
  email: string
  avatar?: string
}

interface InviteTeammatesModalProps {
  isOpen: boolean
  onClose: () => void
  workspaceId: string
  getAuthHeaders: () => Record<string, string>
  onInviteSuccess?: () => void
}

export default function InviteTeammatesModal({
  isOpen,
  onClose,
  workspaceId,
  getAuthHeaders,
  onInviteSuccess
}: InviteTeammatesModalProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [availableUsers, setAvailableUsers] = useState<User[]>([])
  const [workspaceMembers, setWorkspaceMembers] = useState<string[]>([])
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isInviting, setIsInviting] = useState(false)
  const [inviteByEmail, setInviteByEmail] = useState('')
  const [inviteMode, setInviteMode] = useState<'search' | 'email'>('search')

  useEffect(() => {
    if (isOpen && workspaceId) {
      fetchAvailableUsers()
      fetchWorkspaceMembers()
    }
  }, [isOpen, workspaceId])

  const fetchAvailableUsers = async () => {
    try {
      setIsLoading(true)
      const response = await axios.get(`http://localhost:3001/api/users?workspaceId=${workspaceId}`, {
        headers: getAuthHeaders()
      })
      setAvailableUsers(response.data || [])
    } catch (error) {
      console.error('Failed to fetch users:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchWorkspaceMembers = async () => {
    try {
      const response = await axios.get(`http://localhost:3001/api/workspaces/${workspaceId}/members`, {
        headers: getAuthHeaders()
      })
      const memberIds = response.data.map((m: any) => m.user_id)
      setWorkspaceMembers(memberIds)
    } catch (error) {
      console.error('Failed to fetch workspace members:', error)
    }
  }

  const handleUserToggle = (userId: string) => {
    setSelectedUserIds(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    )
  }

  const handleInviteUsers = async () => {
    if (selectedUserIds.length === 0) return

    try {
      setIsInviting(true)
      await axios.post(
        `http://localhost:3001/api/workspaces/${workspaceId}/members`,
        { userIds: selectedUserIds },
        { headers: getAuthHeaders() }
      )
      
      setSelectedUserIds([])
      onInviteSuccess?.()
      onClose()
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to invite users')
    } finally {
      setIsInviting(false)
    }
  }

  const handleInviteByEmail = async () => {
    if (!inviteByEmail.trim()) return

    try {
      setIsInviting(true)
      await axios.post(
        `http://localhost:3001/api/workspaces/${workspaceId}/invite-email`,
        { email: inviteByEmail.trim() },
        { headers: getAuthHeaders() }
      )
      
      setInviteByEmail('')
      alert('Invitation sent successfully!')
      onInviteSuccess?.()
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to send invitation')
    } finally {
      setIsInviting(false)
    }
  }

  const filteredUsers = availableUsers.filter(user => 
    !workspaceMembers.includes(user.id) &&
    (user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
     user.email.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[#DDD]">
          <h2 className="text-xl font-bold text-[#1d1c1d]">Invite people to this workspace</h2>
          <button
            onClick={onClose}
            className="text-[#616061] hover:text-[#1d1c1d] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-[#DDD] px-6">
          <button
            onClick={() => setInviteMode('search')}
            className={`px-4 py-3 text-sm font-semibold border-b-2 transition-colors ${
              inviteMode === 'search'
                ? 'border-[#1264a3] text-[#1264a3]'
                : 'border-transparent text-[#616061] hover:text-[#1d1c1d]'
            }`}
          >
            Add from workspace
          </button>
          <button
            onClick={() => setInviteMode('email')}
            className={`px-4 py-3 text-sm font-semibold border-b-2 transition-colors ${
              inviteMode === 'email'
                ? 'border-[#1264a3] text-[#1264a3]'
                : 'border-transparent text-[#616061] hover:text-[#1d1c1d]'
            }`}
          >
            Invite by email
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {inviteMode === 'search' ? (
            <>
              {/* Search */}
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#616061]" />
                <input
                  type="text"
                  placeholder="Search for people..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-[#DDD] rounded focus:outline-none focus:ring-2 focus:ring-[#1264a3]"
                />
              </div>

              {/* User List */}
              {isLoading ? (
                <div className="text-center text-[#616061] py-8">Loading...</div>
              ) : filteredUsers.length === 0 ? (
                <div className="text-center text-[#616061] py-8">
                  {searchQuery ? 'No users found' : 'All users are already in this workspace'}
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredUsers.map(user => (
                    <button
                      key={user.id}
                      onClick={() => handleUserToggle(user.id)}
                      className={`w-full flex items-center gap-3 p-3 rounded hover:bg-[#f8f8f8] transition-colors ${
                        selectedUserIds.includes(user.id) ? 'bg-[#e8f5e9]' : ''
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0 ${
                        selectedUserIds.includes(user.id) ? 'bg-[#2eb67d]' : 'bg-[#616061]'
                      }`}>
                        {user.username[0]?.toUpperCase() || 'U'}
                      </div>
                      <div className="flex-1 text-left">
                        <div className="font-semibold text-[#1d1c1d]">{user.username}</div>
                        <div className="text-sm text-[#616061]">{user.email}</div>
                      </div>
                      {selectedUserIds.includes(user.id) && (
                        <div className="w-5 h-5 rounded-full bg-[#2eb67d] flex items-center justify-center">
                          <span className="text-white text-xs">✓</span>
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </>
          ) : (
            <>
              <div className="mb-4">
                <label className="block text-sm font-semibold text-[#1d1c1d] mb-2">
                  Email address
                </label>
                <input
                  type="email"
                  placeholder="name@example.com"
                  value={inviteByEmail}
                  onChange={(e) => setInviteByEmail(e.target.value)}
                  className="w-full px-4 py-2 border border-[#DDD] rounded focus:outline-none focus:ring-2 focus:ring-[#1264a3]"
                />
                <p className="text-xs text-[#616061] mt-2">
                  We'll send them an email invitation to join this workspace.
                </p>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-[#DDD]">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-semibold text-[#616061] hover:text-[#1d1c1d] transition-colors"
          >
            Cancel
          </button>
          {inviteMode === 'search' ? (
            <button
              onClick={handleInviteUsers}
              disabled={selectedUserIds.length === 0 || isInviting}
              className="px-4 py-2 text-sm font-semibold bg-[#1264a3] text-white rounded hover:bg-[#0e4d7a] disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              <UserPlus className="w-4 h-4" />
              {isInviting ? 'Adding...' : `Add ${selectedUserIds.length} ${selectedUserIds.length === 1 ? 'person' : 'people'}`}
            </button>
          ) : (
            <button
              onClick={handleInviteByEmail}
              disabled={!inviteByEmail.trim() || isInviting}
              className="px-4 py-2 text-sm font-semibold bg-[#1264a3] text-white rounded hover:bg-[#0e4d7a] disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              <Mail className="w-4 h-4" />
              {isInviting ? 'Sending...' : 'Send invitation'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

