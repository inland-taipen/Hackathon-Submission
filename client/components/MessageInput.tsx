'use client'

import { useState, useRef, KeyboardEvent, useEffect } from 'react'
import { Bold, Italic, Underline, Link, List, Code, Smile, AtSign, Paperclip, Send, Strikethrough, Quote, ListOrdered } from 'lucide-react'
import { UploadButton } from '@uploadthing/react'
import type { OurFileRouter } from '@/app/uploadthing/core'
import axios from 'axios'
import { config } from '@/lib/config'

interface MessageInputProps {
  placeholder: string
  onSubmit: (content: string, fileUrl?: string, fileName?: string) => void
  onTyping: () => void
  getAuthHeaders?: () => Record<string, string>
  selectedView?: 'channel' | 'dm'
  selectedId?: string
}

export default function MessageInput({ placeholder, onSubmit, onTyping, getAuthHeaders, selectedView, selectedId }: MessageInputProps) {
  const [message, setMessage] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [activeFormat, setActiveFormat] = useState<string | null>(null)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const emojiPickerRef = useRef<HTMLDivElement>(null)
  const uploadButtonRef = useRef<HTMLButtonElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Upload large files via HTTP
  const uploadFileViaHTTP = async (file: File) => {
    if (!getAuthHeaders || !selectedView || !selectedId) {
      alert('Cannot upload file: missing configuration')
      return
    }

    try {
      // Read file as array buffer
      const fileBuffer = await file.arrayBuffer()
      
      // Prepare metadata - encode filename to base64 to avoid non-ASCII issues
      const metadata = {
        channelId: selectedView === 'channel' ? selectedId : null,
        dmConversationId: selectedView === 'dm' ? selectedId : null,
        fileName: btoa(encodeURIComponent(file.name)), // Base64 encode filename
        contentType: file.type || 'application/octet-stream'
      }
      
      // Get auth headers
      const authHeaders = getAuthHeaders()
      
      // Build headers properly - encode metadata as base64
      const headers: Record<string, string> = {
        ...authHeaders,
        'x-file-metadata': btoa(JSON.stringify(metadata)), // Base64 encode metadata
        'Content-Type': file.type || 'application/octet-stream'
      }
      
      // Upload file using axios
      const response = await axios.post(
        `${config.apiUrl}/api/messages/upload-file`,
        fileBuffer,
        {
          headers: headers,
          maxContentLength: Infinity,
          maxBodyLength: Infinity,
          timeout: 60000 // 60 second timeout for large files
        }
      )
      
      // File is already sent via HTTP endpoint (it creates the message and emits via Socket.io)
      // Just clear the input
      setMessage('')
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    } catch (err: any) {
      console.error('❌ HTTP upload error:', err)
      alert(`Failed to upload file: ${err.response?.data?.error || err.message || 'Unknown error'}`)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleSubmit = (e: React.FormEvent, fileUrl?: string, fileName?: string) => {
    e.preventDefault()
    const content = message.trim()
    if (content || fileUrl) {
      onSubmit(content || (fileUrl ? '📎 Attachment' : ''), fileUrl, fileName)
      setMessage('')
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto'
      }
    }
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    } else {
      onTyping()
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value)
    onTyping()
    
    // Auto-resize textarea
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`
    }
  }

  const insertText = (before: string, after: string = '') => {
    if (!textareaRef.current) return
    
    const start = textareaRef.current.selectionStart
    const end = textareaRef.current.selectionEnd
    const selectedText = message.substring(start, end)
    const newText = message.substring(0, start) + before + selectedText + after + message.substring(end)
    
    setMessage(newText)
    
    // Restore cursor position
    setTimeout(() => {
      if (textareaRef.current) {
        const newCursorPos = start + before.length + selectedText.length + after.length
        textareaRef.current.focus()
        textareaRef.current.setSelectionRange(newCursorPos, newCursorPos)
      }
    }, 0)
  }

  const handleFormatClick = (format: string) => {
    switch (format) {
      case 'bold':
        insertText('**', '**')
        break
      case 'italic':
        insertText('_', '_')
        break
      case 'underline':
        insertText('__', '__')
        break
      case 'strikethrough':
        insertText('~~', '~~')
        break
      case 'code':
        insertText('`', '`')
        break
      case 'codeblock':
        insertText('```\n', '\n```')
        break
      case 'quote':
        insertText('> ', '')
        break
      case 'list':
        insertText('- ', '')
        break
      case 'listOrdered':
        insertText('1. ', '')
        break
      case 'link':
        insertText('[', '](url)')
        break
    }
  }

  // Close emoji picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target as Node)) {
        setShowEmojiPicker(false)
      }
    }

    if (showEmojiPicker) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showEmojiPicker])

  const emojis = [
    '😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '🙃',
    '😉', '😊', '😇', '🥰', '😍', '🤩', '😘', '😗', '😚', '😙',
    '😋', '😛', '😜', '🤪', '😝', '🤑', '🤗', '🤭', '🤫', '🤔',
    '🤐', '🤨', '😐', '😑', '😶', '😏', '😒', '🙄', '😬', '🤥',
    '😌', '😔', '😪', '🤤', '😴', '😷', '🤒', '🤕', '🤢', '🤮',
    '🤧', '🥵', '🥶', '😶‍🌫️', '😵', '😵‍💫', '🤯', '🤠', '🥳', '😎',
    '🤓', '🧐', '😕', '😟', '🙁', '☹️', '😮', '😯', '😲', '😳',
    '🥺', '😦', '😧', '😨', '😰', '😥', '😢', '😭', '😱', '😖',
    '👍', '👎', '👌', '✌️', '🤞', '🤟', '🤘', '🤙', '👏', '🙌',
    '👐', '🤲', '🤝', '🙏', '✍️', '💪', '🦾', '🦿', '🦵', '🦶'
  ]

  const handleEmojiClick = (emoji: string) => {
    insertText(emoji, '')
    setShowEmojiPicker(false)
  }

  return (
    <div className="bg-white dark:bg-[#1a1d21] border-t border-[#e8e8e8] dark:border-[#343a40]">
      {/* Formatting toolbar */}
      <div className="px-4 py-2 flex items-center gap-1 border-b border-[#e8e8e8] dark:border-[#343a40] overflow-x-auto">
        <button 
          type="button"
          onClick={() => handleFormatClick('bold')}
          className={`p-1.5 rounded transition-colors ${
            activeFormat === 'bold' 
              ? 'bg-[#f0f0f0] dark:bg-[#2c2d30] text-[#1d1c1d] dark:text-[#d1d2d3]' 
              : 'text-[#616061] dark:text-[#868686] hover:bg-[#f8f8f8] dark:hover:bg-[#2c2d30]'
          }`}
          title="Bold"
        >
          <Bold className="w-4 h-4" />
        </button>
        <button 
          type="button"
          onClick={() => handleFormatClick('italic')}
          className={`p-1.5 rounded transition-colors ${
            activeFormat === 'italic' 
              ? 'bg-[#f0f0f0] dark:bg-[#2c2d30] text-[#1d1c1d] dark:text-[#d1d2d3]' 
              : 'text-[#616061] dark:text-[#868686] hover:bg-[#f8f8f8] dark:hover:bg-[#2c2d30]'
          }`}
          title="Italic"
        >
          <Italic className="w-4 h-4" />
        </button>
        <button 
          type="button"
          onClick={() => handleFormatClick('underline')}
          className={`p-1.5 rounded transition-colors ${
            activeFormat === 'underline' 
              ? 'bg-[#f0f0f0] dark:bg-[#2c2d30] text-[#1d1c1d] dark:text-[#d1d2d3]' 
              : 'text-[#616061] dark:text-[#868686] hover:bg-[#f8f8f8] dark:hover:bg-[#2c2d30]'
          }`}
          title="Underline"
        >
          <Underline className="w-4 h-4" />
        </button>
        <button 
          type="button"
          onClick={() => handleFormatClick('strikethrough')}
          className={`p-1.5 rounded transition-colors ${
            activeFormat === 'strikethrough' 
              ? 'bg-[#f0f0f0] dark:bg-[#2c2d30] text-[#1d1c1d] dark:text-[#d1d2d3]' 
              : 'text-[#616061] dark:text-[#868686] hover:bg-[#f8f8f8] dark:hover:bg-[#2c2d30]'
          }`}
          title="Strikethrough"
        >
          <Strikethrough className="w-4 h-4" />
        </button>
        <div className="w-px h-4 bg-[#e8e8e8] dark:bg-[#343a40] mx-1"></div>
        <button 
          type="button"
          onClick={() => handleFormatClick('link')}
          className={`p-1.5 rounded transition-colors ${
            activeFormat === 'link' 
              ? 'bg-[#f0f0f0] dark:bg-[#2c2d30] text-[#1d1c1d] dark:text-[#d1d2d3]' 
              : 'text-[#616061] dark:text-[#868686] hover:bg-[#f8f8f8] dark:hover:bg-[#2c2d30]'
          }`}
          title="Link"
        >
          <Link className="w-4 h-4" />
        </button>
        <button 
          type="button"
          onClick={() => handleFormatClick('list')}
          className={`p-1.5 rounded transition-colors ${
            activeFormat === 'list' 
              ? 'bg-[#f0f0f0] dark:bg-[#2c2d30] text-[#1d1c1d] dark:text-[#d1d2d3]' 
              : 'text-[#616061] dark:text-[#868686] hover:bg-[#f8f8f8] dark:hover:bg-[#2c2d30]'
          }`}
          title="Bullet list"
        >
          <List className="w-4 h-4" />
        </button>
        <button 
          type="button"
          onClick={() => handleFormatClick('listOrdered')}
          className={`p-1.5 rounded transition-colors ${
            activeFormat === 'listOrdered' 
              ? 'bg-[#f0f0f0] dark:bg-[#2c2d30] text-[#1d1c1d] dark:text-[#d1d2d3]' 
              : 'text-[#616061] dark:text-[#868686] hover:bg-[#f8f8f8] dark:hover:bg-[#2c2d30]'
          }`}
          title="Numbered list"
        >
          <ListOrdered className="w-4 h-4" />
        </button>
        <button 
          type="button"
          onClick={() => handleFormatClick('quote')}
          className={`p-1.5 rounded transition-colors ${
            activeFormat === 'quote' 
              ? 'bg-[#f0f0f0] dark:bg-[#2c2d30] text-[#1d1c1d] dark:text-[#d1d2d3]' 
              : 'text-[#616061] dark:text-[#868686] hover:bg-[#f8f8f8] dark:hover:bg-[#2c2d30]'
          }`}
          title="Blockquote"
        >
          <Quote className="w-4 h-4" />
        </button>
        <button 
          type="button"
          onClick={() => handleFormatClick('codeblock')}
          className={`p-1.5 rounded transition-colors ${
            activeFormat === 'codeblock' 
              ? 'bg-[#f0f0f0] dark:bg-[#2c2d30] text-[#1d1c1d] dark:text-[#d1d2d3]' 
              : 'text-[#616061] dark:text-[#868686] hover:bg-[#f8f8f8] dark:hover:bg-[#2c2d30]'
          }`}
          title="Code block"
        >
          <Code className="w-4 h-4" />
        </button>
      </div>

      {/* Input area */}
      <form onSubmit={(e) => handleSubmit(e)} className="px-4 py-3 flex items-end gap-2">
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            rows={1}
            className="w-full px-3 py-2 text-[15px] bg-[#f8f8f8] dark:bg-[#2c2d30] text-[#1d1c1d] dark:text-[#d1d2d3] rounded border border-[#e8e8e8] dark:border-[#343a40] focus:outline-none focus:ring-1 focus:ring-[#1264a3] resize-none overflow-hidden max-h-[200px]"
            style={{ minHeight: '36px' }}
          />
        </div>
        
        <div className="flex items-center gap-1">
          <div className="relative" ref={emojiPickerRef}>
            <button
              type="button"
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className={`p-2 rounded transition-colors ${
                showEmojiPicker 
                  ? 'bg-[#f0f0f0] dark:bg-[#2c2d30] text-[#1264a3] dark:text-[#1264a3]' 
                  : 'text-[#616061] dark:text-[#868686] hover:bg-[#f8f8f8] dark:hover:bg-[#2c2d30]'
              }`}
              title="Add emoji"
            >
              <Smile className="w-5 h-5" />
            </button>
            
            {showEmojiPicker && (
              <div className="absolute bottom-full right-0 mb-2 bg-white dark:bg-[#1a1d21] border border-[#e8e8e8] dark:border-[#343a40] rounded-lg shadow-xl p-3 w-[280px] h-[300px] overflow-y-auto z-50">
                <div className="grid grid-cols-8 gap-2">
                  {emojis.map((emoji, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleEmojiClick(emoji)}
                      className="w-8 h-8 flex items-center justify-center text-xl hover:bg-[#f8f8f8] dark:hover:bg-[#2c2d30] rounded transition-colors"
                      title={emoji}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
          <button
            type="button"
            className="p-2 text-[#616061] dark:text-[#868686] hover:bg-[#f8f8f8] dark:hover:bg-[#2c2d30] rounded transition-colors"
            title="Mention"
          >
            <AtSign className="w-5 h-5" />
          </button>
          <div className="relative">
            {/* Hidden file input as fallback */}
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept="image/*,application/pdf,video/*"
              multiple={false}
              onChange={async (e) => {
                const file = e.target.files?.[0]
                if (!file) {
                  console.log('📎 No file selected')
                  return
                }

                console.log('📎 File selected:', file.name, file.type, file.size)
                
                // Limit file size to 10MB (files over 500KB will use HTTP upload)
                const maxFileSize = 10 * 1024 * 1024 // 10MB
                if (file.size > maxFileSize) {
                  alert(`File is too large (${(file.size / 1024 / 1024).toFixed(2)}MB). Maximum size is 10MB.`)
                  if (fileInputRef.current) {
                    fileInputRef.current.value = ''
                  }
                  return
                }
                
                // Warn about files over 2MB
                if (file.size > 2 * 1024 * 1024) {
                  const proceed = confirm(`File is ${(file.size / 1024 / 1024).toFixed(2)}MB. This is a large file and may take a moment to upload. Continue?`)
                  if (!proceed) {
                    if (fileInputRef.current) {
                      fileInputRef.current.value = ''
                    }
                    return
                  }
                }
                
                // Check file size and choose upload method
                try {
                  // For files that will be > 500KB as data URL, use HTTP upload directly
                  // Base64 encoding increases size by ~33%, so if file is > 375KB, use HTTP
                  const maxSocketFileSize = 375 * 1024 // 375KB file = ~500KB data URL
                  
                  if (file.size > maxSocketFileSize) {
                    // Use HTTP upload for large files
                    console.log('📎 File is large, using HTTP upload:', file.name, `(${(file.size / 1024).toFixed(2)}KB)`)
                    uploadFileViaHTTP(file)
                  } else {
                    // Use Socket.io for small files (convert to data URL)
                    console.log('📎 File is small, using Socket.io:', file.name, `(${(file.size / 1024).toFixed(2)}KB)`)
                    const reader = new FileReader()
                    reader.onload = (event) => {
                      const dataUrl = event.target?.result as string
                      if (!dataUrl) {
                        console.error('Failed to read file')
                        alert('Failed to read file')
                        return
                      }
                      
                      // Double-check size after conversion
                      const maxSocketSize = 500 * 1024 // 500KB
                      if (dataUrl.length > maxSocketSize) {
                        // Fallback to HTTP if data URL is too large
                        console.log('📎 Data URL too large, switching to HTTP upload')
                        uploadFileViaHTTP(file)
                      } else {
                        const messageContent = message.trim() || ''
                        onSubmit(messageContent, dataUrl, file.name)
                        setMessage('')
                      }
                    }
                    reader.onerror = () => {
                      console.error('FileReader error')
                      alert('Failed to read file')
                    }
                    reader.readAsDataURL(file)
                  }
                } catch (err) {
                  console.error('File upload error:', err)
                  alert(`Failed to upload file: ${err}`)
                }
                
                // Reset input after a short delay to allow for re-selection
                setTimeout(() => {
                  if (fileInputRef.current) {
                    fileInputRef.current.value = ''
                  }
                }, 100)
              }}
            />
            
            {/* UploadThing button (hidden - wrapped in div to prevent button nesting) */}
            <div className="hidden" style={{ position: 'absolute', visibility: 'hidden' }}>
              <UploadButton<OurFileRouter, "fileUploader">
                endpoint="fileUploader"
                onClientUploadComplete={(res: any) => {
                  console.log('📎 UploadThing upload complete:', res)
                  if (res && res[0]) {
                    console.log('📎 File uploaded:', res[0].url, res[0].name)
                    const fileContent = message.trim() || `📎 ${res[0].name}`
                    onSubmit(fileContent, res[0].url, res[0].name)
                    setMessage('')
                    if (textareaRef.current) {
                      textareaRef.current.style.height = 'auto'
                    }
                  }
                }}
                onUploadError={(error: Error) => {
                  console.error('❌ UploadThing error:', error)
                  // Fallback to native file input
                  console.log('Falling back to native file input...')
                  fileInputRef.current?.click()
                }}
                onUploadBegin={(name: string) => {
                  console.log('📎 Upload starting:', name)
                }}
              />
            </div>
            
            <button
              type="button"
              className="p-2 text-[#616061] dark:text-[#868686] hover:bg-[#f8f8f8] dark:hover:bg-[#2c2d30] rounded transition-colors"
              title="Upload file"
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                console.log('📎 Upload button clicked')
                console.log('📎 File input ref:', fileInputRef.current)
                
                // Always try native file input first (most reliable)
                if (fileInputRef.current) {
                  console.log('✅ Triggering native file input')
                  try {
                    // Use setTimeout to ensure the click happens after event propagation
                    setTimeout(() => {
                      if (fileInputRef.current) {
                        fileInputRef.current.click()
                        console.log('📎 File input click triggered')
                      } else {
                        console.error('❌ File input ref is null after timeout')
                      }
                    }, 0)
                  } catch (err) {
                    console.error('❌ Error triggering file input:', err)
                  }
                  return
                }
                
                console.warn('⚠️ File input ref is null, trying to find UploadThing button')
                
                // Fallback: Try to find UploadThing button with multiple selectors
                const selectors = [
                  '[data-ut-element="button"]',
                  'button[data-state]',
                  '.ut-button',
                  '[data-ut-trigger]',
                  'button[aria-label*="upload"]',
                  'button[aria-label*="file"]'
                ]
                
                for (const selector of selectors) {
                  const button = document.querySelector(selector) as HTMLElement
                  if (button) {
                    console.log('✅ Found UploadThing button with selector:', selector)
                    button.click()
                    return
                  }
                }
                
                console.error('❌ No file input found')
                alert('File upload not available. Please refresh the page.')
              }}
            >
              <Paperclip className="w-5 h-5" />
            </button>
          </div>
          <button
            type="submit"
            disabled={!message.trim()}
            className="p-2 text-[#616061] dark:text-[#868686] hover:text-[#1264a3] hover:bg-[#f8f8f8] dark:hover:bg-[#2c2d30] rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="Send message"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </form>
    </div>
  )
}

