'use client'

import React, { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import DashboardLayout from '@/components/dashboard/DashboardLayout'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { API_URL } from '@/lib/config'
import { fetchWithAuth, getAuthHeaders } from '@/lib/api-client'
import { 
  Settings, 
  MessageSquare, 
  BookOpen, 
  Mic, 
  User,
  Calendar,
  Activity,
  Loader2
} from 'lucide-react'

interface Expert {
  id: string
  name: string
  description: string
  voice_id?: string
  voice_name?: string
  created_at: string
  updated_at: string
  selected_files?: string[]
}

const ProjectPage = () => {
  const params = useParams()
  const router = useRouter()
  const projectId = params.id as string
  
  const [expert, setExpert] = useState<Expert | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchExpert()
  }, [projectId])

  // Refresh expert data when returning to this page
  useEffect(() => {
    const handleFocus = () => {
      fetchExpert()
    }
    
    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [projectId])

  const fetchExpert = async () => {
    try {
      setIsLoading(true)
      const response = await fetchWithAuth(`${API_URL}/experts/${projectId}`, {
        headers: getAuthHeaders(),
      })
      const data = await response.json()
      
      if (data.success) {
        setExpert(data.expert)
      } else {
        setError(data.error || 'Failed to load project')
      }
    } catch (error) {
      console.error('Error fetching expert:', error)
      setError('Failed to load project')
    } finally {
      setIsLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-[calc(100vh-200px)]">
          <div className="text-center">
            <Loader2 className="h-12 w-12 mx-auto mb-4 text-blue-500 animate-spin" />
            <p className="text-gray-600">Loading project...</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  if (error || !expert) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-[calc(100vh-200px)]">
          <div className="text-center">
            <div className="h-16 w-16 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center">
              <User className="h-8 w-8 text-red-600" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Project Not Found
            </h3>
            <p className="text-gray-500 text-sm mb-6">
              {error || 'The requested project could not be found.'}
            </p>
            <Button onClick={() => router.push('/dashboard')}>
              Back to Dashboard
            </Button>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{expert.name}</h1>
            <p className="text-gray-600 mt-1">{expert.description}</p>
          </div>
          <div className="flex items-center space-x-3">
            <Button
              variant="outline"
              onClick={() => router.push(`/project/${projectId}/settings`)}
            >
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </Button>
            <Button onClick={() => router.push(`/chat/${projectId}`)}>
              <MessageSquare className="h-4 w-4 mr-2" />
              Start Chat
            </Button>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Voice</CardTitle>
              <Mic className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {expert.voice_name ? (
                  <Badge variant="secondary">{expert.voice_name}</Badge>
                ) : (
                  <span className="text-gray-400">Not set</span>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Knowledge Base</CardTitle>
              <BookOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {expert.selected_files?.length || 0} files
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Created</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-sm font-medium">
                {formatDate(expert.created_at)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Last Updated</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-sm font-medium">
                {formatDate(expert.updated_at)}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="cursor-pointer hover:shadow-md transition-shadow" 
                onClick={() => router.push(`/project/${projectId}/knowledge-base`)}>
            <CardHeader>
              <CardTitle className="flex items-center">
                <BookOpen className="h-5 w-5 mr-2" />
                Knowledge Base
              </CardTitle>
              <CardDescription>
                Manage documents and content for your AI agent
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">
                {expert.selected_files?.length || 0} files uploaded
              </p>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => router.push(`/project/${projectId}/voice`)}>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Mic className="h-5 w-5 mr-2" />

                Voice Studio
              </CardTitle>
              <CardDescription>
                Browse and test different voices for your agent
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">
                {expert.voice_name ? `Using ${expert.voice_name}` : 'No voice selected'}
              </p>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => router.push(`/project/${projectId}/chat`)}>
            <CardHeader>
              <CardTitle className="flex items-center">
                <MessageSquare className="h-5 w-5 mr-2" />
                Chat Interface
              </CardTitle>
              <CardDescription>
                Start a conversation with your AI agent
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">
                Ready to chat
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  )
}

export default ProjectPage
