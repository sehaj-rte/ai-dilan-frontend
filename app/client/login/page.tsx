'use client'

import React from 'react'
import LoginForm from '@/components/auth/LoginForm'
import Link from 'next/link'

const ClientLoginPage = () => {
  const handleLoginSuccess = () => {
    // Get redirect URL from query params or use default
    const urlParams = new URLSearchParams(window.location.search)
    const redirectUrl = urlParams.get('redirect') || '/client/dashboard'
    window.location.href = redirectUrl
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        
        
        <LoginForm onSuccess={handleLoginSuccess} />
        
        <div className="text-center mt-6">
          <p className="text-sm text-gray-600">
            Don't have an account?{' '}
            <Link href="/client/signup" className="text-blue-600 hover:text-blue-700 font-medium">
              Sign up here
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

export default ClientLoginPage
