'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import axios from 'axios'

export default function AuthCallback() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const handleCallback = async () => {
      const code = searchParams.get('code')
      const state = searchParams.get('state')
      const provider = searchParams.get('provider') || sessionStorage.getItem('oauth_provider') || 'github'

      if (!code) {
        setError('No authorization code received')
        setLoading(false)
        return
      }

      // Verify state if available
      const storedState = sessionStorage.getItem('oauth_state')
      if (state && storedState && state !== storedState) {
        setError('Invalid state parameter')
        setLoading(false)
        return
      }

      try {
        let response
        if (provider === 'google') {
          response = await axios.post('http://localhost:3001/api/auth/google/callback', { code, state })
        } else {
          // Default to GitHub
          response = await axios.post('http://localhost:3001/api/auth/github/callback', { code, state })
        }

        // Clear OAuth state
        sessionStorage.removeItem('oauth_state')
        sessionStorage.removeItem('oauth_provider')

        if (response.data.sessionId && response.data.user) {
          localStorage.setItem('sessionId', response.data.sessionId)
          localStorage.setItem('user', JSON.stringify(response.data.user))
          setTimeout(() => {
            router.push('/chat')
          }, 100)
        } else {
          setError('Authentication succeeded but no session received')
          setLoading(false)
        }
      } catch (err: any) {
        console.error('Auth callback error:', err)
        setError(err.response?.data?.error || 'Authentication failed')
        setLoading(false)
        // Clear OAuth state on error
        sessionStorage.removeItem('oauth_state')
        sessionStorage.removeItem('oauth_provider')
      }
    }

    handleCallback()
  }, [router, searchParams])

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#611f69] mx-auto mb-4"></div>
          <p className="text-[#616061]">Completing authentication...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={() => router.push('/')}
            className="px-4 py-2 bg-[#611f69] text-white rounded-md hover:bg-[#4a154b]"
          >
            Back to Login
          </button>
        </div>
      </div>
    )
  }

  return null
}

