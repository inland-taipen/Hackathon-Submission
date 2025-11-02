'use client'

import { useState } from 'react'
import { X } from 'lucide-react'

interface CreateChannelModalProps {
  isOpen: boolean
  onClose: () => void
  onCreateChannel: (name: string, description: string, isPrivate: boolean, memberIds?: string[]) => void
  availableUsers: any[]
}

export default function CreateChannelModal({
  isOpen,
  onClose,
  onCreateChannel,
  availableUsers
}: CreateChannelModalProps) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [isPrivate, setIsPrivate] = useState(false)
  const [selectedMembers, setSelectedMembers] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validate channel name
    const trimmedName = name.trim()
    if (!trimmedName) {
      alert('Channel name is required')
      return
    }
    
    // Validate format: lowercase, no spaces, no periods
    const validName = trimmedName.toLowerCase().replace(/[^a-z0-9-_]/g, '')
    if (validName !== trimmedName.toLowerCase() || validName.length === 0) {
      alert('Channel name must contain only lowercase letters, numbers, hyphens, and underscores. No spaces or periods allowed.')
      setName(validName)
      return
    }
    
    setIsLoading(true)
    try {
      await onCreateChannel(validName, description.trim(), isPrivate, selectedMembers)
      setName('')
      setDescription('')
      setIsPrivate(false)
      setSelectedMembers([])
      onClose()
    } catch (err: any) {
      console.error('Failed to create channel:', err)
      alert(err.response?.data?.error || 'Failed to create channel. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const toggleMember = (userId: string) => {
    setSelectedMembers(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    )
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-[#1a1d21] rounded-lg shadow-xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between p-6 border-b border-[#e8e8e8] dark:border-[#343a40]">
          <h2 className="text-xl font-semibold text-[#1d1c1d] dark:text-[#d1d2d3]">
            Create a channel
          </h2>
          <button
            onClick={onClose}
            className="text-[#616061] dark:text-[#868686] hover:text-[#1d1c1d] dark:hover:text-[#d1d2d3]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-semibold text-[#1d1c1d] dark:text-[#d1d2d3] mb-2">
              Name <span className="text-red-500">*</span>
            </label>
            <div className="flex items-center gap-2">
              <span className="text-[#616061] dark:text-[#868686]">#</span>
              <input
                type="text"
                value={name}
                onChange={(e) => {
                  // Auto-convert to lowercase and remove invalid characters
                  const cleaned = e.target.value.toLowerCase().replace(/[^a-z0-9-_]/g, '')
                  setName(cleaned)
                }}
                placeholder="e.g. marketing"
                className="flex-1 px-3 py-2 text-[15px] border border-[#868686] rounded focus:outline-none focus:ring-2 focus:ring-[#1264a3] bg-white dark:bg-[#2c2d30] text-[#1d1c1d] dark:text-[#d1d2d3]"
                required
                maxLength={80}
                autoFocus
              />
            </div>
            <p className="text-xs text-[#616061] dark:text-[#868686] mt-1">
              Names can't have spaces or periods, and must be lowercase.
            </p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-[#1d1c1d] dark:text-[#d1d2d3] mb-2">
              Description <span className="text-xs font-normal text-[#616061] dark:text-[#868686]">(optional)</span>
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What's this channel about?"
              className="w-full px-3 py-2 text-[15px] border border-[#868686] rounded focus:outline-none focus:ring-2 focus:ring-[#1264a3] bg-white dark:bg-[#2c2d30] text-[#1d1c1d] dark:text-[#d1d2d3]"
              maxLength={250}
            />
          </div>

          <div className="flex items-start gap-3">
            <input
              type="checkbox"
              id="private"
              checked={isPrivate}
              onChange={(e) => setIsPrivate(e.target.checked)}
              className="mt-1"
            />
            <div className="flex-1">
              <label htmlFor="private" className="block text-sm font-semibold text-[#1d1c1d] dark:text-[#d1d2d3] cursor-pointer">
                Make private
              </label>
              <p className="text-xs text-[#616061] dark:text-[#868686] mt-1">
                When a channel is set to private, it can only be viewed or joined by invitation.
              </p>
            </div>
          </div>

          {isPrivate && availableUsers.length > 0 && (
            <div>
              <label className="block text-sm font-semibold text-[#1d1c1d] dark:text-[#d1d2d3] mb-2">
                Add people
              </label>
              <div className="max-h-48 overflow-y-auto border border-[#868686] rounded p-2 space-y-1">
                {availableUsers.map(user => (
                  <button
                    key={user.id}
                    type="button"
                    onClick={() => toggleMember(user.id)}
                    className={`w-full flex items-center gap-2 px-2 py-1 rounded text-sm text-left ${
                      selectedMembers.includes(user.id)
                        ? 'bg-[#1264a3] text-white'
                        : 'hover:bg-[#f8f8f8] dark:hover:bg-[#2c2d30] text-[#1d1c1d] dark:text-[#d1d2d3]'
                    }`}
                  >
                    <div className="w-6 h-6 rounded-full bg-[#2eb67d] flex items-center justify-center text-white text-xs font-semibold">
                      {user.username?.[0]?.toUpperCase() || 'U'}
                    </div>
                    <span>{user.username}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-[#868686] rounded text-[15px] font-semibold text-[#1d1c1d] dark:text-[#d1d2d3] hover:bg-[#f8f8f8] dark:hover:bg-[#2c2d30]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name.trim() || isLoading}
              className="flex-1 px-4 py-2 bg-[#611f69] hover:bg-[#4a154b] text-white rounded text-[15px] font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Creating...' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

