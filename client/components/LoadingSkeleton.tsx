'use client'

interface LoadingSkeletonProps {
  type?: 'message' | 'channel' | 'sidebar' | 'header'
  count?: number
}

export default function LoadingSkeleton({ type = 'message', count = 3 }: LoadingSkeletonProps) {
  if (type === 'message') {
    return (
      <div className="space-y-4 p-4">
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="flex gap-3 fade-in" style={{ animationDelay: `${i * 0.1}s` }}>
            <div className="w-10 h-10 rounded bg-gray-200 dark:bg-[#2c2d30] skeleton flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-gray-200 dark:bg-[#2c2d30] rounded w-32 skeleton" />
              <div className="h-3 bg-gray-200 dark:bg-[#2c2d30] rounded w-full skeleton" />
              <div className="h-3 bg-gray-200 dark:bg-[#2c2d30] rounded w-3/4 skeleton" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (type === 'channel') {
    return (
      <div className="space-y-2 p-3">
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="h-8 bg-gray-200 dark:bg-[#2c2d30] rounded skeleton fade-in" style={{ animationDelay: `${i * 0.05}s` }} />
        ))}
      </div>
    )
  }

  if (type === 'sidebar') {
    return (
      <div className="w-[260px] bg-[#3f0e40] p-4 space-y-4">
        <div className="h-12 bg-[#4a154b] rounded skeleton" />
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-8 bg-[#4a154b] rounded skeleton fade-in" style={{ animationDelay: `${i * 0.05}s` }} />
          ))}
        </div>
      </div>
    )
  }

  if (type === 'header') {
    return (
      <div className="h-[60px] bg-white dark:bg-[#1a1d21] border-b border-[#e8e8e8] dark:border-[#343a40] px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 bg-gray-200 dark:bg-[#2c2d30] rounded skeleton" />
          <div className="h-6 w-32 bg-gray-200 dark:bg-[#2c2d30] rounded skeleton" />
        </div>
        <div className="flex gap-2">
          <div className="w-24 h-9 bg-gray-200 dark:bg-[#2c2d30] rounded skeleton" />
          <div className="w-9 h-9 bg-gray-200 dark:bg-[#2c2d30] rounded skeleton" />
        </div>
      </div>
    )
  }

  return null
}

