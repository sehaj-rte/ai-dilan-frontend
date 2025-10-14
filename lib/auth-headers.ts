/**
 * Get authorization headers for API requests
 * Retrieves JWT token from localStorage and formats it for Bearer authentication
 */
export function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem('dilan_ai_token')
  
  if (!token) {
    return {
      'Content-Type': 'application/json',
    }
  }
  
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  }
}

/**
 * Get authorization headers for FormData requests (file uploads)
 * Note: Don't set Content-Type for FormData, browser will set it automatically with boundary
 */
export function getAuthHeadersForFormData(): HeadersInit {
  const token = localStorage.getItem('dilan_ai_token')
  
  if (!token) {
    return {}
  }
  
  return {
    'Authorization': `Bearer ${token}`,
  }
}
