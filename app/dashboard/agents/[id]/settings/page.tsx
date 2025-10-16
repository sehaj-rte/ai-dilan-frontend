'use client'

import React, { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import DashboardLayout from '@/components/dashboard/DashboardLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { API_URL } from '@/lib/config'
import { fetchWithAuth, getAuthHeaders } from '@/lib/api-client'
import { 
  ArrowLeft, 
  Save, 
  User, 
  Mic, 
  FileText, 
  Settings,
  Loader2,
  CheckCircle,
  AlertCircle,
  Play,
  Pause
} from 'lucide-react'

interface Expert {
  id: string
  name: string
  description: string
  avatar_url: string | null
  elevenlabs_agent_id: string
  is_active: boolean
  created_at: string
}

interface Voice {
  id: string
  name: string
  gender: string
  age: string
  accent: string
  description: string
  preview_url?: string
  category: string
}

interface KnowledgeBaseFile {
  id: string
  name: string
  type: string
  size: number
  processing_status: string
  created_at: string
}

const AgentSettingsPage = () => {
  const router = useRouter()
  const params = useParams()
  const expertId = params.id as string

  const [expert, setExpert] = useState<Expert | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    selectedVoice: '',
    selectedFiles: [] as string[]
  })

  const [voices, setVoices] = useState<Voice[]>([])
  const [knowledgeBaseFiles, setKnowledgeBaseFiles] = useState<KnowledgeBaseFile[]>([])
  const [playingVoice, setPlayingVoice] = useState<string | null>(null)

  useEffect(() => {
    if (expertId) {
      loadExpertData()
      fetchVoices()
      fetchKnowledgeBaseFiles()
    }
  }, [expertId])

  const loadExpertData = async () => {
    try {
      setLoading(true)
      const response = await fetchWithAuth(`${API_URL}/experts/${expertId}`, {
        headers: getAuthHeaders(),
      })
      const data = await response.json()

      if (data.success && data.expert) {
        const expertData = data.expert
        setExpert(expertData)
        setFormData({
          name: expertData.name || '',
          description: expertData.description || '',
          selectedVoice: expertData.voice_id || '',
          selectedFiles: expertData.selected_files || []
        })
      } else {
        setError('Failed to load expert data')
      }
    } catch (error) {
      setError('Failed to load expert data')
    } finally {
      setLoading(false)
    }
  }

  const fetchVoices = async () => {
    try {
      const response = await fetchWithAuth(`${API_URL}/voices/`, {
        headers: getAuthHeaders(),
      })
      const data = await response.json()
      if (data.success) {
        setVoices(data.voices || [])
      }
    } catch (error) {
      console.error('Error fetching voices:', error)
    }
  }

  const fetchKnowledgeBaseFiles = async () => {
    try {
      const response = await fetchWithAuth(`${API_URL}/knowledge-base/files/`, {
        headers: getAuthHeaders(),
      })
      const data = await response.json()
      if (data.success) {
        setKnowledgeBaseFiles(data.files || [])
      }
    } catch (error) {
      console.error('Error fetching files:', error)
    }
  }

  const playVoicePreview = async (voiceId: string, previewUrl?: string) => {
    if (playingVoice === voiceId) {
      setPlayingVoice(null)
      return
    }

    setPlayingVoice(voiceId)
    // Add audio playback logic here
    setTimeout(() => setPlayingVoice(null), 3000)
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      setError(null)

      const response = await fetchWithAuth(`${API_URL}/experts/${expertId}`, {
        method: 'PUT',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description,
          voice_id: formData.selectedVoice,
          selected_files: formData.selectedFiles
        }),
      })

      const data = await response.json()

      if (data.success) {
        setSuccess('Settings updated successfully!')
        setTimeout(() => {
          router.push('/dashboard')
        }, 2000)
      } else {
        setError(data.error || 'Failed to update settings')
      }
    } catch (error) {
      setError('Failed to update settings')
    } finally {
      setSaving(false)
    }
  }

  const toggleFileSelection = (fileId: string) => {
    setFormData(prev => ({
      ...prev,
      selectedFiles: prev.selectedFiles.includes(fileId)
        ? prev.selectedFiles.filter(id => id !== fileId)
        : [...prev.selectedFiles, fileId]
    }))
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">Loading agent settings...</span>
        </div>
      </DashboardLayout>
    )
  }

  if (!expert) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Agent Not Found</h2>
          <p className="text-gray-600 mb-4">The requested agent could not be found.</p>
          <Button onClick={() => router.push('/dashboard')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button
              variant="outline"
              onClick={() => router.push('/dashboard')}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <div>
              <h1 className="text-2xl font-bold flex items-center">
                <Settings className="h-6 w-6 mr-2" />
                Agent Settings
              </h1>
              <p className="text-gray-600">Configure {expert.name}</p>
            </div>
          </div>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Save Changes
          </Button>
        </div>

        {/* Status Messages */}
        {error && (
          <div className="flex items-center space-x-2 p-4 bg-red-50 border border-red-200 rounded-lg">
            <AlertCircle className="h-5 w-5 text-red-600" />
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {success && (
          <div className="flex items-center space-x-2 p-4 bg-green-50 border border-green-200 rounded-lg">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <p className="text-green-700">{success}</p>
          </div>
        )}

        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <User className="h-5 w-5 mr-2" />
              Basic Information
            </CardTitle>
            <CardDescription>
              Update your agent's name and description
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="name">Agent Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Enter agent name"
              />
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Describe your agent's expertise..."
                rows={4}
              />
            </div>
          </CardContent>
        </Card>

        {/* Voice Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Mic className="h-5 w-5 mr-2" />
              Voice Settings
            </CardTitle>
            <CardDescription>
              Choose the voice for your agent
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="voice">Select Voice</Label>
              <select
                id="voice"
                value={formData.selectedVoice}
                onChange={(e) => setFormData(prev => ({ ...prev, selectedVoice: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Choose a voice...</option>
                {voices.map((voice) => (
                  <option key={voice.id} value={voice.id}>
                    {voice.name} ({voice.gender}, {voice.age}, {voice.accent})
                  </option>
                ))}
              </select>
            </div>

            {/* Voice Preview */}
            {formData.selectedVoice && (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                {(() => {
                  const selectedVoice = voices.find(v => v.id === formData.selectedVoice)
                  return selectedVoice ? (
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium">{selectedVoice.name}</h4>
                        <p className="text-sm text-gray-600">
                          {selectedVoice.gender} • {selectedVoice.age} • {selectedVoice.accent}
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => playVoicePreview(selectedVoice.id, selectedVoice.preview_url)}
                      >
                        {playingVoice === selectedVoice.id ? (
                          <>
                            <Pause className="h-4 w-4 mr-1" />
                            Stop
                          </>
                        ) : (
                          <>
                            <Play className="h-4 w-4 mr-1" />
                            Preview
                          </>
                        )}
                      </Button>
                    </div>
                  ) : null
                })()}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Knowledge Base */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center">
                <FileText className="h-5 w-5 mr-2" />
                Knowledge Base
              </div>
              <span className="text-sm bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                {formData.selectedFiles.length} selected
              </span>
            </CardTitle>
            <CardDescription>
              Select files to include in your agent's knowledge base
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {knowledgeBaseFiles.map((file) => (
                <div
                  key={file.id}
                  className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-gray-50"
                >
                  <input
                    type="checkbox"
                    checked={formData.selectedFiles.includes(file.id)}
                    onChange={() => toggleFileSelection(file.id)}
                    className="rounded"
                  />
                  <div className="flex-1">
                    <p className="font-medium">{file.name}</p>
                    <p className="text-sm text-gray-500">
                      {file.type} • {(file.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    file.processing_status === 'completed' 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {file.processing_status}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}

export default AgentSettingsPage
