'use client'

import React, { useState, useEffect } from 'react'
import { API_URL } from '@/lib/config'
import { fetchWithAuth, getAuthHeaders } from '@/lib/api-client'
import { Mic2, Plus, Loader2, AlertCircle, Play, Pause, Volume2, Settings, Trash2, CheckCircle, Clock, Upload } from 'lucide-react'

interface PVCVoice {
  id: string
  name: string
  voice_id: string
  category: string
  status: string
  error_message?: string
  created_at: string
  updated_at: string
}

interface PVCVoiceLibraryProps {
  projectId: string
  refreshTrigger: number
  selectedVoiceId?: string
  onVoiceSelected: (voiceId: string, voiceName: string) => Promise<void>
  onVoiceCountChange: (count: number) => void
  onCreatePVCVoice: () => void
}

export default function PVCVoiceLibrary({
  projectId,
  refreshTrigger,
  selectedVoiceId,
  onVoiceSelected,
  onVoiceCountChange,
  onCreatePVCVoice
}: PVCVoiceLibraryProps) {
  const [voices, setVoices] = useState<PVCVoice[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [playingVoice, setPlayingVoice] = useState<string | null>(null)
  const [loadingVoice, setLoadingVoice] = useState<string | null>(null)

  // Fetch PVC voices
  const fetchVoices = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetchWithAuth(`${API_URL}/voice-clone/list?expert_id=${projectId}`, {
        headers: getAuthHeaders(),
      })

      if (!response.ok) {
        throw new Error('Failed to fetch voices')
      }

      const data = await response.json()

      if (data.success && data.voice_clones) {
        // Filter for PVC voices (category: 'professional')
        const pvcVoices = data.voice_clones.filter((voice: PVCVoice) => voice.category === 'professional')
        setVoices(pvcVoices)
        onVoiceCountChange(pvcVoices.length)
      } else {
        setVoices([])
        onVoiceCountChange(0)
      }
    } catch (err) {
      console.error('Error fetching PVC voices:', err)
      setError(err instanceof Error ? err.message : 'Failed to load voices')
      setVoices([])
      onVoiceCountChange(0)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchVoices()
  }, [projectId, refreshTrigger, onVoiceCountChange])

  const handleUseVoice = async (voice: PVCVoice) => {
    try {
      setLoadingVoice(voice.id)
      await onVoiceSelected(voice.voice_id, voice.name)
    } catch (err) {
      console.error('Error selecting voice:', err)
    } finally {
      setLoadingVoice(null)
    }
  }

  const handleDeleteVoice = async (voice: PVCVoice) => {
    if (!confirm(`Are you sure you want to delete "${voice.name}" from your library?\n\nNote: This will only remove it from your library. The voice will remain in ElevenLabs.`)) {
      return
    }

    try {
      // For PVC voices, we only delete from our database (not from ElevenLabs)
      // since these are professional voices that are expensive to recreate
      const response = await fetchWithAuth(`${API_URL}/voice-clone/${voice.id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      })

      if (response.ok) {
        setVoices(prev => prev.filter(v => v.id !== voice.id))
        onVoiceCountChange(voices.length - 1)
      } else {
        throw new Error('Failed to delete voice from library')
      }
    } catch (err) {
      console.error('Error deleting voice:', err)
      alert('Failed to delete voice from library. Please try again.')
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />
      case 'processing':
        return <Clock className="w-4 h-4 text-yellow-500 animate-pulse" />
      case 'failed':
        return <AlertCircle className="w-4 h-4 text-red-500" />
      default:
        return <Upload className="w-4 h-4 text-gray-500" />
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed':
        return 'Ready'
      case 'processing':
        return 'Training...'
      case 'failed':
        return 'Failed'
      default:
        return 'Pending'
    }
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

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <p className="text-red-600">{error}</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-sm">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Professional Voices</h2>
            <p className="text-sm text-gray-600">High-quality voices for commercial use</p>
          </div>
          <button
            onClick={onCreatePVCVoice}
            className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all shadow-md hover:shadow-lg"
          >
            <Plus className="w-4 h-4" />
            <span>Create Professional Voice</span>
          </button>
        </div>
      </div>

      <div className="p-6">
        {voices.length === 0 ? (
          <div className="text-center py-12">
            <Mic2 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Professional Voices</h3>
            <p className="text-gray-600 mb-6">
              Create your first professional voice for high-quality, commercial-grade speech synthesis.
            </p>
            <button
              onClick={onCreatePVCVoice}
              className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all shadow-lg hover:shadow-xl mx-auto"
            >
              <Plus className="w-5 h-5" />
              <span>Create Professional Voice</span>
            </button>
          </div>
        ) : (
          <div className="grid gap-4">
            {voices.map((voice) => (
              <div
                key={voice.id}
                className={`p-4 border rounded-lg transition-all hover:shadow-md ${
                  selectedVoiceId === voice.voice_id
                    ? 'border-purple-300 bg-purple-50'
                    : 'border-gray-200 bg-white'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4 flex-1">
                    <div className="flex-shrink-0">
                      <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-blue-500 rounded-lg flex items-center justify-center">
                        <Mic2 className="w-6 h-6 text-white" />
                      </div>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-3">
                        <h3 className="text-lg font-medium text-gray-900 truncate">
                          {voice.name}
                        </h3>
                        <div className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs border ${getStatusColor(voice.status)}`}>
                          {getStatusIcon(voice.status)}
                          <span>{getStatusText(voice.status)}</span>
                        </div>
                        {selectedVoiceId === voice.voice_id && (
                          <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-full font-medium">
                            ✓ Active
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mt-1">
                        Professional Voice • Created {new Date(voice.created_at).toLocaleDateString()}
                      </p>
                      {voice.error_message && (
                        <p className="text-sm text-red-600 mt-1">
                          Error: {voice.error_message}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    {voice.status === 'completed' && (
                      <>
                        <button
                          onClick={() => handleUseVoice(voice)}
                          disabled={loadingVoice === voice.id || selectedVoiceId === voice.voice_id}
                          className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all ${
                            selectedVoiceId === voice.voice_id
                              ? 'bg-purple-100 text-purple-700 cursor-default'
                              : 'bg-purple-600 text-white hover:bg-purple-700'
                          }`}
                        >
                          {loadingVoice === voice.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : selectedVoiceId === voice.voice_id ? (
                            <CheckCircle className="w-4 h-4" />
                          ) : (
                            <Volume2 className="w-4 h-4" />
                          )}
                          <span>
                            {selectedVoiceId === voice.voice_id ? 'Using' : 'Use Voice'}
                          </span>
                        </button>
                      </>
                    )}

                    <button
                      onClick={() => handleDeleteVoice(voice)}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                      title="Delete voice"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
