'use client'

import React, { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { useAppSelector } from '@/store/hooks'
import { API_URL } from '@/lib/config'
import { fetchWithAuth, getAuthHeaders } from '@/lib/api-client'
import VoiceRecorder from '@/components/voice-studio/VoiceRecorder'
import AudioFileUploader from '@/components/voice-studio/AudioFileUploader'
import VoiceCloneLibrary from '@/components/voice-studio/VoiceCloneLibrary'
import ElevenLabsVoicePreview from '@/components/voice-studio/ElevenLabsVoicePreview'
import { Mic, Upload, Loader2, ArrowLeft, Library, Cloud } from 'lucide-react'
import Link from 'next/link'

export default function VoiceStudioPage() {
  const searchParams = useSearchParams()
  const expertIdFromUrl = searchParams.get('expertId')
  const { user } = useAppSelector((state) => state.auth)
  const [activeTab, setActiveTab] = useState<'record' | 'upload'>('record')
  const [voiceClones, setVoiceClones] = useState<any[]>([])
  const [expert, setExpert] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  const [rightTab, setRightTab] = useState<'library' | 'elevenlabs'>('library')

  // Fetch expert details if expertId is provided
  useEffect(() => {
    if (!expertIdFromUrl || !user?.id) return

    let isMounted = true
    const abortController = new AbortController()

    const fetchExpert = async () => {
      try {
        const response = await fetchWithAuth(`${API_URL}/experts/${expertIdFromUrl}`, {
          headers: getAuthHeaders(),
        })
        
        if (!isMounted) return
        
        const data = await response.json()

        if (data.success && isMounted) {
          setExpert(data.expert)
        }
      } catch (error) {
        if (isMounted) {
          console.error('Error fetching expert:', error)
        }
      }
    }

    fetchExpert()

    return () => {
      isMounted = false
      abortController.abort()
    }
  }, [expertIdFromUrl, user?.id])

  // Fetch voice clones
  useEffect(() => {
    const fetchVoiceClones = async () => {
      if (!user?.id) return

      try {
        setLoading(true)
        
        // If expertId is provided, fetch only that expert's clones
        if (expertIdFromUrl) {
          const response = await fetchWithAuth(`${API_URL}/voice-clone/samples/${expertIdFromUrl}?user_id=${user.id}`, {
            headers: getAuthHeaders(),
          })
          const data = await response.json()

          if (data.success) {
            const samples = data.samples || []
            if (samples.length > 0) {
              setVoiceClones([{
                expert_id: expertIdFromUrl,
                voice_id: samples[0].voice_id,
                name: samples[0].name,
                description: samples[0].description,
                category: samples[0].category,
                status: samples[0].status,
                samples: samples,
                created_at: samples[0].created_at
              }])
            } else {
              setVoiceClones([])
            }
          }
        } else {
          // Fetch all user's voice clones
          const response = await fetchWithAuth(`${API_URL}/voice-clone/list/${user.id}`, {
            headers: getAuthHeaders(),
          })
          const data = await response.json()

          if (data.success) {
            setVoiceClones(data.voice_clones || [])
          }
        }
      } catch (error) {
        console.error('Error fetching voice clones:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchVoiceClones()
  }, [user?.id, expertIdFromUrl, refreshTrigger])

  const handleRefresh = () => {
    setRefreshTrigger(prev => prev + 1)
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-500">Please log in to access Voice Studio</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          {expertIdFromUrl && expert && (
            <Link
              href={`/project/${expertIdFromUrl}/knowledge-base`}
              className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to {expert.name}
            </Link>
          )}
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Voice Studio</h1>
          <p className="text-gray-600">
            {expertIdFromUrl && expert 
              ? `Create instant voice clone for ${expert.name}`
              : 'Create instant voice clones for your AI agents'
            }
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column: Voice Clone Creation */}
          <div className="space-y-6">
            {/* Tab Selector */}
            <div className="bg-white rounded-xl shadow-sm p-2 flex gap-2">
              <button
                onClick={() => setActiveTab('record')}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-all ${
                  activeTab === 'record'
                    ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-md'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <Mic className="w-5 h-5" />
                Record Voice
              </button>
              <button
                onClick={() => setActiveTab('upload')}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-all ${
                  activeTab === 'upload'
                    ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-md'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <Upload className="w-5 h-5" />
                Upload Files
              </button>
            </div>

            {/* Content Area */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              {activeTab === 'record' ? (
                <VoiceRecorder 
                  userId={user.id} 
                  expertId={expertIdFromUrl || undefined}
                  expertName={expert?.name}
                  onSuccess={handleRefresh} 
                />
              ) : (
                <AudioFileUploader
                  userId={user.id}
                  expertId={expertIdFromUrl || undefined}
                  expertName={expert?.name}
                  onSuccess={handleRefresh} 
                />
              )}
            </div>

            {/* Info Card */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <h3 className="font-semibold text-blue-900 mb-2">💡 Tips for Best Results</h3>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Record in a quiet environment</li>
                <li>• Speak naturally and clearly</li>
                <li>• Provide 1-5 samples for better quality</li>
                <li>• Each sample should be 10-60 seconds</li>
                <li>• Use consistent audio quality across samples</li>
              </ul>
            </div>
          </div>

          {/* Right Column: Voice Clone Library & ElevenLabs Voices */}
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            {/* Tab Selector */}
            <div className="border-b border-gray-200">
              <div className="flex">
                <button
                  onClick={() => setRightTab('library')}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-4 font-medium transition-all ${
                    rightTab === 'library'
                      ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <Library className="w-5 h-5" />
                  My Voices
                </button>
                <button
                  onClick={() => setRightTab('elevenlabs')}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-4 font-medium transition-all ${
                    rightTab === 'elevenlabs'
                      ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <Cloud className="w-5 h-5" />
                  ElevenLabs
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6">
              {rightTab === 'library' ? (
                <>
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold text-gray-900">
                      {expertIdFromUrl ? 'Voice Clone' : 'Your Voice Clones'}
                    </h2>
                    <button
                      onClick={handleRefresh}
                      className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                      title="Refresh"
                    >
                      <Loader2 className={`w-5 h-5 text-gray-600 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                  </div>

                  {loading ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                    </div>
                  ) : (
                    <VoiceCloneLibrary
                      voiceClones={voiceClones}
                      onDelete={handleRefresh}
                      onUpdate={handleRefresh}
                    />
                  )}
                </>
              ) : (
                <>
                  <div className="mb-6">
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">ElevenLabs Voices</h2>
                    <p className="text-sm text-gray-600">
                      Browse and preview voices from your ElevenLabs account
                    </p>
                  </div>
                  <ElevenLabsVoicePreview />
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
