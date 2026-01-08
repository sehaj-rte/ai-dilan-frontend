'use client'

import React, { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAppSelector, useAppDispatch } from '@/store/hooks'
import { loadUserFromStorage, fetchCurrentUser } from '@/store/slices/authSlice'
import Header from '@/components/Header'
import HeroSection from '@/components/HeroSection'
import FeaturesSection from '@/components/FeaturesSection'
import UseCasesSection from '@/components/UseCasesSection'
import CreateDigitalMindSection from '@/components/CreateDigitalMindSection'

export default function Home() {
  const router = useRouter()
  const dispatch = useAppDispatch()
  const { isAuthenticated, isLoading, token } = useAppSelector((state) => state.auth)

  useEffect(() => {
    // Load user from storage first (for immediate UI)
    dispatch(loadUserFromStorage())
    
    // Then fetch fresh user data from API
    if (token || localStorage.getItem('dilan_ai_token')) {
      dispatch(fetchCurrentUser())
    }
  }, [dispatch, token])

  useEffect(() => {
    // Redirect authenticated users to projects
    if (!isLoading && isAuthenticated) {
      router.push('/projects')
    }
  }, [isAuthenticated, isLoading, router])

  // Show loading while checking authentication
  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  // Don't render landing page if authenticated (will redirect)
  if (isAuthenticated) {
    return null
  }

  return (
    <main className="h-full bg-white">
      <Header />
      <HeroSection />
      <FeaturesSection />
      <UseCasesSection />
      <CreateDigitalMindSection />
    </main>
  )
}
