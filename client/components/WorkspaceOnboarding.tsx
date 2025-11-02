'use client'

import { useState } from 'react'
import { Check } from 'lucide-react'

interface WorkspaceOnboardingProps {
  onComplete: (workspaceName: string) => void
}

export default function WorkspaceOnboarding({ onComplete }: WorkspaceOnboardingProps) {
  const [step, setStep] = useState(1)
  const [workspaceName, setWorkspaceName] = useState('New Workspace')
  const [teamName, setTeamName] = useState('')
  const [userName, setUserName] = useState('')
  const [userEmail, setUserEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const totalSteps = 4

  const handleNext = async () => {
    console.log('handleNext called - step:', step, 'totalSteps:', totalSteps)
    
    if (step < totalSteps) {
      console.log('Moving to next step:', step + 1)
      setStep(step + 1)
    } else if (step === totalSteps) {
      // Step 4 - complete onboarding
      if (isLoading) {
        console.log('Already loading, ignoring click')
        return // Prevent multiple clicks
      }
      
      console.log('Completing onboarding with workspace name:', workspaceName)
      setIsLoading(true)
      
      try {
        console.log('Calling onComplete callback...')
        await onComplete(workspaceName)
        console.log('onComplete finished successfully')
      } catch (error) {
        console.error('Failed to complete onboarding:', error)
        setIsLoading(false)
        alert(`Failed to complete onboarding: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }
  }

  return (
    <div className="h-screen bg-[#1a1d21] flex items-center justify-center">
      <div className="w-full max-w-[600px] px-8">
        {/* Progress indicator */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div
              key={i}
              className={`h-1.5 w-12 rounded-full transition-colors ${
                i + 1 <= step ? 'bg-[#1264a3]' : 'bg-[#343a40]'
              }`}
            />
          ))}
        </div>

        {/* Step 1: What's your name? */}
        {step === 1 && (
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">What's your name?</h1>
            <p className="text-[#868686] mb-6">
              Adding your name and profile photo helps your teammates to recognise and connect with you more easily.
            </p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-[#d1d2d3] mb-2">Your display name</label>
                <input
                  type="text"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  className="w-full px-4 py-2 bg-[#2c2d30] text-white rounded border border-[#343a40] focus:outline-none focus:ring-2 focus:ring-[#1264a3]"
                  placeholder="Enter your name"
                  autoFocus
                />
                <p className="text-xs text-[#868686] mt-1">36 characters remaining</p>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-[#d1d2d3] mb-2">Your profile photo (optional)</h3>
                <p className="text-sm text-[#868686] mb-3">
                  Help your teammates to know that they're talking to the right person.
                </p>
                <div className="w-20 h-20 rounded-full bg-[#2eb67d] flex items-center justify-center text-white text-2xl font-semibold">
                  {userName?.[0]?.toUpperCase() || 'A'}
                </div>
                <button className="mt-3 text-sm text-[#1264a3] hover:underline">Edit photo</button>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Company/Team name */}
        {step === 2 && (
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">What's the name of your company or team?</h1>
            <p className="text-[#868686] mb-6">
              This will be the name of your Slack workspace - choose something that your team will recognise.
            </p>
            <div>
              <input
                type="text"
                value={workspaceName}
                onChange={(e) => setWorkspaceName(e.target.value)}
                className="w-full px-4 py-3 bg-[#2c2d30] text-white rounded border border-[#343a40] focus:outline-none focus:ring-2 focus:ring-[#1264a3] text-lg"
                autoFocus
              />
              <p className="text-xs text-[#868686] mt-1">37 characters remaining</p>
            </div>
          </div>
        )}

        {/* Step 3: Add colleagues */}
        {step === 3 && (
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Who else is on the {workspaceName} team?</h1>
            <p className="text-[#868686] mb-6">
              Add colleagues by email address or skip this step and invite them later.
            </p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-[#d1d2d3] mb-2">Add colleagues by email</label>
                <input
                  type="text"
                  className="w-full px-4 py-2 bg-[#2c2d30] text-white rounded border border-[#343a40] focus:outline-none focus:ring-2 focus:ring-[#1264a3]"
                  placeholder="Example: ellis@gmail.com, maria@gmail.com"
                />
              </div>
              <button className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-white text-[#1d1c1d] rounded hover:bg-gray-100 transition-colors">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                Add from Google Contacts
              </button>
              <p className="text-sm text-[#868686]">
                Keep in mind that invitations expire in 30 days. You can always extend that deadline.
              </p>
            </div>
            <div className="mt-6 flex gap-3">
              <button
                onClick={handleNext}
                className="px-6 py-2 bg-[#2eb67d] text-white rounded hover:bg-[#2a9e6f] transition-colors"
              >
                Next
              </button>
              <button className="px-6 py-2 bg-[#2c2d30] text-[#d1d2d3] rounded hover:bg-[#343a40] transition-colors">
                Copy invitation link
              </button>
              <button className="text-[#868686] hover:text-[#d1d2d3] transition-colors">
                Skip this step
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Welcome */}
        {step === 4 && (
          <div className="text-center">
            <h1 className="text-3xl font-bold text-white mb-2">Welcome to Slack! ✨</h1>
            <p className="text-[#868686] mb-8">
              It's the ultimate tool to up your team's collaboration and productivity. Here are a few tips to keep in your back pocket as you build your workspace.
            </p>
            <div className="grid grid-cols-2 gap-4 mb-8">
              <div className="bg-[#2c2d30] rounded p-4">
                <div className="w-16 h-16 bg-purple-500 rounded mb-3 mx-auto"></div>
                <p className="text-sm text-[#d1d2d3]">Tip 1</p>
              </div>
              <div className="bg-[#2c2d30] rounded p-4">
                <div className="w-16 h-16 bg-purple-500 rounded mb-3 mx-auto"></div>
                <p className="text-sm text-[#d1d2d3]">Tip 2</p>
              </div>
              <div className="bg-[#2c2d30] rounded p-4">
                <div className="w-16 h-16 bg-purple-500 rounded mb-3 mx-auto"></div>
                <p className="text-sm text-[#d1d2d3]">Tip 3</p>
              </div>
            </div>
            <div>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  console.log('Next button clicked on step 4')
                  console.log('Current step:', step, 'totalSteps:', totalSteps, 'isLoading:', isLoading)
                  console.log('Workspace name:', workspaceName)
                  if (!isLoading && step === totalSteps) {
                    console.log('Calling handleNext to complete onboarding')
                    handleNext()
                  } else {
                    console.log('Conditions not met, step:', step, 'totalSteps:', totalSteps)
                  }
                }}
                disabled={isLoading}
                className="px-8 py-3 bg-[#2eb67d] text-white rounded hover:bg-[#2a9e6f] transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
              >
                {isLoading ? 'Creating workspace...' : 'Next'}
              </button>
              {isLoading && (
                <p className="mt-4 text-sm text-[#868686]">Setting up your workspace...</p>
              )}
            </div>
          </div>
        )}

        {/* Navigation */}
        {step < totalSteps && step !== 3 && (
          <div className="mt-8">
            <button
              onClick={(e) => {
                e.preventDefault()
                handleNext()
              }}
              type="button"
              className="px-6 py-2 bg-[#1264a3] text-white rounded hover:bg-[#0d5085] transition-colors cursor-pointer"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

