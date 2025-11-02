'use client'

import { useState } from 'react'
import { X } from 'lucide-react'

interface AddWorkspaceModalProps {
  isOpen: boolean
  onClose: () => void
  onCreateWorkspace: (name: string, slug: string) => Promise<void>
}

export default function AddWorkspaceModal({ isOpen, onClose, onCreateWorkspace }: AddWorkspaceModalProps) {
  const [workspaceName, setWorkspaceName] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  if (!isOpen) return null

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!workspaceName.trim()) {
      setError('Workspace name is required')
      return
    }

    const slug = generateSlug(workspaceName)
    
    if (!slug) {
      setError('Please enter a valid workspace name')
      return
    }

    setIsLoading(true)
    try {
      await onCreateWorkspace(workspaceName.trim(), slug)
      setWorkspaceName('')
      onClose()
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create workspace')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-[#1a1d21] rounded-lg shadow-xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[#e8e8e8] dark:border-[#343a40]">
          <h2 className="text-xl font-bold text-[#1d1c1d] dark:text-[#d1d2d3]">
            Create a workspace
          </h2>
          <button
            onClick={onClose}
            className="text-[#616061] dark:text-[#868686] hover:text-[#1d1c1d] dark:hover:text-[#d1d2d3] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6">
          <div className="mb-6">
            <label className="block text-sm font-semibold text-[#1d1c1d] dark:text-[#d1d2d3] mb-2">
              Workspace name
            </label>
            <input
              type="text"
              value={workspaceName}
              onChange={(e) => setWorkspaceName(e.target.value)}
              placeholder="e.g. Acme Inc, Marketing Team"
              className="w-full px-4 py-3 text-[15px] border border-[#868686] rounded focus:outline-none focus:ring-2 focus:ring-[#1264a3] bg-white dark:bg-[#2c2d30] text-[#1d1c1d] dark:text-[#d1d2d3] placeholder-[#868686]"
              autoFocus
              disabled={isLoading}
            />
            {workspaceName && (
              <p className="mt-2 text-xs text-[#616061] dark:text-[#868686]">
                URL: <span className="font-mono">{generateSlug(workspaceName) || 'workspace'}</span>
              </p>
            )}
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded">
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          <div className="bg-[#f8f8f8] dark:bg-[#2c2d30] p-4 rounded-lg mb-6">
            <h3 className="text-sm font-semibold text-[#1d1c1d] dark:text-[#d1d2d3] mb-2">
              What makes a good workspace?
            </h3>
            <ul className="text-sm text-[#616061] dark:text-[#868686] space-y-1">
              <li>• Choose a name that represents your team or project</li>
              <li>• Keep it short and memorable</li>
              <li>• You can always change it later</li>
            </ul>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 text-sm font-semibold text-[#1d1c1d] dark:text-[#d1d2d3] bg-transparent border border-[#868686] rounded hover:bg-[#f8f8f8] dark:hover:bg-[#2c2d30] transition-colors"
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-3 text-sm font-semibold text-white bg-[#4a154b] rounded hover:bg-[#611f69] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isLoading || !workspaceName.trim()}
            >
              {isLoading ? 'Creating...' : 'Create Workspace'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

