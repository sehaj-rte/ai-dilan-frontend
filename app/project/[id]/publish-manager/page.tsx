'use client'

import { useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'

export default function PublishManagerPage() {
  const router = useRouter()
  const params = useParams()
  
  useEffect(() => {
    // Redirect to publish page
    router.replace(`/project/${params.id}/publish`)
  }, [params.id, router])

  return null
}