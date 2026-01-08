import { useState, useEffect, useCallback } from 'react'
import { fetchWithAuth, getAuthHeaders } from '@/lib/api-client'
import { API_URL } from '@/lib/config'

interface SlugValidationResult {
  success?: boolean
  slug: string
  is_available: boolean
  original_slug: string
  current_owner?: string
  message: string
}

interface UseSlugValidationOptions {
  expertId?: string
  debounceMs?: number
}

export const useSlugValidation = (options: UseSlugValidationOptions = {}) => {
  const { expertId, debounceMs = 500 } = options
  
  const [isChecking, setIsChecking] = useState(false)
  const [validationResult, setValidationResult] = useState<SlugValidationResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const validateSlug = useCallback(async (slug: string) => {
    if (!slug || slug.length < 2) {
      setValidationResult(null)
      setError(null)
      return
    }

    setIsChecking(true)
    setError(null)

    try {
      const queryParams = new URLSearchParams()
      if (expertId) {
        queryParams.append('expert_id', expertId)
      }

      const url = `${API_URL}/publishing/check-slug-availability/${encodeURIComponent(slug)}${queryParams.toString() ? '?' + queryParams.toString() : ''}`
      
      const response = await fetchWithAuth(url, {
        headers: getAuthHeaders(),
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      
      if (data.success !== false) {
        // Handle both success: true and success: undefined cases
        setValidationResult(data)
      } else {
        // Handle validation errors (like empty slug, too short, etc.)
        setValidationResult(data)
        setError(null) // Clear any previous errors since we got a valid response
      }
    } catch (err: any) {
      console.error('Error validating slug:', err)
      setError(err.message || 'Failed to validate slug')
      setValidationResult(null)
    } finally {
      setIsChecking(false)
    }
  }, [expertId])

  const debouncedValidateSlug = useCallback(
    (() => {
      let timeoutId: NodeJS.Timeout
      return (slug: string) => {
        clearTimeout(timeoutId)
        timeoutId = setTimeout(() => validateSlug(slug), debounceMs)
      }
    })(),
    [validateSlug, debounceMs]
  )

  // Helper to get validation status
  const getValidationStatus = () => {
    if (isChecking) return 'checking'
    if (error) return 'error'
    if (!validationResult) return 'idle'
    if (validationResult.success === false) return 'invalid' // Empty, too short, etc.
    return validationResult.is_available ? 'available' : 'unavailable'
  }

  // Helper to get status message
  const getStatusMessage = () => {
    if (isChecking) return 'Checking availability...'
    if (error) return error
    if (!validationResult) return ''
    return validationResult.message
  }

  // Helper to get status color
  const getStatusColor = () => {
    const status = getValidationStatus()
    switch (status) {
      case 'checking': return 'text-blue-600'
      case 'available': return 'text-green-600'
      case 'unavailable': return 'text-red-600'
      case 'invalid': return 'text-orange-600'
      case 'error': return 'text-red-600'
      default: return 'text-gray-500'
    }
  }

  // Helper to get status icon
  const getStatusIcon = () => {
    const status = getValidationStatus()
    switch (status) {
      case 'checking': return '⏳'
      case 'available': return '✅'
      case 'unavailable': return '❌'
      case 'invalid': return '⚠️'
      case 'error': return '⚠️'
      default: return ''
    }
  }

  return {
    validateSlug: debouncedValidateSlug,
    isChecking,
    validationResult,
    error,
    getValidationStatus,
    getStatusMessage,
    getStatusColor,
    getStatusIcon,
  }
}
