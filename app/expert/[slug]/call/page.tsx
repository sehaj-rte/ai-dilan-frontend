'use client'

import React, { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { API_URL } from '@/lib/config'
import { ArrowLeft, Phone, PhoneOff } from 'lucide-react'
import { useVoiceConversation } from '@/hooks/useVoiceConversation'

interface Expert {
  id: string
  name: string
  headline: string
  description: string
  avatar_url: string
  elevenlabs_agent_id: string
}

interface Publication {
  id: string
  slug: string
  display_name: string
  is_published: boolean
}

const ExpertCallPage = () => {
  const params = useParams()
  const router = useRouter()
  const slug = params.slug as string

  const [expert, setExpert] = useState<Expert | null>(null)
  const [publication, setPublication] = useState<Publication | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const {
    state,
    startConversation,
    endConversation,
  } = useVoiceConversation({
    expertId: expert?.id || '',
    onError: (error) => {
      setError(error)
    },
    onStatusChange: (status) => {
      console.log('Voice status changed:', status)
    }
  })

  useEffect(() => {
    fetchExpertData()
  }, [slug])

  const fetchExpertData = async () => {
    try {
      setLoading(true)
      
      const response = await fetch(`${API_URL}/publishing/public/expert/${slug}`)
      const data = await response.json()
      
      if (data.success) {
        setExpert(data.expert)
        setPublication(data.publication)
      } else {
        setError('Expert not found or not published')
      }
    } catch (error) {
      console.error('Error fetching expert data:', error)
      setError('Failed to load expert page')
    } finally {
      setLoading(false)
    }
  }

  const handleStartCall = async () => {
    if (!expert) return
    
    try {
      // Check for microphone permission first
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setError('Your browser does not support microphone access. Please use a modern browser.')
        return
      }
      
      await startConversation()
    } catch (error) {
      console.error('Failed to start voice conversation:', error)
      if (error instanceof Error) {
        if (error.message.includes('Permission denied')) {
          setError('Microphone access denied. Please allow microphone access and try again.')
        } else if (error.message.includes('NotFoundError')) {
          setError('No microphone found. Please connect a microphone and try again.')
        } else {
          setError(error.message)
        }
      }
    }
  }

  const handleEndCall = async () => {
    try {
      await endConversation()
    } catch (error) {
      console.error('Failed to end voice conversation:', error)
    }
  }

  const handleBack = () => {
    router.push(`/expert/${slug}`)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
      </div>
    )
  }

  if (error && !expert) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Expert Not Found</h1>
          <p className="text-gray-600 mb-6">{error || 'The expert you are looking for is not available.'}</p>
          <Button onClick={() => router.push('/experts')}>
            Browse All Experts
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="border-b border-gray-200">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={handleBack}
                className="text-gray-600 hover:text-gray-900"
              >
                <ArrowLeft className="h-6 w-6" />
              </button>
              <div className="flex items-center space-x-2">
                {expert?.avatar_url && (
                  <img
                    src={expert.avatar_url}
                    alt={expert.name}
                    className="w-8 h-8 rounded-full object-cover"
                  />
                )}
                <span className="font-semibold text-gray-900">{expert?.name}</span>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-orange-500 rounded flex items-center justify-center">
                <span className="text-white text-sm">≡</span>
              </div>
              <div className="w-8 h-8 bg-orange-500 rounded flex items-center justify-center">
                <span className="text-white text-sm">🇺🇸</span>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">English</span>
              <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center text-white text-sm font-semibold">
                {expert?.name.charAt(0)}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-2xl mx-auto text-center">
          {/* Expert Avatar - Large */}
          <div className="mb-8">
            {expert?.avatar_url ? (
              <img
                src={expert.avatar_url}
                alt={expert.name}
                className="w-48 h-48 rounded-full mx-auto object-cover shadow-2xl border-8 border-white ring-4 ring-gray-100"
              />
            ) : (
              <div className="w-48 h-48 rounded-full mx-auto flex items-center justify-center bg-gray-200 text-gray-600 text-6xl font-bold shadow-2xl border-8 border-white ring-4 ring-gray-100">
                {expert?.name.charAt(0)}
              </div>
            )}
          </div>

          {/* Expert Name */}
          <h1 className="text-4xl font-bold text-gray-900 mb-8">
            {expert?.name}
          </h1>

          {/* Connection Status */}
          {state.isConnected && (
            <div className="mb-6">
              <div className="inline-flex items-center space-x-2 bg-green-50 border border-green-200 rounded-full px-4 py-2">
                <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse" />
                <span className="text-sm font-medium text-green-700">
                  {state.isSpeaking ? `${expert?.name} is speaking...` : state.isListening ? 'Listening...' : 'Connected'}
                </span>
              </div>
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Call Button */}
          <div className="mb-8">
            {!state.isConnected ? (
              <Button
                onClick={handleStartCall}
                disabled={state.isConnecting || !expert}
                className="bg-black hover:bg-gray-800 text-white px-8 py-6 rounded-full text-lg font-medium shadow-lg"
              >
                {state.isConnecting ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    Connecting...
                  </>
                ) : (
                  <>
                    <Phone className="mr-2 h-5 w-5" />
                    Start a call
                  </>
                )}
              </Button>
            ) : (
              <Button
                onClick={handleEndCall}
                className="bg-red-500 hover:bg-red-600 text-white px-8 py-6 rounded-full text-lg font-medium shadow-lg"
              >
                <PhoneOff className="mr-2 h-5 w-5" />
                End Call
              </Button>
            )}
          </div>

          {/* Volume Indicators - Only show when connected */}
          {state.isConnected && (
            <div className="max-w-md mx-auto space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>Input Level</span>
                  <span>{Math.round(state.inputVolume * 100)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-500 h-2 rounded-full transition-all duration-100"
                    style={{ width: `${state.inputVolume * 100}%` }}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>Output Level</span>
                  <span>{Math.round(state.outputVolume * 100)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-green-500 h-2 rounded-full transition-all duration-100"
                    style={{ width: `${state.outputVolume * 100}%` }}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default ExpertCallPage
