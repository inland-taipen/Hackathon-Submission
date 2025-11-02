'use client'

import { useEffect, useState } from 'react'

export default function TestAuth() {
  const [data, setData] = useState<any>({})

  useEffect(() => {
    const sessionId = localStorage.getItem('sessionId')
    const user = localStorage.getItem('user')
    
    setData({
      sessionId: sessionId || 'NOT FOUND',
      user: user ? JSON.parse(user) : 'NOT FOUND',
      timestamp: new Date().toISOString()
    })
  }, [])

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Auth Debug Info</h1>
      <pre className="bg-gray-100 p-4 rounded">
        {JSON.stringify(data, null, 2)}
      </pre>
      <button
        onClick={() => {
          localStorage.clear()
          setData({})
        }}
        className="mt-4 px-4 py-2 bg-red-500 text-white rounded"
      >
        Clear localStorage
      </button>
    </div>
  )
}

