'use client'

import React, { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import DashboardLayout from '@/components/dashboard/DashboardLayout'
import VoiceCloneLibrary from '@/components/voice-studio/VoiceCloneLibrary'
import VoiceCloneModal from '@/components/voice-studio/VoiceCloneModal'
import VoicePreview from '@/components/voice-studio/VoicePreview'
import { API_URL } from '@/lib/config'
import { fetchWithAuth, getAuthHeaders } from '@/lib/api-client'
import { Mic2, Plus, Loader2, AlertCircle, User } from 'lucide-react'

interface Expert {
  id: string
  name: string
  description: string
  avatar_url: string
  voice_id: string
  agent_id: string
}

export default function VoiceStudioPage() {
  const params = useParams()
  const projectId = params.id as string

  const [expert, setExpert] = useState<Expert | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [refreshLibrary, setRefreshLibrary] = useState(0)
  const [voiceCount, setVoiceCount] = useState(0)

  // Fetch expert details
  useEffect(() => {
    const fetchExpert = async () => {
      try {
        setLoading(true)
        const response = await fetchWithAuth(`${API_URL}/experts/${projectId}`, {
          headers: getAuthHeaders(),
        })

        if (!response.ok) {
          throw new Error('Failed to fetch expert details')
        }

        const data = await response.json()

        if (data.success && data.expert) {
          setExpert(data.expert)
        } else {
          throw new Error('Expert not found')
        }
      } catch (err) {
        console.error('Error fetching expert:', err)
        setError(err instanceof Error ? err.message : 'Failed to load expert')
      } finally {
        setLoading(false)
      }
    }

    if (projectId) {
      fetchExpert()
    }
  }, [projectId])

  const handleModalSuccess = () => {
    setRefreshLibrary(prev => prev + 1)
  }

  const handleVoiceCountChange = (count: number) => {
    setVoiceCount(count)
  }

  const handleVoiceSelected = async (voiceId: string, voiceName: string) => {
    try {
      // Update expert's voice_id
      const response = await fetchWithAuth(`${API_URL}/experts/${projectId}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          voice_id: voiceId
        })
      })

      if (response.ok) {
        // Update local expert state
        setExpert(prev => prev ? { ...prev, voice_id: voiceId } : null)
      } else {
        throw new Error('Failed to update expert voice')
      }
    } catch (err) {
      console.error('Error updating expert voice:', err)
      throw err // Let the VoiceCloneLibrary handle the error
    }
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-full">
          <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
        </div>
      </DashboardLayout>
    )
  }

  if (error || !expert) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <p className="text-red-600">{error || 'Expert not found'}</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="h-full overflow-auto bg-gray-50">
        <div className="max-w-6xl mx-auto p-6 space-y-6">
          {/* Header with Create Button */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
               
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Voice Studio</h1>
                  <p className="text-gray-600">Create custom voice for {expert.name}</p>
                </div>
              </div>

              {voiceCount === 1 && (
                <button
                  onClick={() => setIsModalOpen(true)}
                  className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all shadow-lg hover:shadow-xl"
                >
                  <Plus className="w-5 h-5" />
                  <span>Create Voice</span>
                </button>
              )}
            </div>

            {/* Current Voice Status */}
            {/* {expert.voice_id && (
              <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center space-x-2">
                  <Mic2 className="w-4 h-4 text-green-600" />
                  <span className="text-sm text-green-800">
                    <strong>Active Voice:</strong> {expert.voice_id}
                  </span>
                  <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">
                    ✅ Voice Active
                  </span>
                </div>
              </div>
            )} */}
          </div>

          {/* Voice Preview Section - Only show if no voices in library */}
          {/* {voiceCount === 0 && (
            <VoicePreview expertId={projectId} />
          )} */}

          {/* Voice Clone Library */}
          <VoiceCloneLibrary
            projectId={projectId}
            refreshTrigger={refreshLibrary}
            selectedVoiceId={expert?.voice_id}
            onVoiceSelected={handleVoiceSelected}
            onVoiceCountChange={handleVoiceCountChange}
          />

          {/* Voice Clone Modal */}
          <VoiceCloneModal
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            projectId={projectId}
            onSuccess={handleModalSuccess}
          />
        </div>
      </div>
    </DashboardLayout>
  )
}
