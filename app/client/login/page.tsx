'use client'

import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

export default function ClientLoginRedirect() {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  useEffect(() => {
    // Get the redirect parameter or default to client dashboard
    const redirect = searchParams.get('redirect') || '/client/dashboard'
    
    // Extract slug from redirect if it's a client route
    const slugMatch = redirect.match(/\/client\/([^\/]+)/)
    if (slugMatch) {
      const slug = slugMatch[1]
      // Redirect to the expert page where they can use the auth modal
      router.replace(`/client/${slug}`)
    } else {
      // Redirect to main auth login
      router.replace('/auth/login')
    }
  }, [router, searchParams])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
    </div>
  )
}
