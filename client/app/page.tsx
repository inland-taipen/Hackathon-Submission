'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import axios from 'axios'

export default function Home() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      console.log('Attempting login...', { email })
      const response = await axios.post('http://localhost:3001/api/auth/login', {
        email,
        password
      })
      
      console.log('Login successful:', response.data)
      if (response.data.sessionId && response.data.user) {
        localStorage.setItem('sessionId', response.data.sessionId)
        localStorage.setItem('user', JSON.stringify(response.data.user))
        console.log('Stored in localStorage:', {
          sessionId: response.data.sessionId,
          user: response.data.user
        })
        setTimeout(() => {
          router.push('/chat')
        }, 100)
      } else {
        setError('Login succeeded but no session received')
        setIsLoading(false)
      }
    } catch (err: any) {
      console.error('Login error:', err)
      if (err.code === 'ECONNREFUSED' || err.message?.includes('Network Error')) {
        setError('Cannot connect to server. Please make sure the server is running on port 3001.')
      } else {
        setError(err.response?.data?.error || 'Invalid email or password')
      }
      setIsLoading(false)
    }
  }

  const handleGitHubLogin = async () => {
    try {
      const response = await axios.get('http://localhost:3001/api/auth/github')
      // Store state in sessionStorage to verify on callback
      if (response.data.state) {
        sessionStorage.setItem('oauth_state', response.data.state)
        sessionStorage.setItem('oauth_provider', 'github')
      }
      window.location.href = response.data.url
    } catch (err) {
      setError('Failed to initiate GitHub login')
    }
  }

  const handleGoogleLogin = async () => {
    try {
      const response = await axios.get('http://localhost:3001/api/auth/google')
      // Store state in sessionStorage to verify on callback
      if (response.data.state) {
        sessionStorage.setItem('oauth_state', response.data.state)
        sessionStorage.setItem('oauth_provider', 'google')
      }
      window.location.href = response.data.url
    } catch (err) {
      setError('Failed to initiate Google login')
    }
  }

  return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="w-full max-w-[400px] px-8">
        {/* Slack Logo */}
        <div className="flex justify-center mb-8">
          <div className="flex items-center gap-2">
            <div className="flex">
              <div className="w-3 h-3 rounded-full bg-[#E01E5A]"></div>
              <div className="w-3 h-3 rounded-full bg-[#36C5F0] -ml-1"></div>
            </div>
            <div className="flex -ml-1">
              <div className="w-3 h-3 rounded-full bg-[#2EB67D]"></div>
              <div className="w-3 h-3 rounded-full bg-[#ECB22E] -ml-1"></div>
            </div>
            <span className="text-2xl font-bold text-[#1d1c1d] ml-2">slack</span>
          </div>
        </div>

        {/* Main Heading */}
        <h1 className="text-3xl font-bold text-[#1d1c1d] mb-2 text-center">
          Enter your email address to sign in
        </h1>
        <p className="text-sm text-[#616061] mb-6 text-center">
          Or choose another way to sign in.
        </p>

        {/* Email Sign In Form */}
        <form onSubmit={handleEmailSignIn} className="space-y-4 mb-6">
          <div>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@work-email.com"
              className="w-full px-4 py-3 text-[15px] border border-[#868686] rounded-md focus:outline-none focus:ring-2 focus:ring-[#1264a3] focus:border-[#1264a3]"
              required
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-[#611f69] hover:bg-[#4a154b] text-white font-semibold py-3 px-4 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Signing in...' : 'Sign in with email'}
          </button>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm">
              {error}
            </div>
          )}
        </form>

        {/* Password field (shown after email if needed) */}
        {email && !password && (
          <div className="mb-6">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              className="w-full px-4 py-3 text-[15px] border border-[#868686] rounded-md focus:outline-none focus:ring-2 focus:ring-[#1264a3] focus:border-[#1264a3]"
              required
            />
          </div>
        )}

        {/* Separator */}
        <div className="relative mb-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-[#e8e8e8]"></div>
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="px-2 bg-white text-[#616061] font-semibold uppercase tracking-wide">
              OR SIGN IN WITH
            </span>
          </div>
        </div>

        {/* Social Sign In Buttons */}
        <div className="space-y-3">
          <button
            onClick={handleGoogleLogin}
            className="w-full flex items-center justify-center gap-3 px-4 py-3 border border-[#868686] rounded-md hover:bg-[#f8f8f8] transition-colors"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            <span className="font-semibold text-[#1d1c1d]">G Google</span>
          </button>

          <button
            onClick={handleGitHubLogin}
            className="w-full flex items-center justify-center gap-3 px-4 py-3 border border-[#868686] rounded-md hover:bg-[#f8f8f8] transition-colors"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 0C4.477 0 0 4.484 0 10.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0110 4.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.203 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.942.359.31.678.921.678 1.856 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482C17.146 18.197 20 14.442 20 10.017 20 4.484 15.522 0 10 0z" clipRule="evenodd" />
            </svg>
            <span className="font-semibold text-[#1d1c1d]">GitHub</span>
          </button>
        </div>

        {/* Workspace URL Link */}
        <div className="mt-6 text-center">
          <a href="#" className="text-sm text-[#1264a3] hover:underline">
            Having trouble? Try entering a workspace URL
          </a>
        </div>

        {/* Footer */}
        <div className="mt-12 pt-6 border-t border-[#e8e8e8] flex justify-center gap-6 text-xs text-[#616061]">
          <a href="#" className="hover:underline">Privacy & terms</a>
          <a href="#" className="hover:underline">Contact us</a>
          <div className="flex items-center gap-1">
            <span>Change region</span>
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>

        {/* New to Slack Link */}
        <div className="absolute top-4 right-4 text-sm">
          <span className="text-[#616061]">New to Slack? </span>
          <a href="/register" className="text-[#1264a3] hover:underline font-semibold">
            Create an account
          </a>
        </div>
      </div>
    </div>
  )
}
