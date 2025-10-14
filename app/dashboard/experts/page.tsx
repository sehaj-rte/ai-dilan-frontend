'use client'

import React from 'react'
import DashboardLayout from '@/components/dashboard/DashboardLayout'
import ComingSoonPage from '@/components/ComingSoonPage'

const MyExpertsPage = () => {
  return (
    <DashboardLayout>
      <ComingSoonPage 
        title="My Digital Avatars" 
        description="View and manage your digital avatars" 
      />
    </DashboardLayout>
  )
}

export default MyExpertsPage
