'use client'

import React from 'react'
import RegisterForm from '@/components/auth/RegisterForm'
import Link from 'next/link'

const ClientSignupPage = () => {
  const handleSignupSuccess = () => {
    // Get redirect URL from query params or use default
    const urlParams = new URLSearchParams(window.location.search)
    const redirectUrl = urlParams.get('redirect') || '/client/dashboard'
    window.location.href = redirectUrl
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Join Our Community</h1>
          <p className="text-gray-600">Create an account to chat with AI experts</p>
        </div>
        
        <RegisterForm onSuccess={handleSignupSuccess} />
        
        <div className="text-center mt-6">
          <p className="text-sm text-gray-600">
            Already have an account?{' '}
            <Link href="/client/login" className="text-blue-600 hover:text-blue-700 font-medium">
              Sign in here
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

export default ClientSignupPage
