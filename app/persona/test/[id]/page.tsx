'use client'

import React, { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useSelector, useDispatch } from 'react-redux'
import { Button } from '@/components/ui/button'
import { API_URL } from '@/lib/config'
import { RootState } from '@/store/store'
import { loadUserFromStorage, logout } from '@/store/slices/authSlice'
import { 
  MessageCircle, 
  Phone, 
  User, 
  LogOut,
  ArrowLeft,
  TestTube
} from 'lucide-react'

interface Expert {
  id: string
  name: string
  headline: string
  description: string
  avatar_url: string
  elevenlabs_agent_id: string
}

const ExpertTestPage = () => {
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

  const handleStartChat = () => {
    // Redirect to expert test chat with ID
    router.push(`/persona/test/${expertId}/chat`)
  }

  const handleStartCall = () => {
    // Redirect to expert test call with ID
    router.push(`/persona/test/${expertId}/call`)
  }

  const handleBack = () => {
    router.push('/dashboard')
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
          <Button onClick={handleBack}>
            Back to Dashboard
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full bg-white">
      {/* Header */}
      <div className="border-b border-gray-200">
        <div className="container mx-auto px-4 py-4">
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
                <TestTube className="h-5 w-5 text-orange-500" />
                <h1 className="text-xl font-bold text-gray-900">Testing: {expert.name}</h1>
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
                    router.push('/persona/login')
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

      {/* Main Content - Centered */}
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-2xl mx-auto text-center">
          
          {/* Test Mode Banner */}
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-8">
            <div className="flex items-center justify-center gap-2 text-orange-700">
              <TestTube className="h-5 w-5" />
              <span className="font-medium">Test Mode</span>
            </div>
            <p className="text-sm text-orange-600 mt-1">
              This is a private testing environment. No publication required.
            </p>
          </div>

          {/* Expert Avatar */}
          <div className="mb-6">
            {expert.avatar_url ? (
              <div className="relative">
                <img
                  src={expert.avatar_url}
                  alt={expert.name}
                  className="w-32 h-32 rounded-full mx-auto object-cover shadow-lg"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none'
                    const fallback = e.currentTarget.parentElement?.querySelector('.avatar-fallback') as HTMLElement
                    if (fallback) fallback.style.display = 'flex'
                  }}
                />
                <div 
                  className="avatar-fallback w-32 h-32 rounded-full mx-auto hidden items-center justify-center bg-gray-200 text-gray-600 text-4xl font-bold shadow-lg"
                >
                  {expert.name.charAt(0)}
                </div>
              </div>
            ) : (
              <div className="w-32 h-32 rounded-full mx-auto flex items-center justify-center bg-gray-200 text-gray-600 text-4xl font-bold shadow-lg">
                {expert.name.charAt(0)}
              </div>
            )}
          </div>

          {/* Expert Name */}
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {expert.name}
          </h1>
          
          {/* Headline */}
          {expert.headline && (
            <p className="text-gray-500 text-sm mb-8">
              {expert.headline}
            </p>
          )}

          {/* Test Buttons */}
          <div className="flex justify-center gap-3 mb-12">
            <Button 
              size="lg" 
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-full font-semibold shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
              onClick={handleStartChat}
            >
              <MessageCircle className="h-5 w-5 mr-2" />
              Test Chat
            </Button>
            <Button 
              size="lg" 
              className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 rounded-full font-semibold shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
              onClick={handleStartCall}
            >
              <Phone className="h-5 w-5 mr-2" />
              Test Call
            </Button>
          </div>

          {/* Description Section */}
          {expert.description && (
            <div className="border-t border-gray-200 pt-8">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                  <span className="mr-2">≡</span>
                  Description
                </h2>
              </div>
              <div className="text-left text-gray-700 leading-relaxed">
                <p>{expert.description}</p>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}

export default ExpertTestPage
