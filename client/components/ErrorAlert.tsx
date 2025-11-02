'use client'

import { AlertTriangle, X, RefreshCw } from 'lucide-react'
import { useState } from 'react'

interface ErrorAlertProps {
  title?: string
  message: string
  onRetry?: () => void
  onDismiss?: () => void
  type?: 'error' | 'warning' | 'info'
}

export default function ErrorAlert({ 
  title, 
  message, 
  onRetry, 
  onDismiss,
  type = 'error'
}: ErrorAlertProps) {
  const [visible, setVisible] = useState(true)

  const handleDismiss = () => {
    setVisible(false)
    setTimeout(() => onDismiss?.(), 200)
  }

  if (!visible) return null

  const colors = {
    error: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-800 dark:text-red-200',
    warning: 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800 text-yellow-800 dark:text-yellow-200',
    info: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-200'
  }

  return (
    <div className={`border rounded-lg p-4 mb-4 ${colors[type]} modal-enter error-shake`}>
      <div className="flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          {title && (
            <h3 className="font-semibold text-sm mb-1">{title}</h3>
          )}
          <p className="text-sm">{message}</p>
          {onRetry && (
            <button
              onClick={onRetry}
              className="mt-2 text-sm font-semibold flex items-center gap-1 hover:underline"
            >
              <RefreshCw className="w-3 h-3" />
              Try again
            </button>
          )}
        </div>
        {onDismiss && (
          <button
            onClick={handleDismiss}
            className="text-current opacity-60 hover:opacity-100 transition-opacity"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  )
}

