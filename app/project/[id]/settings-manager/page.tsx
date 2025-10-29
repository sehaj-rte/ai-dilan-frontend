'use client'

import { useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'

export default function SettingsManagerPage() {
  const router = useRouter()
  const params = useParams()
  
  useEffect(() => {
    // Redirect to profile-settings page
    router.replace(`/project/${params.id}/profile-settings`)
  }, [params.id, router])

  return null
}