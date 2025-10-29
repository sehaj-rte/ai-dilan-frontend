'use client'

import React, { useState, useEffect, useRef } from 'react'
import { Play, Pause, Volume2, Loader2, AlertCircle, Mic2 } from 'lucide-react'
import { API_URL } from '@/lib/config'
import { fetchWithAuth, getAuthHeaders } from '@/lib/api-client'

interface VoicePreviewProps {
  expertId: string
  className?: string
}

interface AgentDetails {
  success: boolean
  expert_id: string
  elevenlabs_agent_id: string
  voice_id: string | null
  agent_name: string
  tts_config: {
    voice_id?: string
    model_id?: string
    stability?: number
    similarity_boost?: number
    speed?: number
  }
}

export default function VoicePreview({ expertId, className = '' }: VoicePreviewProps) {
  const [agentDetails, setAgentDetails] = useState<AgentDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isGeneratingPreview, setIsGeneratingPreview] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  // Fetch agent details on component mount
  useEffect(() => {
    const fetchAgentDetails = async () => {
      try {
        setLoading(true)
        setError(null)

        const response = await fetchWithAuth(`${API_URL}/experts/${expertId}/agent-details`, {
          headers: getAuthHeaders(),
        })

        if (!response.ok) {
          if (response.status === 404) {
            throw new Error('Expert not found')
          } else if (response.status === 400) {
            throw new Error('Expert does not have an associated voice agent')
          } else {
            throw new Error('Failed to fetch agent details')
          }
        }

        const data = await response.json()
        
        if (data.success) {
          setAgentDetails(data)
        } else {
          throw new Error(data.error || 'Failed to fetch agent details')
        }
      } catch (err) {
        console.error('Error fetching agent details:', err)
        setError(err instanceof Error ? err.message : 'Failed to load voice details')
      } finally {
        setLoading(false)
      }
    }

    if (expertId) {
      fetchAgentDetails()
    }
  }, [expertId])

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current.src = ''
      }
    }
  }, [])

  const handlePlayPreview = async () => {
    if (!agentDetails?.voice_id) {
      setError('No voice ID available for preview')
      return
    }

    try {
      setIsGeneratingPreview(true)
      setError(null)

      // Call the voice preview API
      const previewText = "Hello! This is a preview of the voice selected for this expert. How does it sound?"
      const response = await fetchWithAuth(
        `${API_URL}/voice-clone/preview/${agentDetails.voice_id}?text=${encodeURIComponent(previewText)}`,
        {
          headers: getAuthHeaders(),
        }
      )

      if (!response.ok) {
        throw new Error('Failed to generate voice preview')
      }

      // The response is audio data directly, not JSON
      const audioBlob = await response.blob()
      const audioUrl = URL.createObjectURL(audioBlob)
      
      // Stop any currently playing audio
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current.src = ''
      }
      
      // Create new audio element
      audioRef.current = new Audio(audioUrl)
      audioRef.current.onplay = () => setIsPlaying(true)
      audioRef.current.onpause = () => setIsPlaying(false)
      audioRef.current.onended = () => {
        setIsPlaying(false)
        URL.revokeObjectURL(audioUrl)
      }
      audioRef.current.onerror = () => {
        setError('Failed to play audio preview')
        setIsPlaying(false)
        URL.revokeObjectURL(audioUrl)
      }
      
      await audioRef.current.play()
    } catch (err) {
      console.error('Error playing voice preview:', err)
      setError(err instanceof Error ? err.message : 'Failed to play voice preview')
    } finally {
      setIsGeneratingPreview(false)
    }
  }

  const handleStopPreview = () => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
    }
    setIsPlaying(false)
  }

  if (loading) {
    return (
      <div className={`bg-white rounded-lg shadow-sm p-4 ${className}`}>
        <div className="flex items-center space-x-3">
          <Loader2 className="w-5 h-5 animate-spin text-purple-600" />
          <span className="text-gray-600">Loading voice details...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={`bg-red-50 border border-red-200 rounded-lg p-4 ${className}`}>
        <div className="flex items-center space-x-3">
          <AlertCircle className="w-5 h-5 text-red-500" />
          <span className="text-red-700">{error}</span>
        </div>
      </div>
    )
  }

  if (!agentDetails?.voice_id) {
    return (
      <div className={`bg-yellow-50 border border-yellow-200 rounded-lg p-4 ${className}`}>
        <div className="flex items-center space-x-3">
          <AlertCircle className="w-5 h-5 text-yellow-500" />
          <span className="text-yellow-700">No voice selected for this expert</span>
        </div>
      </div>
    )
  }

  return (
    <div className={`bg-white rounded-lg shadow-sm p-4 border ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-purple-100 rounded-lg">
            <Mic2 className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <h3 className="font-medium text-gray-900">Current Voice</h3>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          
          
          <button
            onClick={isPlaying ? handleStopPreview : handlePlayPreview}
            disabled={isGeneratingPreview}
            className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isGeneratingPreview ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Generating...</span>
              </>
            ) : isPlaying ? (
              <>
                <Pause className="w-4 h-4" />
                <span>Stop</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                <span>Preview Voice</span>
              </>
            )}
          </button>
        </div>
      </div>

     
    </div>
  )
}
