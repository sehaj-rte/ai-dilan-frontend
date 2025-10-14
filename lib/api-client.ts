import { API_URL } from './config'

/**
 * Enhanced fetch wrapper that handles authentication errors
 * Automatically logs out user on 401/403 responses
 */
export async function fetchWithAuth(
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> {
  const response = await fetch(endpoint, options)

  // Check for unauthorized or forbidden responses
  if (response.status === 401 || response.status === 403) {
    // Clear auth data
    localStorage.removeItem('dilan_ai_token')
    localStorage.removeItem('dilan_ai_user')
    
    // Redirect to login page
    if (typeof window !== 'undefined') {
      window.location.href = '/auth/login'
    }
  }

  return response
}

/**
 * Get authorization headers for API requests
 */
export function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem('dilan_ai_token')
  return {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` })
  }
}

/**
 * Get authorization headers for FormData requests (no Content-Type)
 */
export function getAuthHeadersForFormData(): HeadersInit {
  const token = localStorage.getItem('dilan_ai_token')
  return {
    ...(token && { 'Authorization': `Bearer ${token}` })
  }
}
