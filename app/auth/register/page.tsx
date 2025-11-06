'use client'

import React, { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAppSelector } from '@/store/hooks'
import RegisterForm from '@/components/auth/RegisterForm'

export default function RegisterPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { isAuthenticated } = useAppSelector((state) => state.auth)
  
  // Get redirect URL from query params
  const redirectUrl = searchParams.get('redirect') || '/dashboard'

  useEffect(() => {
    if (isAuthenticated) {
      router.push(redirectUrl)
    }
  }, [isAuthenticated, router, redirectUrl])

  const handleRegisterSuccess = () => {
    router.push(redirectUrl)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 flex items-center justify-center p-4">
      <RegisterForm onSuccess={handleRegisterSuccess} />
    </div>
  )
}
