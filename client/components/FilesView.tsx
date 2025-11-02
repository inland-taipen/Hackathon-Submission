'use client'

import { useState, useEffect } from 'react'
import { FileText, Download, Image, File, Video, Music, Archive, Search } from 'lucide-react'
import axios from 'axios'

interface FileItem {
  id: string
  file_name: string
  file_url: string
  user_id: string
  username: string
  channel_id?: string
  channel_name?: string
  dm_conversation_id?: string
  created_at: string
  content?: string
}

interface FilesViewProps {
  workspaceId: string
  getAuthHeaders: () => Record<string, string>
}

export default function FilesView({ workspaceId, getAuthHeaders }: FilesViewProps) {
  const [files, setFiles] = useState<FileItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterType, setFilterType] = useState<'all' | 'images' | 'documents' | 'other'>('all')

  useEffect(() => {
    if (workspaceId) {
      fetchFiles()
    }
  }, [workspaceId])

  const fetchFiles = async () => {
    try {
      setIsLoading(true)
      
      // Fetch all channels in workspace
      const channelsResponse = await axios.get(
        `http://localhost:3001/api/workspaces/${workspaceId}/channels`,
        { headers: getAuthHeaders() }
      )
      const channels = channelsResponse.data

      // Fetch messages with files from each channel
      const allFiles: FileItem[] = []
      for (const channel of channels) {
        try {
          const messagesResponse = await axios.get(
            `http://localhost:3001/api/channels/${channel.id}/messages`,
            { headers: getAuthHeaders() }
          )
          const messagesWithFiles = messagesResponse.data
            .filter((msg: any) => msg.file_url && msg.file_name)
            .map((msg: any) => ({
              id: msg.id,
              file_name: msg.file_name,
              file_url: msg.file_url,
              user_id: msg.user_id,
              username: msg.username,
              channel_id: channel.id,
              channel_name: channel.name,
              created_at: msg.created_at,
              content: msg.content
            }))
          allFiles.push(...messagesWithFiles)
        } catch (err) {
          console.error(`Failed to fetch messages for channel ${channel.id}:`, err)
        }
      }

      // Fetch files from DMs
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
            const dmFiles = dmMessagesResponse.data
              .filter((msg: any) => msg.file_url && msg.file_name)
              .map((msg: any) => ({
                id: msg.id,
                file_name: msg.file_name,
                file_url: msg.file_url,
                user_id: msg.user_id,
                username: msg.username,
                dm_conversation_id: dm.id,
                created_at: msg.created_at,
                content: msg.content
              }))
            allFiles.push(...dmFiles)
          } catch (err) {
            console.error(`Failed to fetch DM messages:`, err)
          }
        }
      } catch (err) {
        console.error('Failed to fetch DMs:', err)
      }

      // Sort by date (newest first)
      allFiles.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      
      setFiles(allFiles)
    } catch (error) {
      console.error('Failed to fetch files:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const getFileIcon = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase()
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext || '')) {
      return <Image className="w-8 h-8 text-[#e01e5a]" />
    } else if (['mp4', 'mov', 'avi', 'webm'].includes(ext || '')) {
      return <Video className="w-8 h-8 text-[#e01e5a]" />
    } else if (['mp3', 'wav', 'ogg', 'm4a'].includes(ext || '')) {
      return <Music className="w-8 h-8 text-[#2eb67d]" />
    } else if (['zip', 'rar', 'tar', 'gz'].includes(ext || '')) {
      return <Archive className="w-8 h-8 text-[#ecb22e]" />
    } else if (['pdf', 'doc', 'docx', 'txt', 'md'].includes(ext || '')) {
      return <FileText className="w-8 h-8 text-[#1264a3]" />
    }
    return <File className="w-8 h-8 text-[#868686]" />
  }

  const formatFileSize = (url: string) => {
    // For data URLs, estimate size
    if (url.startsWith('data:')) {
      const sizeInBytes = url.length * 0.75 // Base64 encoding overhead
      const sizeInKB = sizeInBytes / 1024
      const sizeInMB = sizeInKB / 1024
      
      if (sizeInMB >= 1) {
        return `${sizeInMB.toFixed(2)} MB`
      } else {
        return `${sizeInKB.toFixed(2)} KB`
      }
    }
    return 'Unknown size'
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInMs = now.getTime() - date.getTime()
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24))
    
    if (diffInDays === 0) return 'Today'
    if (diffInDays === 1) return 'Yesterday'
    if (diffInDays < 7) return `${diffInDays} days ago`
    
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    return `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`
  }

  const filteredFiles = files.filter(file => {
    const matchesSearch = file.file_name.toLowerCase().includes(searchQuery.toLowerCase())
    
    if (filterType === 'all') return matchesSearch
    
    const ext = file.file_name.split('.').pop()?.toLowerCase()
    if (filterType === 'images') {
      return matchesSearch && ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext || '')
    } else if (filterType === 'documents') {
      return matchesSearch && ['pdf', 'doc', 'docx', 'txt', 'md'].includes(ext || '')
    } else {
      return matchesSearch && !['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'pdf', 'doc', 'docx', 'txt', 'md'].includes(ext || '')
    }
  })

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1264a3] mx-auto mb-4"></div>
          <p className="text-[#616061] dark:text-[#868686]">Loading files...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col bg-white dark:bg-[#1a1d21]">
      <div className="border-b border-[#DDD] dark:border-[#343a40] px-6 py-4">
        <h2 className="text-xl font-bold text-[#1d1c1d] dark:text-[#d1d2d3] mb-4">Files</h2>
        
        {/* Search and Filters */}
        <div className="flex items-center gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#616061] dark:text-[#868686]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search files..."
              className="w-full pl-10 pr-4 py-2 text-sm border border-[#868686] rounded focus:outline-none focus:ring-2 focus:ring-[#1264a3] bg-white dark:bg-[#2c2d30] text-[#1d1c1d] dark:text-[#d1d2d3]"
            />
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={() => setFilterType('all')}
              className={`px-3 py-2 text-sm font-semibold rounded transition-colors ${
                filterType === 'all'
                  ? 'bg-[#1264a3] text-white'
                  : 'bg-[#f8f8f8] dark:bg-[#2c2d30] text-[#1d1c1d] dark:text-[#d1d2d3] hover:bg-[#e8e8e8] dark:hover:bg-[#343a40]'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilterType('images')}
              className={`px-3 py-2 text-sm font-semibold rounded transition-colors ${
                filterType === 'images'
                  ? 'bg-[#1264a3] text-white'
                  : 'bg-[#f8f8f8] dark:bg-[#2c2d30] text-[#1d1c1d] dark:text-[#d1d2d3] hover:bg-[#e8e8e8] dark:hover:bg-[#343a40]'
              }`}
            >
              Images
            </button>
            <button
              onClick={() => setFilterType('documents')}
              className={`px-3 py-2 text-sm font-semibold rounded transition-colors ${
                filterType === 'documents'
                  ? 'bg-[#1264a3] text-white'
                  : 'bg-[#f8f8f8] dark:bg-[#2c2d30] text-[#1d1c1d] dark:text-[#d1d2d3] hover:bg-[#e8e8e8] dark:hover:bg-[#343a40]'
              }`}
            >
              Documents
            </button>
            <button
              onClick={() => setFilterType('other')}
              className={`px-3 py-2 text-sm font-semibold rounded transition-colors ${
                filterType === 'other'
                  ? 'bg-[#1264a3] text-white'
                  : 'bg-[#f8f8f8] dark:bg-[#2c2d30] text-[#1d1c1d] dark:text-[#d1d2d3] hover:bg-[#e8e8e8] dark:hover:bg-[#343a40]'
              }`}
            >
              Other
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {filteredFiles.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <FileText className="w-16 h-16 text-[#868686] mx-auto mb-4" />
              <p className="text-[#616061] dark:text-[#868686]">
                {searchQuery || filterType !== 'all' ? 'No files match your search' : 'No files yet'}
              </p>
              <p className="text-sm text-[#868686] mt-2">
                Files shared in channels and DMs will appear here
              </p>
            </div>
          </div>
        ) : (
          <div className="p-6">
            <div className="grid grid-cols-1 gap-4">
              {filteredFiles.map((file) => (
                <div
                  key={file.id}
                  className="flex items-start gap-4 p-4 bg-[#f8f8f8] dark:bg-[#2c2d30] rounded-lg hover:bg-[#e8e8e8] dark:hover:bg-[#343a40] transition-colors"
                >
                  <div className="flex-shrink-0">
                    {getFileIcon(file.file_name)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-semibold text-[#1d1c1d] dark:text-[#d1d2d3] truncate mb-1">
                          {file.file_name}
                        </h3>
                        <div className="flex items-center gap-2 text-xs text-[#616061] dark:text-[#868686]">
                          <span>{formatFileSize(file.file_url)}</span>
                          <span>•</span>
                          <span>Shared by {file.username}</span>
                          <span>•</span>
                          <span>{formatDate(file.created_at)}</span>
                        </div>
                        {file.channel_name && (
                          <div className="text-xs text-[#616061] dark:text-[#868686] mt-1">
                            in #{file.channel_name}
                          </div>
                        )}
                        {file.dm_conversation_id && (
                          <div className="text-xs text-[#616061] dark:text-[#868686] mt-1">
                            in a direct message
                          </div>
                        )}
                        {file.content && (
                          <p className="text-sm text-[#616061] dark:text-[#868686] mt-2 line-clamp-2">
                            {file.content}
                          </p>
                        )}
                      </div>
                      
                      <a
                        href={file.file_url}
                        download={file.file_name}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-shrink-0 p-2 text-[#1264a3] hover:bg-[#1264a3] hover:text-white rounded transition-colors"
                        title="Download"
                      >
                        <Download className="w-5 h-5" />
                      </a>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

