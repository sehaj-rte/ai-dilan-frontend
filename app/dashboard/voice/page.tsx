'use client'

import React from 'react'
import DashboardLayout from '@/components/dashboard/DashboardLayout'
import ComingSoonPage from '@/components/ComingSoonPage'

const VoiceStudioPage = () => {
  return (
    <DashboardLayout>
      <ComingSoonPage 
        title="Voice Studio" 
        description="Create and manage voice profiles for your experts" 
      />
    </DashboardLayout>
  )
}

export default VoiceStudioPage
