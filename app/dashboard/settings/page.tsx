'use client'

import React from 'react'
import DashboardLayout from '@/components/dashboard/DashboardLayout'
import ComingSoonPage from '@/components/ComingSoonPage'

const SettingsPage = () => {
  return (
    <DashboardLayout>
      <ComingSoonPage 
        title="Settings" 
        description="Configure your Dilan AI preferences and integrations" 
      />
    </DashboardLayout>
  )
}

export default SettingsPage
