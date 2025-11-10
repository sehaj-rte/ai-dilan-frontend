'use client'

import React, { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import DashboardLayout from '@/components/dashboard/DashboardLayout'
import VoiceCloneLibrary from '@/components/voice-studio/VoiceCloneLibrary'
import VoiceCloneModal from '@/components/voice-studio/VoiceCloneModal'
import VoicePreview from '@/components/voice-studio/VoicePreview'
import PVCVoiceLibrary from '@/components/voice-studio/pvc/PVCVoiceLibrary'
import PVCCreationWizard from '@/components/voice-studio/pvc/PVCCreationWizard'
import { API_URL } from '@/lib/config'
import { fetchWithAuth, getAuthHeaders } from '@/lib/api-client'
import { Mic2, Plus, Loader2, AlertCircle, User, X, CheckCircle, Zap, Award } from 'lucide-react'

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
  const [activeTab, setActiveTab] = useState<'instant' | 'professional'>('instant')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isPVCModalOpen, setIsPVCModalOpen] = useState(false)
  const [refreshLibrary, setRefreshLibrary] = useState(0)
  const [voiceCount, setVoiceCount] = useState(0)
  const [pvcVoiceCount, setPvcVoiceCount] = useState(0)
  const [showToast, setShowToast] = useState(false)
  const [toastMessage, setToastMessage] = useState('')

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

  const handlePVCVoiceCountChange = (count: number) => {
    setPvcVoiceCount(count)
  }

  const showToastMessage = (message: string) => {
    setToastMessage(message)
    setShowToast(true)
    setTimeout(() => {
      setShowToast(false)
    }, 3000) // Hide after 3 seconds
  }

  const handleCreateVoiceClick = () => {
    if (activeTab === 'instant') {
      if (voiceCount >= 6) {
        showToastMessage('Reached Limit. Delete old voices to create new ones.')
      } else {
        setIsModalOpen(true)
      }
    } else {
      // Professional Voice - limit to 1
      if (pvcVoiceCount >= 1) {
        showToastMessage('Limit Reached: You can only have 1 Professional Voice. Delete the existing one to create a new one.')
      } else {
        setIsPVCModalOpen(true)
      }
    }
  }

  const handlePVCModalSuccess = () => {
    setRefreshLibrary(prev => prev + 1)
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
          {/* Header with Voice Type Tabs */}
          <div className="bg-white rounded-lg shadow-sm">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900">Voice Studio</h1>
                    <p className="text-gray-600">Create custom voice for {expert.name}</p>
                  </div>
                </div>

                <button
                  onClick={handleCreateVoiceClick}
                  disabled={
                    (activeTab === 'instant' && voiceCount >= 6) ||
                    (activeTab === 'professional' && pvcVoiceCount >= 1)
                  }
                  className={`flex items-center space-x-2 px-6 py-3 rounded-lg transition-all shadow-lg ${
                    (activeTab === 'instant' && voiceCount >= 6) ||
                    (activeTab === 'professional' && pvcVoiceCount >= 1)
                      ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                      : 'bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:from-purple-700 hover:to-blue-700 hover:shadow-xl'
                  }`}
                >
                  <Plus className="w-5 h-5" />
                  <span>
                    {activeTab === 'instant' ? 'Create Voice' : 'Create Professional Voice'}
                    {activeTab === 'professional' && pvcVoiceCount >= 1 && ' (Limit Reached)'}
                  </span>
                </button>
              </div>
            </div>

            {/* Voice Type Tabs */}
            <div className="px-6 py-4">
              <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setActiveTab('instant')}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                    activeTab === 'instant'
                      ? 'bg-white text-purple-700 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Zap className="w-4 h-4" />
                  <span>Instant Voices</span>
                  {voiceCount > 0 && (
                    <span className="ml-1 px-2 py-0.5 bg-purple-100 text-purple-700 text-xs rounded-full">
                      {voiceCount}
                    </span>
                  )}
                </button>
                <button
                  onClick={() => setActiveTab('professional')}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                    activeTab === 'professional'
                      ? 'bg-white text-purple-700 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Award className="w-4 h-4" />
                  <span>Professional Voices</span>
                  {pvcVoiceCount > 0 && (
                    <span className="ml-1 px-2 py-0.5 bg-purple-100 text-purple-700 text-xs rounded-full">
                      {pvcVoiceCount}
                    </span>
                  )}
                </button>
              </div>
              
              {/* Tab Descriptions */}
              <div className="mt-3 text-sm text-gray-600">
                {activeTab === 'instant' ? (
                  <p>Quick voice cloning from audio samples. Perfect for personal use and testing.</p>
                ) : (
                  <p>High-quality professional voices for commercial use. Advanced training and verification.</p>
                )}
              </div>
            </div>
          </div>

          {/* Tab Content */}
          {activeTab === 'instant' ? (
            <>
              {/* Voice Preview Section - Only show if no voices in library */}
              {voiceCount === 0 && (
                <VoicePreview expertId={projectId} />
              )}

              {/* Instant Voice Clone Library */}
              <VoiceCloneLibrary
                projectId={projectId}
                refreshTrigger={refreshLibrary}
                selectedVoiceId={expert?.voice_id}
                onVoiceSelected={handleVoiceSelected}
                onVoiceCountChange={handleVoiceCountChange}
              />
            </>
          ) : (
            /* Professional Voice Library */
            <PVCVoiceLibrary
              projectId={projectId}
              refreshTrigger={refreshLibrary}
              selectedVoiceId={expert?.voice_id}
              onVoiceSelected={handleVoiceSelected}
              onVoiceCountChange={handlePVCVoiceCountChange}
              onCreatePVCVoice={() => setIsPVCModalOpen(true)}
            />
          )}

          {/* Voice Clone Modal */}
          <VoiceCloneModal
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            projectId={projectId}
            onSuccess={handleModalSuccess}
          />

          {/* PVC Creation Wizard */}
          <PVCCreationWizard
            isOpen={isPVCModalOpen}
            onClose={() => setIsPVCModalOpen(false)}
            projectId={projectId}
            onSuccess={handlePVCModalSuccess}
          />
        </div>

        {/* Toast Notification */}
        {showToast && (
          <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-top-2 duration-300">
            <div className="bg-blue-600 text-white px-6 py-4 rounded-lg shadow-lg flex items-center space-x-3 max-w-sm">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span className="text-sm font-medium">{toastMessage}</span>
              <button
                onClick={() => setShowToast(false)}
                className="ml-2 text-white hover:text-blue-200 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
