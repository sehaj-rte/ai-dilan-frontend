'use client'

import React from 'react'
import DashboardLayout from '@/components/dashboard/DashboardLayout'
import ComingSoonPage from '@/components/ComingSoonPage'

const MyExpertsPage = () => {
  return (
    <DashboardLayout>
      <ComingSoonPage 
        title="My Experts" 
        description="View and manage your AI experts" 
      />
    </DashboardLayout>
  )
}

export default MyExpertsPage
