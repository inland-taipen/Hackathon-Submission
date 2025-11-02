'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function LogoutPage() {
  const router = useRouter()

  useEffect(() => {
    // Clear all session data
    localStorage.removeItem('sessionId')
    localStorage.removeItem('user')
    
    // Redirect to home page
    router.push('/')
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f8f8f8] dark:bg-[#1a1d21]">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#611f69] mx-auto mb-4"></div>
        <p className="text-[#616061] dark:text-[#868686]">Logging out...</p>
      </div>
    </div>
  )
}

