'use client'

import React, { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import DashboardLayout from '@/components/dashboard/DashboardLayout'

const DashboardPage = () => {
  const router = useRouter()

  // Redirect to projects page
  useEffect(() => {
    router.push('/projects')
  }, [router])

  return (
    <DashboardLayout>
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <span className="ml-4 text-gray-600 text-lg">Redirecting to projects...</span>
      </div>
    </DashboardLayout>
  )
}

export default DashboardPage
