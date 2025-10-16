'use client'

import React, { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import DashboardLayout from '@/components/dashboard/DashboardLayout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { API_URL } from '@/lib/config'
import { fetchWithAuth, getAuthHeaders } from '@/lib/api-client'
import { 
  ArrowLeft, 
  Save, 
  Loader2, 
  Settings as SettingsIcon,
  User,
  Mic,
  BookOpen,
  Play,
  Pause
} from 'lucide-react'

interface Expert {
  id: string
  name: string
  description: string
  voice_id?: string
  voice_name?: string
  created_at: string
  updated_at: string
  selected_files?: string[]
}

interface Voice {
  voice_id: string
  name: string
  category: string
  preview_url?: string
}

interface KnowledgeBaseFile {
  id: string
  name: string
  original_name: string
  size: number
  type: string
  processing_status: string
}

const ProjectSettingsPage = () => {
  const params = useParams()
  const router = useRouter()
  const projectId = params.id as string
  
  const [expert, setExpert] = useState<Expert | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    voice_id: '',
    selected_files: [] as string[]
  })
  
  // Additional data
  const [voices, setVoices] = useState<Voice[]>([])
  const [knowledgeBaseFiles, setKnowledgeBaseFiles] = useState<KnowledgeBaseFile[]>([])
  const [playingVoice, setPlayingVoice] = useState<string | null>(null)

  useEffect(() => {
    fetchExpert()
    fetchVoices()
    fetchKnowledgeBaseFiles()
  }, [projectId])

  const fetchExpert = async () => {
    try {
      const response = await fetchWithAuth(`${API_URL}/experts/${projectId}`, {
        headers: getAuthHeaders(),
      })
      const data = await response.json()
      
      if (data.success) {
        setExpert(data.expert)
        setFormData({
          name: data.expert.name || '',
          description: data.expert.description || '',
          voice_id: data.expert.voice_id || '',
          selected_files: data.expert.selected_files || []
        })
      } else {
        setError(data.error || 'Failed to load project')
      }
    } catch (error) {
      console.error('Error fetching expert:', error)
      setError('Failed to load project')
    } finally {
      setIsLoading(false)
    }
  }

  const fetchVoices = async () => {
    try {
      const response = await fetchWithAuth(`${API_URL}/voices`, {
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
      const response = await fetchWithAuth(`${API_URL}/knowledge-base/files`, {
        headers: getAuthHeaders(),
      })
      const data = await response.json()
      
      if (data.success) {
        setKnowledgeBaseFiles(data.files || [])
      }
    } catch (error) {
      console.error('Error fetching knowledge base files:', error)
    }
  }

  const handleSave = async () => {
    try {
      setIsSaving(true)
      setError(null)
      
      const response = await fetchWithAuth(`${API_URL}/experts/${projectId}`, {
        method: 'PUT',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })
      
      const data = await response.json()
      
      if (data.success) {
        setSuccessMessage('Settings saved successfully!')
        setExpert(data.expert)
        setTimeout(() => setSuccessMessage(null), 3000)
      } else {
        setError(data.error || 'Failed to save settings')
      }
    } catch (error) {
      console.error('Error saving settings:', error)
      setError('Failed to save settings')
    } finally {
      setIsSaving(false)
    }
  }

  const handleVoicePreview = async (voiceId: string, previewUrl?: string) => {
    if (playingVoice === voiceId) {
      setPlayingVoice(null)
      return
    }

    if (previewUrl) {
      setPlayingVoice(voiceId)
      const audio = new Audio(previewUrl)
      audio.onended = () => setPlayingVoice(null)
      audio.play()
    }
  }

  const handleFileToggle = (fileId: string) => {
    setFormData(prev => ({
      ...prev,
      selected_files: prev.selected_files.includes(fileId)
        ? prev.selected_files.filter(id => id !== fileId)
        : [...prev.selected_files, fileId]
    }))
  }

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-[calc(100vh-200px)]">
          <div className="text-center">
            <Loader2 className="h-12 w-12 mx-auto mb-4 text-blue-500 animate-spin" />
            <p className="text-gray-600">Loading settings...</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  if (error && !expert) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-[calc(100vh-200px)]">
          <div className="text-center">
            <div className="h-16 w-16 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center">
              <User className="h-8 w-8 text-red-600" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Project Not Found
            </h3>
            <p className="text-gray-500 text-sm mb-6">
              {error}
            </p>
            <Button onClick={() => router.push('/dashboard')}>
              Back to Dashboard
            </Button>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push(`/project/${projectId}`)}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                <SettingsIcon className="h-6 w-6 mr-2" />
                Project Settings
              </h1>
              <p className="text-gray-600 mt-1">Configure your AI agent</p>
            </div>
          </div>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </>
            )}
          </Button>
        </div>

        {/* Success/Error Messages */}
        {successMessage && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-green-800 text-sm">{successMessage}</p>
          </div>
        )}
        
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800 text-sm">{error}</p>
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
              Configure the basic details of your AI agent
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
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Describe what your agent does"
                rows={3}
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
              Choose a voice for your AI agent
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {voices.map((voice) => (
                <div
                  key={voice.voice_id}
                  className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                    formData.voice_id === voice.voice_id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => setFormData(prev => ({ ...prev, voice_id: voice.voice_id }))}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">{voice.name}</h4>
                      <Badge variant="secondary" className="text-xs mt-1">
                        {voice.category}
                      </Badge>
                    </div>
                    {voice.preview_url && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleVoicePreview(voice.voice_id, voice.preview_url)
                        }}
                      >
                        {playingVoice === voice.voice_id ? (
                          <Pause className="h-4 w-4" />
                        ) : (
                          <Play className="h-4 w-4" />
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Knowledge Base */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <BookOpen className="h-5 w-5 mr-2" />
              Knowledge Base
            </CardTitle>
            <CardDescription>
              Select files for your agent to reference
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {knowledgeBaseFiles.map((file) => (
                <div
                  key={file.id}
                  className="flex items-center space-x-3 p-3 border rounded-lg"
                >
                  <input
                    type="checkbox"
                    checked={formData.selected_files.includes(file.id)}
                    onChange={() => handleFileToggle(file.id)}
                    className="rounded"
                  />
                  <div className="flex-1">
                    <h4 className="font-medium text-sm">{file.name}</h4>
                    <p className="text-xs text-gray-500">
                      {(file.size / 1024).toFixed(1)} KB • {file.type}
                    </p>
                  </div>
                  <Badge 
                    variant={file.processing_status === 'completed' ? 'default' : 'secondary'}
                    className="text-xs"
                  >
                    {file.processing_status}
                  </Badge>
                </div>
              ))}
              {knowledgeBaseFiles.length === 0 && (
                <p className="text-gray-500 text-sm text-center py-4">
                  No files in knowledge base. Upload files to get started.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}

export default ProjectSettingsPage
