'use client'

import React from 'react'
import { useParams } from 'next/navigation'
import DashboardLayout from '@/components/dashboard/DashboardLayout'
import EnhancedKnowledgeBase from '@/components/knowledge-base/EnhancedKnowledgeBase'

const ProjectKnowledgeBasePage = () => {
  const params = useParams()
  const projectId = params.id as string

  // TODO: Pass projectId to EnhancedKnowledgeBase when project-scoped knowledge base is implemented
  return (
    <DashboardLayout>
      <EnhancedKnowledgeBase />
    </DashboardLayout>
  )
}

export default ProjectKnowledgeBasePage