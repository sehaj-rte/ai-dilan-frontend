'use client'

import React, { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useSelector, useDispatch } from 'react-redux'
import { Button } from '@/components/ui/button'
import { API_URL } from '@/lib/config'
import { ArrowLeft, Phone, PhoneOff, LogOut, TestTube, MessageSquare } from 'lucide-react'
import { useVoiceConversation } from '@/hooks/useVoiceConversation'
import { RootState } from '@/store/store'
import { loadUserFromStorage, logout } from '@/store/slices/authSlice'

interface Expert {
  id: string
  name: string
  headline: string
  description: string
  avatar_url: string
  elevenlabs_agent_id: string
}

const ExpertTestCallPage = () => {
  const params = useParams()
  const router = useRouter()
  const dispatch = useDispatch()
  const expertId = params.id as string

  // Auth state from Redux
  const { user, isAuthenticated } = useSelector((state: RootState) => state.auth)

  const [expert, setExpert] = useState<Expert | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [callDuration, setCallDuration] = useState(0)
  const [timerInterval, setTimerInterval] = useState<NodeJS.Timeout | null>(null)

  const convertS3UrlToProxy = (s3Url: string): string => {
    if (!s3Url) return s3Url
    const match = s3Url.match(/https:\/\/ai-dilan\.s3\.[^/]+\.amazonaws\.com\/(.+)/)
    if (match) {
      return `${API_URL}/images/avatar/full/${match[1]}`
    }
    return s3Url
  }

  // Voice conversation hook
  const {
    state,
    startConversation,
    endConversation,
  } = useVoiceConversation({
    expertId: expertId,
    onError: (error) => {
      setError(error)
    }
  })

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

  const handleStartCall = async () => {
    if (!expert?.elevenlabs_agent_id) {
      console.error('No ElevenLabs agent ID found')
      return
    }

    try {
      await startConversation()
      
      // Start call timer
      const interval = setInterval(() => {
        setCallDuration(prev => prev + 1)
      }, 1000)
      setTimerInterval(interval)
      
    } catch (error) {
      console.error('Failed to start voice conversation:', error)
    }
  }

  const handleEndCall = async () => {
    try {
      await endConversation()
      
      // Stop timer
      if (timerInterval) {
        clearInterval(timerInterval)
        setTimerInterval(null)
      }
    } catch (error) {
      console.error('Failed to end voice conversation:', error)
    }
  }

  const handleBack = () => {
    router.push(`/persona/test/${expertId}`)
  }

  const handleGoToChat = () => {
    router.push(`/persona/test/${expertId}/chat`)
  }

  const formatCallDuration = (seconds: number): string => {
    const hrs = Math.floor(seconds / 3600)
    const mins = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    
    if (hrs > 0) {
      return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    }
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
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
                <TestTube className="h-4 w-4 text-orange-500" />
                <Phone className="h-4 w-4 text-green-500" />
                <h1 className="text-lg font-semibold text-gray-900">Testing Call: {expert.name}</h1>
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

      {/* Test Mode Banner */}
      <div className="bg-orange-50 border-b border-orange-200 px-4 py-2">
        <div className="container mx-auto">
          <div className="flex items-center justify-center gap-2 text-orange-700 text-sm">
            <TestTube className="h-4 w-4" />
            <span className="font-medium">Test Mode - Private Testing Environment</span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          
          {/* Call Interface Card */}
          <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
            
            {/* Expert Avatar */}
            <div className="mb-6">
              {expert.avatar_url ? (
                <div className="relative">
                  <img
                    src={expert.avatar_url}
                    alt={expert.name}
                    className={`w-32 h-32 rounded-full mx-auto object-cover shadow-lg transition-all duration-300 ${
                      state.isConnected ? 'ring-4 ring-green-400 ring-opacity-75' : ''
                    }`}
                    onError={(e) => {
                      e.currentTarget.style.display = 'none'
                      const fallback = e.currentTarget.parentElement?.querySelector('.avatar-fallback') as HTMLElement
                      if (fallback) fallback.style.display = 'flex'
                    }}
                  />
                  <div 
                    className={`avatar-fallback w-32 h-32 rounded-full mx-auto hidden items-center justify-center bg-gray-200 text-gray-600 text-4xl font-bold shadow-lg transition-all duration-300 ${
                      state.isConnected ? 'ring-4 ring-green-400 ring-opacity-75' : ''
                    }`}
                  >
                    {expert.name.charAt(0)}
                  </div>
                </div>
              ) : (
                <div className={`w-32 h-32 rounded-full mx-auto flex items-center justify-center bg-gray-200 text-gray-600 text-4xl font-bold shadow-lg transition-all duration-300 ${
                  state.isConnected ? 'ring-4 ring-green-400 ring-opacity-75' : ''
                }`}>
                  {expert.name.charAt(0)}
                </div>
              )}
            </div>

            {/* Expert Name */}
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              {expert.name}
            </h1>
            
            {/* Call Status */}
            <div className="mb-6">
              {state.isConnecting && (
                <p className="text-yellow-600 font-medium">Connecting...</p>
              )}
              {state.isConnected && (
                <div className="text-green-600">
                  <p className="font-medium">Connected</p>
                  <p className="text-sm">Duration: {formatCallDuration(callDuration)}</p>
                </div>
              )}
              {!state.isConnecting && !state.isConnected && (
                <p className="text-gray-500">Ready to call</p>
              )}
            </div>

            {/* Call Controls */}
            <div className="flex justify-center gap-4 mb-8">
              {!state.isConnected ? (
                <Button
                  size="lg"
                  onClick={handleStartCall}
                  disabled={state.isConnecting}
                  className="bg-green-600 hover:bg-green-700 text-white px-8 py-4 rounded-full font-semibold shadow-lg hover:shadow-xl transition-all duration-200"
                >
                  <Phone className="h-6 w-6 mr-2" />
                  {state.isConnecting ? 'Connecting...' : 'Start Test Call'}
                </Button>
              ) : (
                <Button
                  size="lg"
                  onClick={handleEndCall}
                  className="bg-red-600 hover:bg-red-700 text-white px-8 py-4 rounded-full font-semibold shadow-lg hover:shadow-xl transition-all duration-200"
                >
                  <PhoneOff className="h-6 w-6 mr-2" />
                  End Call
                </Button>
              )}
            </div>

            {/* Alternative Actions */}
            <div className="border-t border-gray-200 pt-6">
              <p className="text-sm text-gray-600 mb-4">Or try other test modes:</p>
              <Button
                variant="outline"
                onClick={handleGoToChat}
                className="flex items-center gap-2"
              >
                <MessageSquare className="h-4 w-4" />
                Test Chat Instead
              </Button>
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}

export default ExpertTestCallPage
