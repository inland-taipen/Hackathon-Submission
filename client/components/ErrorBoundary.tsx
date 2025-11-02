'use client'

import React, { Component, ErrorInfo, ReactNode } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null, errorInfo: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo)
    this.setState({ error, errorInfo })
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null })
    window.location.reload()
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#4a154b] to-[#350d36] p-4">
          <div className="bg-white dark:bg-[#1a1d21] rounded-lg shadow-2xl p-8 max-w-md w-full modal-enter">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-[#1d1c1d] dark:text-[#d1d2d3]">
                  Something went wrong
                </h2>
                <p className="text-sm text-[#616061] dark:text-[#868686]">
                  Don't worry, we've got you covered
                </p>
              </div>
            </div>

            <div className="bg-[#f8f8f8] dark:bg-[#2c2d30] rounded p-4 mb-4">
              <p className="text-sm text-[#616061] dark:text-[#868686] font-mono">
                {this.state.error?.message || 'Unknown error occurred'}
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={this.handleReset}
                className="flex-1 px-4 py-2 bg-[#4a154b] text-white rounded font-semibold hover:bg-[#350d36] transition-all flex items-center justify-center gap-2 hover-lift"
              >
                <RefreshCw className="w-4 h-4" />
                Reload App
              </button>
              <button
                onClick={() => window.location.href = '/'}
                className="px-4 py-2 border border-[#e8e8e8] dark:border-[#343a40] text-[#1d1c1d] dark:text-[#d1d2d3] rounded font-semibold hover:bg-[#f8f8f8] dark:hover:bg-[#2c2d30] transition-all"
              >
                Go Home
              </button>
            </div>

            {process.env.NODE_ENV === 'development' && this.state.errorInfo && (
              <details className="mt-4 text-xs">
                <summary className="cursor-pointer text-[#616061] hover:text-[#1d1c1d] dark:hover:text-[#d1d2d3]">
                  Show error details
                </summary>
                <pre className="mt-2 p-2 bg-[#f8f8f8] dark:bg-[#2c2d30] rounded overflow-auto text-[#616061] dark:text-[#868686]">
                  {this.state.errorInfo.componentStack}
                </pre>
              </details>
            )}
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

