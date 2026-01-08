'use client'

import React, { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAppSelector } from '@/store/hooks'
import LoginForm from '@/components/auth/LoginForm'

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { isAuthenticated } = useAppSelector((state) => state.auth)
  
  // Get redirect URL from query params
  const redirectUrl = searchParams.get('redirect') || '/dashboard'

  console.log('🔍 Login page - redirectUrl:', redirectUrl)

  useEffect(() => {
    if (isAuthenticated) {
      console.log('✅ Already authenticated, redirecting to:', redirectUrl)
      router.push(redirectUrl)
    }
  }, [isAuthenticated, router, redirectUrl])

  const handleLoginSuccess = () => {
    console.log('✅ Login successful, redirecting to:', redirectUrl)
    router.push(redirectUrl)
  }

  return (
    <div className="h-full bg-gradient-to-br from-slate-50 via-white to-blue-50 flex items-center justify-center p-4">
      <LoginForm onSuccess={handleLoginSuccess} />
    </div>
  )
}
