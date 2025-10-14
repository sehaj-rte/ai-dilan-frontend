'use client'

import React from 'react'
import DashboardLayout from '@/components/dashboard/DashboardLayout'
import ComingSoonPage from '@/components/ComingSoonPage'

const ConversationsPage = () => {
  return (
    <DashboardLayout>
      <ComingSoonPage 
        title="Conversations" 
        description="Manage and view all your avatar conversations" 
      />
    </DashboardLayout>
  )
}

export default ConversationsPage
