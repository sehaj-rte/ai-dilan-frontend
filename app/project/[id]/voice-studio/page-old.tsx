'use client'

import React, { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import DashboardLayout from '@/components/dashboard/DashboardLayout'
import VoiceCloneLibrary from '@/components/voice-studio/VoiceCloneLibrary'
import VoiceCloneModal from '@/components/voice-studio/VoiceCloneModal'
import { API_URL } from '@/lib/config'
import { fetchWithAuth, getAuthHeaders, getAuthHeadersForFormData } from '@/lib/api-client'
import { CheckCircle, Loader2, Mic2, Plus, Upload, XCircle } from 'lucide-react'

interface Expert {
  id: string
  name: string
  description: string
  avatar_url: string
  voice_id: string
  agent_id: string
}

interface VoiceClone {
  voice_id: string
  name: string
  message: string
}

export default function VoiceStudioPage() {
  const params = useParams()
  const projectId = params.id as string

  const [expert, setExpert] = useState<Expert | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [refreshLibrary, setRefreshLibrary] = useState(0)
  const [isCreating, setIsCreating] = useState(false)
  const [createSuccess, setCreateSuccess] = useState<VoiceClone | null>(null)
  const [createError, setCreateError] = useState<string | null>(null)

  // Voice clone state
  const [voiceName, setVoiceName] = useState('')
  const [voiceDescription, setVoiceDescription] = useState('')
  const [voiceLanguage, setVoiceLanguage] = useState('English')
  const [voiceAccent, setVoiceAccent] = useState('American')
  const [audioFiles, setAudioFiles] = useState<File[]>([])

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
          setVoiceName(`${data.expert.name} Voice Clone`)
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files)
      setAudioFiles(files)
      setCreateSuccess(null)
      setCreateError(null)
    }
  }

  const handleCreateVoiceClone = async () => {
    if (audioFiles.length === 0) {
      setCreateError('Please select at least one audio file')
      return
    }

    if (!voiceName.trim()) {
      setCreateError('Please enter a name for the voice clone')
      return
    }

    try {
      setIsCreating(true)
      setCreateError(null)
      setCreateSuccess(null)

      const formData = new FormData()
      formData.append('name', voiceName)
      formData.append('expert_id', projectId) // Associate with this project
      formData.append('description', voiceDescription)
      formData.append('language', voiceLanguage)
      formData.append('accent', voiceAccent)
      
      audioFiles.forEach((file) => {
        formData.append('files', file)
      })

      const response = await fetchWithAuth(`${API_URL}/voice-clone/create`, {
        method: 'POST',
        headers: getAuthHeadersForFormData(),
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || 'Failed to create voice clone')
      }

      const result = await response.json()
      setCreateSuccess(result)
      setAudioFiles([])
      
      // Reset file input
      const fileInput = document.getElementById('audio-files') as HTMLInputElement
      if (fileInput) {
        fileInput.value = ''
      }

      // Refresh the voice clone library
      setRefreshLibrary(prev => prev + 1)
    } catch (err) {
      console.error('Error creating voice clone:', err)
      setCreateError(err instanceof Error ? err.message : 'Failed to create voice clone')
    } finally {
      setIsCreating(false)
    }
  }

  const removeFile = (index: number) => {
    setAudioFiles(prev => prev.filter((_, i) => i !== index))
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
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      </DashboardLayout>
    )
  }

  if (error || !expert) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <XCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
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
          {/* Voice Clone Creator */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center space-x-3 mb-6">
              <Mic2 className="w-6 h-6 text-blue-600" />
              <h2 className="text-xl font-semibold text-gray-900">Instant Voice Clone</h2>
            </div>

            {/* Voice Information Section */}
            <div className="mb-8">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Voice Information</h3>
              
              {/* Voice Name */}
              <div className="mb-4">
                <label htmlFor="voice-name" className="block text-sm font-medium text-gray-700 mb-2">
                  Name
                </label>
                <input
                  type="text"
                  id="voice-name"
                  value={voiceName}
                  onChange={(e) => setVoiceName(e.target.value)}
                  placeholder="e.g. old British man"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Labels Section */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label htmlFor="voice-language" className="block text-sm font-medium text-gray-700 mb-2">
                    Language
                  </label>
                  <select
                    id="voice-language"
                    value={voiceLanguage}
                    onChange={(e) => setVoiceLanguage(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="English">English</option>
                    <option value="Spanish">Spanish</option>
                    <option value="French">French</option>
                    <option value="German">German</option>
                    <option value="Italian">Italian</option>
                    <option value="Portuguese">Portuguese</option>
                    <option value="Hindi">Hindi</option>
                    <option value="Japanese">Japanese</option>
                    <option value="Korean">Korean</option>
                    <option value="Chinese">Chinese</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="voice-accent" className="block text-sm font-medium text-gray-700 mb-2">
                    Accent/Style
                  </label>
                  <select
                    id="voice-accent"
                    value={voiceAccent}
                    onChange={(e) => setVoiceAccent(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="American">American</option>
                    <option value="British">British</option>
                    <option value="Australian">Australian</option>
                    <option value="Canadian">Canadian</option>
                    <option value="Irish">Irish</option>
                    <option value="Scottish">Scottish</option>
                    <option value="Neutral">Neutral</option>
                  </select>
                </div>
              </div>

              {/* Description */}
              <div className="mb-4">
                <label htmlFor="voice-description" className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  id="voice-description"
                  value={voiceDescription}
                  onChange={(e) => setVoiceDescription(e.target.value)}
                  placeholder="Describe the voice characteristics, tone, and style..."
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                />
              </div>
            </div>

            {/* File Upload */}
            <div className="mb-6">
              <label htmlFor="audio-files" className="block text-sm font-medium text-gray-700 mb-2">
                Upload Audio Files
              </label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors">
                <Upload className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-sm text-gray-600 mb-2">
                  Click to upload or drag and drop
                </p>
                <p className="text-xs text-gray-500 mb-4">
                  MP3, WAV, WebM, OGG, M4A (Multiple files recommended)
                </p>
                <input
                  type="file"
                  id="audio-files"
                  multiple
                  accept="audio/mpeg,audio/mp3,audio/wav,audio/webm,audio/ogg,audio/m4a"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <label
                  htmlFor="audio-files"
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer transition-colors"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Select Files
                </label>
              </div>
            </div>

            {/* Selected Files */}
            {audioFiles.length > 0 && (
              <div className="mb-6">
                <h3 className="text-sm font-medium text-gray-700 mb-3">
                  Selected Files ({audioFiles.length})
                </h3>
                <div className="space-y-2">
                  {audioFiles.map((file, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="flex items-center space-x-3">
                        <Mic2 className="w-4 h-4 text-blue-600" />
                        <span className="text-sm text-gray-900">{file.name}</span>
                        <span className="text-xs text-gray-500">
                          ({(file.size / 1024 / 1024).toFixed(2)} MB)
                        </span>
                      </div>
                      <button
                        onClick={() => removeFile(index)}
                        className="text-red-600 hover:text-red-700 text-sm"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Create Button */}
            <button
              onClick={handleCreateVoiceClone}
              disabled={isCreating || audioFiles.length === 0 || !voiceName.trim()}
              className="w-full flex items-center justify-center px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {isCreating ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Creating Voice Clone...
                </>
              ) : (
                <>
                  <Mic2 className="w-5 h-5 mr-2" />
                  Create Voice Clone
                </>
              )}
            </button>

            {/* Success Message */}
            {createSuccess && (
              <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-start space-x-3">
                  <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                  <div className="flex-1">
                    <h4 className="text-sm font-semibold text-green-900 mb-1">
                      Voice Clone Created Successfully!
                    </h4>
                    <p className="text-sm text-green-700 mb-2">{createSuccess.message}</p>
                    <div className="bg-white p-3 rounded border border-green-200">
                      <p className="text-xs text-gray-600 mb-1">Voice ID:</p>
                      <code className="text-xs font-mono text-gray-900 bg-gray-50 px-2 py-1 rounded">
                        {createSuccess.voice_id}
                      </code>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Error Message */}
            {createError && (
              <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-start space-x-3">
                  <XCircle className="w-5 h-5 text-red-600 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-semibold text-red-900 mb-1">Error</h4>
                    <p className="text-sm text-red-700">{createError}</p>
                  </div>
                </div>
              </div>
            )}
          </div>

      
          {/* Voice Clone Library */}
          <VoiceCloneLibrary 
            projectId={projectId} 
            refreshTrigger={refreshLibrary}
            selectedVoiceId={expert?.voice_id}
            onVoiceSelected={handleVoiceSelected}
          />
        </div>
      </div>
    </DashboardLayout>
  )
}
