'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import DashboardLayout from '@/components/dashboard/DashboardLayout'
import ExpertProfileModal from '@/components/dashboard/ExpertProfileModal'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useAppSelector } from '@/store/hooks'
import { 
  Brain, 
  MessageSquare, 
  Users, 
  TrendingUp, 
  Plus,
  Mic,
  BarChart3,
  Clock,
  User,
  Settings,
  Play,
  Trash2,
  AlertTriangle
} from 'lucide-react'

interface Expert {
  id: string
  name: string
  description: string
  avatar_url: string | null
  elevenlabs_agent_id: string
  is_active: boolean
  created_at: string
}

interface ProcessingProgress {
  id: string
  expert_id: string
  agent_id: string
  stage: string
  status: string
  queue_position: number | null
  task_id: string | null
  current_file: string | null
  current_file_index: number
  total_files: number
  current_batch: number
  total_batches: number
  current_chunk: number
  total_chunks: number
  processed_files: number
  failed_files: number
  progress_percentage: number
  details: any
  error_message: string | null
  started_at: string
  updated_at: string
  completed_at: string | null
}

const DashboardPage = () => {
  const { user } = useAppSelector((state) => state.auth)
  const searchParams = useSearchParams()
  const [experts, setExperts] = useState<Expert[]>([])
  const [loadingExperts, setLoadingExperts] = useState(true)
  const [selectedExpert, setSelectedExpert] = useState<Expert | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [deletingExpert, setDeletingExpert] = useState<string | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null)
  const [expertProgress, setExpertProgress] = useState<Record<string, ProcessingProgress>>({})
  const [newExpertId, setNewExpertId] = useState<string | null>(null)

  useEffect(() => {
    // Check if we're redirected from expert creation
    const newExpert = searchParams.get('new_expert')
    if (newExpert) {
      setNewExpertId(newExpert)
      console.log('New expert created:', newExpert)
    }
    
    fetchExperts()
  }, [])
  
  // Watch for new expert and fetch its progress immediately
  useEffect(() => {
    if (newExpertId && experts.length > 0) {
      console.log('Fetching progress for new expert:', newExpertId)
      // Force immediate progress fetch for the new expert
      fetchProgressForExperts()
    }
  }, [newExpertId, experts.length])
  
  useEffect(() => {
    // Only start polling if we have experts
    if (experts.length === 0) return
    
    // Initial fetch
    fetchProgressForExperts()
    
    // Poll for progress updates every 2 seconds
    const progressInterval = setInterval(() => {
      fetchProgressForExperts()
    }, 2000)
    
    return () => clearInterval(progressInterval)
  }, [experts.length, newExpertId]) // Also depend on newExpertId to restart polling
  
  // Stop polling when there are no active progress records
  useEffect(() => {
    if (Object.keys(expertProgress).length === 0 && experts.length > 0) {
      // No active progress, we can reduce polling frequency or stop
      // For now, we'll keep polling but the backend will return empty results
    }
  }, [expertProgress])

  const convertS3UrlToProxy = (s3Url: string): string => {
    if (!s3Url) return s3Url
    
    // Convert S3 URL to proxy URL
    // From: https://ai-dilan.s3.us-east-1.amazonaws.com/expert-avatars/filename.png
    // To: http://localhost:8000/images/avatar/full/expert-avatars/filename.png
    const match = s3Url.match(/https:\/\/ai-dilan\.s3\.[^/]+\.amazonaws\.com\/(.+)/)
    if (match) {
      return `http://localhost:8000/images/avatar/full/${match[1]}`
    }
    return s3Url
  }

  const fetchExperts = async () => {
    try {
      setLoadingExperts(true)
      const response = await fetch('http://localhost:8000/experts/')
      const data = await response.json()
      
      if (data.success && data.experts) {
        // Convert S3 URLs to proxy URLs
        const expertsWithProxyUrls = data.experts.map((expert: Expert) => ({
          ...expert,
          avatar_url: expert.avatar_url ? convertS3UrlToProxy(expert.avatar_url) : null
        }))
        setExperts(expertsWithProxyUrls)
        
        // Fetch progress for all experts
        fetchProgressForExperts(expertsWithProxyUrls)
      } else {
        console.error('Failed to fetch experts:', data.error)
        setExperts([])
      }
    } catch (error) {
      console.error('Error fetching experts:', error)
      setExperts([])
    } finally {
      setLoadingExperts(false)
    }
  }
  
  const fetchProgressForExperts = async (expertsList?: Expert[]) => {
    const expertsToCheck = expertsList || experts
    if (expertsToCheck.length === 0) return
    
    try {
      // Fetch progress for each expert
      const progressPromises = expertsToCheck.map(async (expert) => {
        try {
          const response = await fetch(`http://localhost:8000/api/experts/${expert.id}/progress`)
          const data = await response.json()
          
          if (data.success && data.progress) {
            return { expertId: expert.id, progress: data.progress }
          }
          return null
        } catch (error) {
          return null
        }
      })
      
      const results = await Promise.all(progressPromises)
      const progressMap: Record<string, ProcessingProgress> = {}
      
      results.forEach((result) => {
        if (result && result.progress) {
          // Only update if status is not completed to avoid unnecessary re-renders
          if (result.progress.status !== 'completed') {
            progressMap[result.expertId] = result.progress
          }
        }
      })
      
      // Only update state if there are active progress records
      if (Object.keys(progressMap).length > 0) {
        setExpertProgress(progressMap)
      } else {
        // Clear progress if all are completed
        setExpertProgress({})
      }
    } catch (error) {
      console.error('Error fetching progress:', error)
    }
  }

  const handleDeleteExpert = async (expertId: string) => {
    try {
      setDeletingExpert(expertId)
      const response = await fetch(`http://localhost:8000/experts/${expertId}`, {
        method: 'DELETE',
      })
      const data = await response.json()
      
      if (data.success) {
        // Remove the expert from the list
        setExperts(experts.filter(expert => expert.id !== expertId))
        setShowDeleteConfirm(null)
        // You could show a success toast here
        console.log('Expert deleted successfully:', data.message)
      } else {
        console.error('Failed to delete expert:', data.error)
        // You could show an error toast here
        alert('Failed to delete expert: ' + data.error)
      }
    } catch (error) {
      console.error('Error deleting expert:', error)
      alert('Error deleting expert. Please try again.')
    } finally {
      setDeletingExpert(null)
    }
  }

  const stats = [
    {
      title: 'AI Experts',
      value: experts.length.toString(),
      description: 'Active digital minds',
      icon: Brain,
      color: 'text-blue-600'
    },
    {
      title: 'Conversations',
      value: '0',
      description: 'Total interactions',
      icon: MessageSquare,
      color: 'text-green-600'
    },
    {
      title: 'Reach',
      value: '0',
      description: 'People helped',
      icon: Users,
      color: 'text-purple-600'
    },
    {
      title: 'Growth',
      value: '0%',
      description: 'This month',
      icon: TrendingUp,
      color: 'text-orange-600'
    }
  ]

  const recentActivity: any[] = []

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Welcome Section */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg p-4 sm:p-6 text-white">
          <h1 className="text-2xl sm:text-3xl font-bold mb-2">
            Welcome back, {user?.full_name || user?.username}! 👋
          </h1>
          <p className="text-blue-100 mb-4 text-sm sm:text-base">
            Ready to scale your expertise and connect with your audience?
          </p>
          <Link href="/dashboard/create-expert">
            <Button className="bg-white text-blue-600 hover:bg-blue-50 text-sm sm:text-base">
              <Plus className="mr-2 h-4 w-4" />
              Create New Expert
            </Button>
          </Link>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {stats.map((stat, index) => {
            const Icon = stat.icon
            return (
              <Card key={index}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    {stat.title}
                  </CardTitle>
                  <Icon className={`h-4 w-4 ${stat.color}`} />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stat.value}</div>
                  <p className="text-xs text-muted-foreground">
                    {stat.description}
                  </p>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          {/* Quick Actions */}
          {/* <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>
                Get started with common tasks
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button className="w-full justify-start" variant="outline">
                <Brain className="mr-2 h-4 w-4" />
                Create AI Expert
              </Button>
              <Button className="w-full justify-start" variant="outline">
                <Mic className="mr-2 h-4 w-4" />
                Train Voice Model
              </Button>
              <Button className="w-full justify-start" variant="outline">
                <MessageSquare className="mr-2 h-4 w-4" />
                Start Conversation
              </Button>
              <Button className="w-full justify-start" variant="outline">
                <BarChart3 className="mr-2 h-4 w-4" />
                View Analytics
              </Button>
            </CardContent>
          </Card> */}

          {/* Recent Activity */}
          {/* <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>
                Your latest interactions and updates
              </CardDescription>
            </CardHeader>
            <CardContent>
              {recentActivity.length > 0 ? (
                <div className="space-y-4">
                  {recentActivity.map((activity, index) => {
                    const Icon = activity.icon
                    return (
                      <div key={index} className="flex items-center space-x-4">
                        <div className="bg-gray-100 p-2 rounded-full">
                          <Icon className="h-4 w-4 text-gray-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900">
                            {activity.title}
                          </p>
                          <div className="flex items-center text-xs text-gray-500">
                            <Clock className="mr-1 h-3 w-3" />
                            {activity.time}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Clock className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 text-sm">No recent activity yet</p>
                  <p className="text-gray-400 text-xs mt-1">Your interactions will appear here</p>
                </div>
              )}
            </CardContent>
          </Card> */}
        </div>

        {/* AI Experts Overview */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Your AI Experts</CardTitle>
              <CardDescription>
                Manage and monitor your digital minds
              </CardDescription>
            </div>
            <Link href="/dashboard/create-expert">
              <Button className="bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700">
                <Plus className="mr-2 h-4 w-4" />
                Create Expert
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {loadingExperts ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="ml-2 text-gray-600">Loading experts...</span>
              </div>
            ) : experts.length === 0 ? (
              <div className="text-center py-12">
                <Brain className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No AI Experts Yet</h3>
                <p className="text-gray-500 text-sm mb-6 max-w-md mx-auto">
                  Create your first AI expert to start scaling your expertise and connecting with your audience.
                </p>
                <Link href="/dashboard/create-expert">
                  <Button className="bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700">
                    <Plus className="mr-2 h-4 w-4" />
                    Create Your First Expert
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {experts.map((expert) => (
                  <Card key={expert.id} className="hover:shadow-md transition-shadow duration-200">
                    <CardContent className="p-6">
                      <div className="flex items-start space-x-4">
                        {/* Avatar */}
                        <div className="flex-shrink-0">
                          {expert.avatar_url ? (
                            <div className="relative">
                              <img
                                src={expert.avatar_url}
                                alt={expert.name}
                                className="w-12 h-12 rounded-full object-cover border-2 border-gray-200"
                                onError={(e) => {
                                  console.error('Failed to load avatar:', expert.avatar_url)
                                  console.log('Trying to access S3 image directly...')
                                  // Hide the image and show fallback
                                  e.currentTarget.style.display = 'none'
                                  const fallback = e.currentTarget.parentElement?.querySelector('.avatar-fallback') as HTMLElement
                                  if (fallback) {
                                    fallback.style.display = 'flex'
                                  }
                                }}
                                onLoad={() => {
                                  console.log('Avatar loaded successfully:', expert.avatar_url)
                                }}
                              />
                              <div 
                                className="avatar-fallback absolute inset-0 w-12 h-12 rounded-full bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center border-2 border-gray-200"
                                style={{ display: 'none' }}
                              >
                                <User className="h-6 w-6 text-blue-600" />
                              </div>
                            </div>
                          ) : (
                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center border-2 border-gray-200">
                              <User className="h-6 w-6 text-blue-600" />
                            </div>
                          )}
                        </div>
                        
                        {/* Expert Info */}
                        <div className="flex-1 min-w-0">
                          <h3 className="text-lg font-semibold text-gray-900 mb-1 truncate">
                            {expert.name}
                          </h3>
                          {expert.description && (
                            <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                              {expert.description}
                            </p>
                          )}
                          
                          {/* Status and Agent ID */}
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                expert.is_active 
                                  ? 'bg-green-100 text-green-800' 
                                  : 'bg-gray-100 text-gray-800'
                              }`}>
                                {expert.is_active ? 'Active' : 'Inactive'}
                              </span>
                              <span className="text-xs text-gray-500">
                                {new Date(expert.created_at).toLocaleDateString()}
                              </span>
                            </div>
                            
                            <div className="text-xs text-gray-500">
                              <span className="font-medium">Agent ID:</span>{' '}
                              <code className="bg-gray-100 px-1 py-0.5 rounded text-xs">
                                {expert.elevenlabs_agent_id.slice(0, 20)}...
                              </code>
                            </div>
                          </div>
                          
                          {/* Processing Progress */}
                          {expertProgress[expert.id] && expertProgress[expert.id].status !== 'completed' && (
                            <div className="mt-3 space-y-2">
                              <div className="flex items-center justify-between text-xs">
                                <span className="font-medium text-blue-600">
                                  {expertProgress[expert.id].stage === 'queued' && `Queued (Position ${expertProgress[expert.id].queue_position || '?'})`}
                                  {expertProgress[expert.id].stage === 'file_processing' && 'Processing files...'}
                                  {expertProgress[expert.id].stage === 'text_extraction' && 'Extracting text...'}
                                  {expertProgress[expert.id].stage === 'embedding' && 'Generating embeddings...'}
                                  {expertProgress[expert.id].stage === 'pinecone_storage' && 'Storing in database...'}
                                  {expertProgress[expert.id].stage === 'complete' && 'Complete!'}
                                  {expertProgress[expert.id].stage === 'failed' && 'Failed'}
                                </span>
                                <span className="text-gray-600">
                                  {expertProgress[expert.id].stage === 'queued' ? 'Waiting...' : `${Math.round(expertProgress[expert.id].progress_percentage)}%`}
                                </span>
                              </div>
                              
                              {/* Progress Bar */}
                              <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                                {expertProgress[expert.id].stage === 'queued' ? (
                                  <div className="bg-gradient-to-r from-blue-400 to-purple-400 h-full w-full animate-pulse" />
                                ) : (
                                  <div 
                                    className="bg-gradient-to-r from-blue-500 to-purple-500 h-full transition-all duration-300 ease-out"
                                    style={{ width: `${expertProgress[expert.id].progress_percentage}%` }}
                                  />
                                )}
                              </div>
                              
                              {/* Progress Details */}
                              {expertProgress[expert.id].stage === 'embedding' && (
                                <div className="text-xs text-gray-500">
                                  File {expertProgress[expert.id].current_file_index + 1}/{expertProgress[expert.id].total_files} • 
                                  Batch {expertProgress[expert.id].current_batch}/{expertProgress[expert.id].total_batches} • 
                                  Chunk {expertProgress[expert.id].current_chunk}/{expertProgress[expert.id].total_chunks}
                                </div>
                              )}
                              
                              {expertProgress[expert.id].details?.filename && (
                                <div className="text-xs text-gray-500 truncate">
                                  📄 {expertProgress[expert.id].details.filename}
                                </div>
                              )}
                              
                              {expertProgress[expert.id].status === 'failed' && expertProgress[expert.id].error_message && (
                                <div className="text-xs text-red-600 mt-1">
                                  ⚠️ {expertProgress[expert.id].error_message}
                                </div>
                              )}
                            </div>
                          )}
                          
                          {/* Action Buttons */}
                          <div className="flex space-x-2 mt-4">
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="flex-1"
                              onClick={() => {
                                setSelectedExpert(expert)
                                setIsModalOpen(true)
                              }}
                              disabled={expertProgress[expert.id] && expertProgress[expert.id].status !== 'completed'}
                            >
                              <Play className="h-3 w-3 mr-1" />
                              {expertProgress[expert.id] && expertProgress[expert.id].status !== 'completed' ? 'Processing...' : 'Chat'}
                            </Button>
                            <Button variant="outline" size="sm">
                              <Settings className="h-3 w-3" />
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm"
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              onClick={() => setShowDeleteConfirm(expert.id)}
                              disabled={deletingExpert === expert.id}
                            >
                              {deletingExpert === expert.id ? (
                                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-red-600"></div>
                              ) : (
                                <Trash2 className="h-3 w-3" />
                              )}
                            </Button>
                          </div>
                          
                          {/* Delete Confirmation */}
                          {showDeleteConfirm === expert.id && (
                            <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                              <div className="flex items-start space-x-2">
                                <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                                <div className="flex-1">
                                  <p className="text-sm text-red-800 font-medium mb-2">
                                    Delete "{expert.name}"?
                                  </p>
                                  <p className="text-xs text-red-700 mb-3">
                                    This will permanently delete the expert, ElevenLabs agent, and all associated data. This action cannot be undone.
                                  </p>
                                  <div className="flex space-x-2">
                                    <Button 
                                      size="sm" 
                                      variant="destructive"
                                      onClick={() => handleDeleteExpert(expert.id)}
                                      disabled={deletingExpert === expert.id}
                                      className="text-xs px-3 py-1"
                                    >
                                      {deletingExpert === expert.id ? 'Deleting...' : 'Delete'}
                                    </Button>
                                    <Button 
                                      size="sm" 
                                      variant="outline"
                                      onClick={() => setShowDeleteConfirm(null)}
                                      className="text-xs px-3 py-1"
                                    >
                                      Cancel
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      
      {/* Expert Profile Modal */}
      <ExpertProfileModal
        expert={selectedExpert}
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false)
          setSelectedExpert(null)
        }}
      />
      
      {/* Global Delete Confirmation Overlay */}
      {showDeleteConfirm && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
          onClick={() => setShowDeleteConfirm(null)}
        >
          <div 
            className="bg-white rounded-lg p-6 max-w-md w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start space-x-3">
              <AlertTriangle className="h-6 w-6 text-red-600 flex-shrink-0 mt-1" />
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Delete Expert
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  Are you sure you want to delete this expert? This will permanently remove:
                </p>
                <ul className="text-sm text-gray-600 mb-6 space-y-1">
                  <li>• The expert profile and settings</li>
                  <li>• ElevenLabs voice agent</li>
                  <li>• Knowledge base tools</li>
                  <li>• All associated data</li>
                </ul>
                <p className="text-sm text-red-600 font-medium mb-6">
                  This action cannot be undone.
                </p>
                <div className="flex space-x-3">
                  <Button 
                    variant="destructive"
                    onClick={() => {
                      const expertToDelete = experts.find(e => e.id === showDeleteConfirm)
                      if (expertToDelete) {
                        handleDeleteExpert(expertToDelete.id)
                      }
                    }}
                    disabled={deletingExpert !== null}
                    className="flex-1"
                  >
                    {deletingExpert ? 'Deleting...' : 'Delete Expert'}
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={() => setShowDeleteConfirm(null)}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}

export default DashboardPage
