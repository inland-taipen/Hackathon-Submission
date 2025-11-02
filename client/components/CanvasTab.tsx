'use client'

import { useState, useEffect } from 'react'
import { Plus } from 'lucide-react'
import axios from 'axios'

interface CanvasTabProps {
  channelName: string
  channelId: string
  getAuthHeaders: () => Record<string, string>
}

export default function CanvasTab({ channelName, channelId, getAuthHeaders }: CanvasTabProps) {
  const [hasCanvas, setHasCanvas] = useState(false)
  const [isCreating, setIsCreating] = useState(false)

  useEffect(() => {
    // Check if canvas exists
    axios.get(
      `http://localhost:3001/api/channels/${channelId}/canvas`,
      { headers: getAuthHeaders() }
    )
      .then(res => {
        if (res.data) {
          setHasCanvas(true)
        }
      })
      .catch(err => {
        console.error('Failed to fetch canvas:', err)
      })
  }, [channelId, getAuthHeaders])

  const handleCreateCanvas = async () => {
    setIsCreating(true)
    try {
      await axios.post(
        `http://localhost:3001/api/channels/${channelId}/canvas`,
        { title: 'Untitled Canvas', content: '' },
        { headers: getAuthHeaders() }
      )
      setHasCanvas(true)
    } catch (err) {
      console.error('Failed to create canvas:', err)
    } finally {
      setIsCreating(false)
    }
  }

  if (hasCanvas) {
    return (
      <div className="flex-1 flex items-center justify-center bg-white">
        <div className="text-center max-w-md">
          <p className="text-[#616061] text-[15px]">
            Canvas editor will be implemented here
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex items-center justify-center bg-white">
      <div className="text-center max-w-md px-6">
        <h2 className="text-xl font-bold text-[#1d1c1d] mb-2">
          Add canvas
        </h2>
        <p className="text-[#616061] text-[15px] mb-6 leading-relaxed">
          Canvas lets you work together on a flexible surface for notes, diagrams, and more.
        </p>
        <button
          onClick={handleCreateCanvas}
          disabled={isCreating}
          className="px-4 py-2 bg-[#611f69] hover:bg-[#4a154b] text-white rounded font-semibold transition-colors flex items-center gap-2 mx-auto disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Plus className="w-4 h-4" />
          <span>{isCreating ? 'Creating...' : 'Create canvas'}</span>
        </button>
      </div>
    </div>
  )
}

