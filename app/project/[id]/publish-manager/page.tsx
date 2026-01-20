'use client'

import { useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'

export default function PublishManagerPage() {
  const router = useRouter()
  const params = useParams()
  
  useEffect(() => {
    // Redirect to new Expert Preview Manager
    router.replace(`/project/${params.id}/expert-preview`)
  }, [params.id, router])

  return (
    <div className="flex items-center justify-center h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
    </div>
  )
}