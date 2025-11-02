// Configuration file for environment variables
// This centralizes all configuration so we can easily change it

export const config = {
  // Backend API URL - defaults to localhost for development
  apiUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001',
  
  // Other configuration can be added here as needed
  maxFileSize: 50 * 1024 * 1024, // 50MB
} as const

// Helper to get full API endpoint URL
export const getApiUrl = (path: string = '') => {
  const baseUrl = config.apiUrl
  return path ? `${baseUrl}${path}` : baseUrl
}

