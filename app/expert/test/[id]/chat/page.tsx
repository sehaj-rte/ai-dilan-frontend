'use client'

import React, { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useSelector, useDispatch } from 'react-redux'
import { Button } from '@/components/ui/button'
import ChatModeInterface from '@/components/chat/ChatModeInterface'
import { API_URL } from '@/lib/config'
import { RootState } from '@/store/store'
import { loadUserFromStorage, logout } from '@/store/slices/authSlice'
import { 
  ArrowLeft, 
  LogOut,
  TestTube,
  MessageCircle
} from 'lucide-react'

interface Expert {
  id: string
  name: string
  headline: string
  description: string
  avatar_url: string
  elevenlabs_agent_id: string
}

const ExpertTestChatPage = () => {
  const params = useParams()
  const router = useRouter()
  const dispatch = useDispatch()
  const expertId = params.id as string

  // Auth state from Redux
  const { user, isAuthenticated } = useSelector((state: RootState) => state.auth)

  const [expert, setExpert] = useState<Expert | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const convertS3UrlToProxy = (s3Url: string): string => {
    if (!s3Url) return s3Url
    const match = s3Url.match(/https:\/\/ai-dilan\.s3\.[^/]+\.amazonaws\.com\/(.+)/)
    if (match) {
      return `${API_URL}/images/avatar/full/${match[1]}`
    }
    return s3Url
  }

  // Load user from storage on mount
  useEffect(() => {
    dispatch(loadUserFromStorage())
  }, [])

  useEffect(() => {
    fetchExpertData()
  }, [expertId])

  const fetchExpertData = async () => {
    try {
      setLoading(true)
      
      // Fetch expert data directly by ID (no publication required)
      const response = await fetch(`${API_URL}/experts/${expertId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('dilan_ai_token')}`,
          'Content-Type': 'application/json'
        }
      })
      const data = await response.json()
      
      if (data.success && data.expert) {
        setExpert({
          ...data.expert,
          avatar_url: data.expert?.avatar_url ? convertS3UrlToProxy(data.expert.avatar_url) : null
        })
      } else {
        setError('Expert not found or access denied')
      }
    } catch (error) {
      console.error('Error fetching expert data:', error)
      setError('Failed to load expert data')
    } finally {
      setLoading(false)
    }
  }

  const handleBack = () => {
    router.push(`/expert/test/${expertId}`)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (error || !expert) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Expert Not Found</h1>
          <p className="text-gray-600 mb-6">{error || 'The expert you are looking for is not available.'}</p>
          <Button onClick={() => router.push('/dashboard')}>
            Back to Dashboard
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col bg-white">
      {/* Header */}
      <div className="border-b border-gray-200 flex-shrink-0">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleBack}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
              <div className="flex items-center gap-2">
                <TestTube className="h-4 w-4 text-orange-500" />
                <MessageCircle className="h-4 w-4 text-blue-500" />
                <h1 className="text-lg font-semibold text-gray-900">Testing Chat: {expert.name}</h1>
              </div>
            </div>
            
            {/* User Info & Logout */}
            {isAuthenticated && user && (
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">{user.email}</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    dispatch(logout())
                    router.push('/expert/login')
                  }}
                  className="flex items-center gap-2"
                >
                  <LogOut className="h-4 w-4" />
                  Logout
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Test Mode Banner */}
      <div className="bg-orange-50 border-b border-orange-200 px-4 py-2 flex-shrink-0">
        <div className="container mx-auto">
          <div className="flex items-center justify-center gap-2 text-orange-700 text-sm">
            <TestTube className="h-4 w-4" />
            <span className="font-medium">Test Mode - Private Testing Environment</span>
          </div>
        </div>
      </div>

      {/* Chat Interface */}
      <div className="flex-1 overflow-hidden">
        <ChatModeInterface 
          expertId={expertId}
        />
      </div>
    </div>
  )
}

export default ExpertTestChatPage
