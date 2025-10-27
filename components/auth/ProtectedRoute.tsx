'use client'

import React, { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAppSelector, useAppDispatch } from '@/store/hooks'
import { loadUserFromStorage, fetchCurrentUser } from '@/store/slices/authSlice'

interface ProtectedRouteProps {
  children: React.ReactNode
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const router = useRouter()
  const dispatch = useAppDispatch()
  const { isAuthenticated, isLoading, token } = useAppSelector((state) => state.auth)
  const [initialCheckDone, setInitialCheckDone] = React.useState(false)

  useEffect(() => {
    // Load user from storage first (for immediate UI)
    dispatch(loadUserFromStorage())
    setInitialCheckDone(true)
    
    // Then fetch fresh user data from API
    const storedToken = localStorage.getItem('dilan_ai_token')
    if (token || storedToken) {
      dispatch(fetchCurrentUser())
    }
  }, [dispatch])

  useEffect(() => {
    // Only redirect after initial check is done
    if (initialCheckDone && !isLoading && !isAuthenticated) {
      const storedToken = localStorage.getItem('dilan_ai_token')
      if (!storedToken) {
        router.push('/auth/login')
      }
    }
  }, [isAuthenticated, isLoading, router, initialCheckDone])

  // Show loading spinner only on initial load, not after storage check
  if (!initialCheckDone || (isLoading && !isAuthenticated)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  // Don't render children if not authenticated and no token in storage
  if (!isAuthenticated && !localStorage.getItem('dilan_ai_token')) {
    return null
  }

  return <>{children}</>
}

export default ProtectedRoute
