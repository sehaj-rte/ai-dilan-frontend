'use client'

import React from 'react'
import { useParams } from 'next/navigation'
import DashboardLayout from '@/components/dashboard/DashboardLayout'
import EnhancedKnowledgeBase from '@/components/knowledge-base/EnhancedKnowledgeBase'

const ProjectKnowledgeBasePage = () => {
  const params = useParams()
  const projectId = params.id as string

  return (
    <DashboardLayout>
      <EnhancedKnowledgeBase projectId={projectId} />
    </DashboardLayout>
  )
}

export default ProjectKnowledgeBasePage
