'use client'

import React from 'react'
import DashboardLayout from '@/components/dashboard/DashboardLayout'
import ComingSoonPage from '@/components/ComingSoonPage'

const ProfilePage = () => {
  return (
    <DashboardLayout>
      <ComingSoonPage 
        title="Profile" 
        description="Manage your account settings and preferences" 
      />
    </DashboardLayout>
  )
}

export default ProfilePage
