'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
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
  Play
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

const DashboardPage = () => {
  const { user } = useAppSelector((state) => state.auth)
  const [experts, setExperts] = useState<Expert[]>([])
  const [loadingExperts, setLoadingExperts] = useState(true)
  const [selectedExpert, setSelectedExpert] = useState<Expert | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  useEffect(() => {
    fetchExperts()
  }, [])

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
                            >
                              <Play className="h-3 w-3 mr-1" />
                              Chat
                            </Button>
                            <Button variant="outline" size="sm">
                              <Settings className="h-3 w-3" />
                            </Button>
                          </div>
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
    </DashboardLayout>
  )
}

export default DashboardPage
