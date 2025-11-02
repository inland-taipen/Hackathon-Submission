'use client'

import { useState } from 'react'
import axios from 'axios'
import { Users, Briefcase, Globe, Phone } from 'lucide-react'
import { config } from '@/lib/config'
interface ChannelWelcomeScreenProps {
  channelName: string
  channelId: string
  onCreateFromTemplate?: (templateId: string) => void
  getAuthHeaders: () => Record<string, string>
}

export default function ChannelWelcomeScreen({ 
  channelName, 
  channelId,
  onCreateFromTemplate,
  getAuthHeaders 
}: ChannelWelcomeScreenProps) {
  const templates = [
    {
      id: 'project',
      title: 'Run a project',
      description: 'Project starter kit template',
      gradient: 'from-[#0CA678] to-[#087F5B]',
      preview: {
        title: 'Project plan',
        items: ['Team', 'Documents', 'Milestones']
      }
    },
    {
      id: 'team',
      title: 'Chat with your team',
      description: 'Team support template',
      gradient: 'from-[#0CA678] to-[#087F5B]',
      preview: {
        title: 'Weekly sync',
        hasHuddle: true,
        date: '28 February',
        agenda: 'Agenda',
        people: 3,
        items: ['3 people have added topics']
      }
    },
    {
      id: 'partners',
      title: 'Collaborate with external partners',
      description: 'External partner template',
      gradient: 'from-[#A16207] to-[#845F00]',
      preview: {
        title: 'External partners',
        hasAvatars: true
      }
    },
    {
      id: 'invite',
      title: 'Invite teammates',
      description: 'Add your whole team',
      gradient: 'from-[#8B5CF6] to-[#6D28D9]',
      preview: {
        title: 'Team members',
        hasAvatars: true,
        avatarCount: 3
      }
    }
  ]

  const handleTemplateClick = async (templateId: string) => {
    console.log('Template clicked:', templateId, 'channelId:', channelId)
    
    if (!channelId) {
      alert('No channel selected')
      return
    }

    try {
      console.log('Calling template API...')
      const response = await axios.post(
        `http://localhost:3001/api/channels/${channelId}/templates`,
        { templateId },
        { headers: getAuthHeaders() }
      )
      console.log('Template initialized successfully:', response.data)
      
      // Call the callback which will refresh messages
      if (onCreateFromTemplate) {
        console.log('Calling onCreateFromTemplate callback...')
        await onCreateFromTemplate(templateId)
      }
    } catch (err: any) {
      console.error('Failed to initialize template:', err)
      console.error('Error details:', err.response?.data, err.message)
      alert(err.response?.data?.error || err.message || 'Failed to initialize template. Please try again.')
    }
  }

  return (
    <div className="flex-1 overflow-y-auto bg-white">
      <div className="max-w-5xl mx-auto py-6 px-6">
        {/* Header */}
        <div className="mb-6">
          <h2 className="text-xl font-bold text-[#1d1c1d] mb-1">
            Channels keep work focused around a specific topic.
          </h2>
          <p className="text-[15px] text-[#616061]">
            Pick a template to get started, or see all.
          </p>
        </div>

        {/* Template Cards - 4 cards in a row */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          {templates.map((template) => (
            <button
              key={template.id}
              type="button"
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                console.log('Button clicked for template:', template.id)
                handleTemplateClick(template.id)
              }}
              className={`group relative bg-gradient-to-br ${template.gradient} rounded-lg p-4 text-left hover:shadow-xl transition-all hover:scale-[1.02] min-h-[200px] flex flex-col justify-between cursor-pointer`}
            >
              <div className="text-white">
                <h3 className="font-bold text-base mb-1 leading-tight">{template.title}</h3>
                <p className="text-xs opacity-90 mb-3">{template.description}</p>
              </div>
              
              {/* Preview Card */}
              <div className="mt-auto bg-white/15 backdrop-blur-sm rounded-md p-3 border border-white/20">
                <div className="text-white text-xs font-semibold mb-2 leading-tight">
                  {template.preview.title}
                </div>
                {template.preview.hasHuddle && (
                  <div className="mb-2 flex items-center gap-1.5 text-white/90">
                    <Phone className="w-3 h-3" />
                    <span className="text-xs">Join huddle</span>
                  </div>
                )}
                {template.preview.date && (
                  <div className="text-white/80 text-xs mb-1">{template.preview.date}</div>
                )}
                {template.preview.agenda && (
                  <div className="text-white/80 text-xs font-medium mb-2">{template.preview.agenda}</div>
                )}
                {template.preview.hasAvatars && (
                  <div className="flex items-center gap-1">
                    {Array.from({ length: template.preview.avatarCount || 3 }).map((_, i) => (
                      <div
                        key={i}
                        className="w-5 h-5 rounded-full bg-white/30 border border-white/40 flex items-center justify-center text-white text-xs font-semibold"
                      >
                        {(i + 1).toString()}
                      </div>
                    ))}
                  </div>
                )}
                {template.preview.items && template.preview.items.length > 0 && (
                  <div className="space-y-0.5 mt-2">
                    {template.preview.items.map((item, idx) => (
                      <div key={idx} className="text-white/70 text-[10px] leading-tight">{item}</div>
                    ))}
                  </div>
                )}
              </div>
            </button>
          ))}
        </div>

        {/* Divider */}
        <div className="flex items-center gap-3 my-4">
          <div className="flex-1 h-px bg-[#DDD]"></div>
          <button className="text-xs font-semibold text-[#616061] uppercase tracking-wide hover:text-[#1d1c1d] transition-colors">
            Today
          </button>
          <div className="flex-1 h-px bg-[#DDD]"></div>
        </div>
      </div>
    </div>
  )
}

