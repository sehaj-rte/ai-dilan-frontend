'use client'

import React, { useState, useEffect } from 'react'
import { API_URL } from '@/lib/config'
import { fetchWithAuth, getAuthHeaders } from '@/lib/api-client'
import { Mic2, Calendar, User, Loader2, AlertCircle, Play, Pause, Check, CheckCircle } from 'lucide-react'

interface VoiceClone {
  id: string
  user_id: string
  expert_id: string | null
  name: string
  voice_id: string
  description: string | null
  language: string | null
  accent: string | null
  category: 'instant' | 'professional'
  status: 'processing' | 'completed' | 'failed'
  error_message: string | null
  created_at: string
  updated_at: string
}

interface VoiceCloneLibraryProps {
  projectId: string
  refreshTrigger?: number
  selectedVoiceId?: string
  onVoiceSelected?: (voiceId: string, voiceName: string) => void
}

export default function VoiceCloneLibrary({ projectId, refreshTrigger, selectedVoiceId, onVoiceSelected }: VoiceCloneLibraryProps) {
  const [voiceClones, setVoiceClones] = useState<VoiceClone[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [playingVoice, setPlayingVoice] = useState<string | null>(null)
  const [audioLoading, setAudioLoading] = useState<string | null>(null)
  const [audioRefs, setAudioRefs] = useState<{ [key: string]: HTMLAudioElement }>({})
  const [previewText, setPreviewText] = useState('Hello, this is a preview of the voice clone.')
  const [selectingVoice, setSelectingVoice] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Auto-dismiss error message after 5 seconds
  useEffect(() => {
    if (errorMessage) {
      const timer = setTimeout(() => {
        setErrorMessage(null)
      }, 5000)
      return () => clearTimeout(timer)
    }
  }, [errorMessage])

  // Fetch voice clones for this project
  useEffect(() => {
    const fetchVoiceClones = async () => {
      try {
        setLoading(true)
        setError(null)

        const response = await fetchWithAuth(`${API_URL}/voice-clone/list?expert_id=${projectId}`, {
          headers: getAuthHeaders(),
        })

        if (!response.ok) {
          throw new Error('Failed to fetch voice clones')
        }

        const data = await response.json()
        
        if (data.success) {
          setVoiceClones(data.voice_clones || [])
        } else {
          throw new Error(data.error || 'Failed to load voice clones')
        }
      } catch (err) {
        console.error('Error fetching voice clones:', err)
        setError(err instanceof Error ? err.message : 'Failed to load voice clones')
      } finally {
        setLoading(false)
      }
    }

    if (projectId) {
      fetchVoiceClones()
    }
  }, [projectId, refreshTrigger])

  // Cleanup audio refs on unmount
  useEffect(() => {
    return () => {
      Object.values(audioRefs).forEach(audio => {
        audio.pause()
        URL.revokeObjectURL(audio.src)
      })
    }
  }, [audioRefs])

  const handlePreviewVoice = async (voiceId: string) => {
    try {
      setAudioLoading(voiceId)
      
      // Stop any currently playing audio
      if (playingVoice && audioRefs[playingVoice]) {
        audioRefs[playingVoice].pause()
        setPlayingVoice(null)
      }

      const response = await fetchWithAuth(
        `${API_URL}/voice-clone/preview/${voiceId}?text=${encodeURIComponent(previewText)}`,
        {
          headers: getAuthHeaders(),
        }
      )

      if (!response.ok) {
        throw new Error('Failed to generate voice preview')
      }

      const audioBlob = await response.blob()
      const audioUrl = URL.createObjectURL(audioBlob)
      
      const audio = new Audio(audioUrl)
      audio.onended = () => {
        setPlayingVoice(null)
        URL.revokeObjectURL(audioUrl)
      }
      
      audio.onerror = () => {
        setPlayingVoice(null)
        URL.revokeObjectURL(audioUrl)
        console.error('Error playing audio preview')
      }

      // Store audio ref
      setAudioRefs(prev => ({ ...prev, [voiceId]: audio }))
      
      await audio.play()
      setPlayingVoice(voiceId)
      
    } catch (err) {
      console.error('Error previewing voice:', err)
      setErrorMessage('Failed to preview voice. Please try again.')
    } finally {
      setAudioLoading(null)
    }
  }

  const handleStopPreview = (voiceId: string) => {
    if (audioRefs[voiceId]) {
      audioRefs[voiceId].pause()
      setPlayingVoice(null)
    }
  }

  const handleSelectVoice = async (voiceId: string, voiceName: string) => {
    try {
      setSelectingVoice(voiceId)
      setErrorMessage(null)
      
      // Call the parent callback
      if (onVoiceSelected) {
        await onVoiceSelected(voiceId, voiceName)
      }
      
      // Show success message
      setSuccessMessage(`✅ Voice "${voiceName}" selected successfully!`)
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccessMessage(null)
      }, 3000)
      
    } catch (error) {
      console.error('Error selecting voice:', error)
      setErrorMessage(`❌ Failed to select voice "${voiceName}". Please try again.`)
      
      // Clear error message after 5 seconds
      setTimeout(() => {
        setErrorMessage(null)
      }, 5000)
    } finally {
      setSelectingVoice(null)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-green-600 bg-green-50 border-green-200'
      case 'processing':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200'
      case 'failed':
        return 'text-red-600 bg-red-50 border-red-200'
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return '✅'
      case 'processing':
        return '⏳'
      case 'failed':
        return '❌'
      default:
        return '❓'
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-blue-600 mr-2" />
          <span className="text-gray-600">Loading voice clones...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-center py-8 text-red-600">
          <AlertCircle className="w-6 h-6 mr-2" />
          <span>{error}</span>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      {/* Success Toast */}
      {successMessage && (
        <div className="fixed top-4 right-4 z-50 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg flex items-center space-x-2 animate-in slide-in-from-right duration-300">
          <CheckCircle className="w-5 h-5" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Error Toast */}
      {errorMessage && (
        <div className="fixed top-4 right-4 z-50 bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg flex items-center space-x-2 animate-in slide-in-from-right duration-300">
          <AlertCircle className="w-5 h-5" />
          <span>{errorMessage}</span>
        </div>
      )}

      <div className="flex items-center space-x-3 mb-6">
        <Mic2 className="w-6 h-6 text-purple-600" />
        <h2 className="text-xl font-semibold text-gray-900">Voice Clone Library</h2>
        <span className="px-2 py-1 bg-purple-100 text-purple-700 text-sm rounded-full">
          {voiceClones.length} {voiceClones.length === 1 ? 'clone' : 'clones'}
        </span>
      </div>

      {/* Preview Text Input */}
      {/* {voiceClones.length > 0 && (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <label htmlFor="preview-text" className="block text-sm font-medium text-blue-900 mb-2">
            Preview Text
          </label>
          <input
            type="text"
            id="preview-text"
            value={previewText}
            onChange={(e) => setPreviewText(e.target.value)}
            placeholder="Enter text to preview with voice clones..."
            className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
          />
          <p className="text-xs text-blue-700 mt-1">
            This text will be used when previewing voice clones. Try different phrases to test voice quality.
          </p>
        </div>
      )} */}

      {voiceClones.length === 0 ? (
        <div className="text-center py-12">
          <Mic2 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Voice Clones Yet</h3>
          <p className="text-gray-600 mb-4">
            Create your first voice clone using the form above to get started.
          </p>
          <div className="text-sm text-gray-500">
            Voice clones will appear here once created and can be used for this expert.
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {voiceClones.map((voiceClone) => (
            <div
              key={voiceClone.id}
              className="border border-gray-200 rounded-lg p-4 hover:border-purple-300 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <h3 className="text-lg font-medium text-gray-900">{voiceClone.name}</h3>
                    <span className={`px-2 py-1 text-xs rounded-full border ${getStatusColor(voiceClone.status)}`}>
                      {getStatusIcon(voiceClone.status)} {voiceClone.status.charAt(0).toUpperCase() + voiceClone.status.slice(1)}
                    </span>
                    <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
                      {voiceClone.category}
                    </span>
                    {voiceClone.language && (
                      <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">
                        {voiceClone.language}
                      </span>
                    )}
                    {voiceClone.accent && (
                      <span className="px-2 py-1 bg-orange-100 text-orange-700 text-xs rounded-full">
                        {voiceClone.accent}
                      </span>
                    )}
                  </div>

                  {voiceClone.description && (
                    <div className="mb-3">
                      <p className="text-sm text-gray-600 italic">"{voiceClone.description}"</p>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600 mb-3">
                    <div className="flex items-center space-x-2">
                      {/* <User className="w-4 h-4" /> */}
                      {/* <span>Voice ID: </span>
                      <code className="bg-gray-100 px-2 py-1 rounded text-xs font-mono">
                        {voiceClone.voice_id}
                      </code> */}
                    </div>
                    <div className="flex items-center space-x-2">
                      <Calendar className="w-4 h-4" />
                      <span>Created: {formatDate(voiceClone.created_at)}</span>
                    </div>
                  </div>

                  {voiceClone.error_message && (
                    <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                      <div className="flex items-start space-x-2">
                        <AlertCircle className="w-4 h-4 text-red-600 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-red-900">Error</p>
                          <p className="text-sm text-red-700">{voiceClone.error_message}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex items-center space-x-2 ml-4">
                  {voiceClone.status === 'completed' && (
                    <>
                      {/* Preview Button */}
                      {audioLoading === voiceClone.voice_id ? (
                        <button
                          disabled
                          className="flex items-center px-3 py-2 bg-gray-100 text-gray-400 rounded-lg text-sm cursor-not-allowed"
                        >
                          <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                          Loading...
                        </button>
                      ) : playingVoice === voiceClone.voice_id ? (
                        <button
                          onClick={() => handleStopPreview(voiceClone.voice_id)}
                          className="flex items-center px-3 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors text-sm"
                          title="Stop preview"
                        >
                          <Pause className="w-4 h-4 mr-1" />
                          Stop
                        </button>
                      ) : (
                        <button
                          onClick={() => handlePreviewVoice(voiceClone.voice_id)}
                          className="flex items-center px-3 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors text-sm"
                          title="Preview voice"
                        >
                          <Play className="w-4 h-4 mr-1" />
                          Preview
                        </button>
                      )}
                      
                      {/* Use Voice Button */}
                      {selectingVoice === voiceClone.voice_id ? (
                        <button
                          disabled
                          className="flex items-center px-3 py-2 bg-purple-400 text-white rounded-lg text-sm cursor-not-allowed"
                        >
                          <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                          Selecting...
                        </button>
                      ) : selectedVoiceId === voiceClone.voice_id ? (
                        <button
                          onClick={() => handleSelectVoice(voiceClone.voice_id, voiceClone.name)}
                          className="flex items-center px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
                          title="Currently selected voice - click to reselect"
                        >
                          <Check className="w-4 h-4 mr-1" />
                          Selected
                        </button>
                      ) : (
                        <button
                          onClick={() => handleSelectVoice(voiceClone.voice_id, voiceClone.name)}
                          className="flex items-center px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm"
                          title="Use this voice for expert"
                        >
                          <Mic2 className="w-4 h-4 mr-1" />
                          Use Voice
                        </button>
                      )}
                    </>
                  )}
                  
                  {voiceClone.status === 'processing' && (
                    <div className="flex items-center px-3 py-2 bg-yellow-100 text-yellow-700 rounded-lg text-sm">
                      <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                      Processing...
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}


    </div>
  )
}
