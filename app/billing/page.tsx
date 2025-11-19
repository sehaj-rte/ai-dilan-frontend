'use client'

import React, { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import BillingPanel from '@/components/billing/BillingPanel'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Settings } from 'lucide-react'

const BillingPage = () => {
  const router = useRouter()
  const searchParams = useSearchParams()
  const expertSlug = searchParams.get('expert')
  
  const [userToken, setUserToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check if user is authenticated
    const token = typeof window !== 'undefined' ? localStorage.getItem('dilan_ai_token') : null
    setUserToken(token)
    setLoading(false)
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!userToken) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="max-w-md w-full mx-4">
          <CardHeader>
            <CardTitle className="text-xl font-bold">Authentication Required</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-gray-600">
              You need to be logged in to view billing information.
            </p>
            <div className="flex gap-2">
              <Button onClick={() => router.push('/auth/login')}>
                Login
              </Button>
              <Button variant="outline" onClick={() => router.push('/')}>
                Go Home
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
  <div className="bg-gray-50">
    <div className="mx-auto px-4 py-4 max-w-[1300px]">  {/* reduced width */}

      {/* Header */}
      <div className="mb-4">
        <Button 
          variant="ghost" 
          onClick={() => router.back()}
          className="flex items-center gap-2 mb-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>

        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Settings className="h-7 w-7" />
          Billing & Subscriptions
        </h1>

        <p className="text-gray-600 mt-1">
          Manage your subscriptions, payment methods, and billing information
        </p>
      </div>

      {/* Billing Content */}
      <Card className="p-6">
        <BillingPanel 
          userToken={userToken} 
          expertSlug={expertSlug || undefined} 
        />
      </Card>
    </div>
  </div>
  )
}

export default BillingPage