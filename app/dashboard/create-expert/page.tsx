'use client'
import { API_URL } from '@/lib/config'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import DashboardLayout from '@/components/dashboard/DashboardLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { 
  Upload, 
  User, 
  Mic, 
  FileText, 
  Save,
  ArrowLeft,
  Play,
  Pause,
  Volume2,
  Image as ImageIcon,
  CheckCircle,
  Copy
} from 'lucide-react'
import Link from 'next/link'

const ELEVENLABS_API_KEY = "sk_080d5c92d8712bc210e293fec768eb3997309b3052a06574"

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
  document_type: string | null
  processing_status: string
  created_at: string
  word_count: number | null
  description: string | null
  tags: string[]
}

const CreateExpertPage = () => {
  const router = useRouter()
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    systemPrompt: '',
    firstMessage: '',
    selectedVoice: '',
    avatar: null as File | null,
    avatarBase64: '' as string,
    selectedFiles: [] as string[]
  })
  
  const [voices, setVoices] = useState<Voice[]>([])
  const [loadingVoices, setLoadingVoices] = useState(false)
  const [playingVoice, setPlayingVoice] = useState<string | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showSuccessDialog, setShowSuccessDialog] = useState(false)
  const [successData, setSuccessData] = useState<{
    expertName: string
    agentId: string
    avatarUploaded: boolean
  } | null>(null)

  // Knowledge base files state
  const [knowledgeBaseFiles, setKnowledgeBaseFiles] = useState<KnowledgeBaseFile[]>([])
  const [loadingFiles, setLoadingFiles] = useState(false)
  const [filesError, setFilesError] = useState<string | null>(null)

  useEffect(() => {
    fetchVoices()
    fetchKnowledgeBaseFiles()
  }, [])

  const fetchKnowledgeBaseFiles = async () => {
    setLoadingFiles(true)
    setFilesError(null)
    try {
      const response = await fetch(`${API_URL}/knowledge-base/files`)
      const data = await response.json()
      
      if (data.success) {
        setKnowledgeBaseFiles(data.files || [])
      } else {
        setFilesError(data.error || 'Failed to load files')
        console.error('Failed to fetch knowledge base files:', data.error)
      }
    } catch (error) {
      setFilesError('Network error: Could not connect to server')
    } finally {
      setLoadingFiles(false)
    }
  }

  const fetchVoices = async () => {
    setLoadingVoices(true)
    try {
      console.log(`Fetching voices from: ${API_URL}/voice/elevenlabs-voices`)
      const response = await fetch(`${API_URL}/voice/elevenlabs-voices`)
      
      console.log(`Voice API response status: ${response.status}`)
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const data = await response.json()
      console.log('Voice API response data:', data)
      
      if (data.success) {
        setVoices(data.voices)
        console.log(`Successfully loaded ${data.voices.length} voices`)
      } else {
        console.error('Failed to fetch voices:', data.error)
        // Fallback to demo voices if API fails
        setVoices([
          { id: 'demo1', name: 'Sarah', gender: 'female', age: 'young', accent: 'american', description: 'Warm and professional', category: 'premade' },
          { id: 'demo2', name: 'Marcus', gender: 'male', age: 'middle_aged', accent: 'british', description: 'Authoritative and clear', category: 'premade' },
          { id: 'demo3', name: 'Elena', gender: 'female', age: 'young', accent: 'neutral', description: 'Friendly and engaging', category: 'premade' }
        ])
      }
    } catch (error) {
      console.error('Error fetching voices:', error)
      console.error('Full error details:', {
        message: error.message,
        stack: error.stack,
        apiUrl: `${API_URL}/voice/elevenlabs-voices`
      })
      // Fallback voices
      setVoices([
        { id: 'demo1', name: 'Sarah', gender: 'female', age: 'young', accent: 'american', description: 'Warm and professional', category: 'premade' },
        { id: 'demo2', name: 'Marcus', gender: 'male', age: 'middle_aged', accent: 'british', description: 'Authoritative and clear', category: 'premade' }
      ])
    } finally {
      setLoadingVoices(false)
    }
  }

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    
    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      alert('Image too large. Maximum size is 10MB.')
      return
    }
    
    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      alert('Unsupported image type. Please use JPEG, PNG, GIF, or WebP.')
      return
    }
    
    setFormData(prev => ({ ...prev, avatar: file }))
    
    // Create preview and base64 data
    const reader = new FileReader()
    reader.onload = (e) => {
      const result = e.target?.result as string
      setAvatarPreview(result)
      // Store the base64 data for upload
      setFormData(prev => ({ ...prev, avatarBase64: result }))
    }
    reader.readAsDataURL(file)
  }

  const playVoicePreview = async (voiceId: string, previewUrl?: string) => {
    if (playingVoice === voiceId) {
      setPlayingVoice(null)
      return
    }

    setPlayingVoice(voiceId)
    
    // If there's a preview URL, play it
    if (previewUrl) {
      try {
        const audio = new Audio(previewUrl)
        audio.onended = () => setPlayingVoice(null)
        await audio.play()
      } catch (error) {
        console.error('Error playing voice preview:', error)
        setPlayingVoice(null)
      }
    } else {
      // Simulate playing for demo voices
      setTimeout(() => setPlayingVoice(null), 2000)
    }
  }

  const handleFileSelection = (fileId: string) => {
    setFormData(prev => ({
      ...prev,
      selectedFiles: prev.selectedFiles.includes(fileId)
        ? prev.selectedFiles.filter(id => id !== fileId)
        : [...prev.selectedFiles, fileId]
    }))
  }

  const handleSelectAllFiles = () => {
    const allFileIds = knowledgeBaseFiles.map((file: KnowledgeBaseFile) => file.id)
    setFormData(prev => ({
      ...prev,
      selectedFiles: prev.selectedFiles.length === allFileIds.length ? [] : allFileIds
    }))
  }

  // Helper function to format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  // Helper function to format date
  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validate required fields
    if (!formData.name.trim()) {
      alert('Please enter an expert name')
      return
    }
    
    if (!formData.systemPrompt.trim()) {
      alert('Please enter a system prompt')
      return
    }
    
    if (!formData.selectedVoice) {
      alert('Please select a voice')
      return
    }
    
    setIsSubmitting(true)
    
    try {
      // Prepare the payload for the backend
      const payload = {
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        system_prompt: formData.systemPrompt.trim(),
        first_message: formData.firstMessage.trim() || null,
        voice_id: formData.selectedVoice,
        avatar_base64: formData.avatarBase64 || null,
        selected_files: formData.selectedFiles
      }
      
      console.log('Creating expert with payload:', {
        ...payload,
        avatar_base64: payload.avatar_base64 ? '[BASE64_DATA]' : null // Don't log the actual base64 data
      })
      
      // Send to backend
      const response = await fetch(`${API_URL}/experts/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      })
      
      const result = await response.json()
      
      if (response.ok && result.success) {
        console.log('Expert created successfully:', result)
        
        // Store expert ID for redirect
        const expertId = result.expert?.id
        
        // Set success data and show dialog
        setSuccessData({
          expertName: formData.name,
          agentId: result.elevenlabs_agent_id,
          avatarUploaded: !!result.expert?.avatar_url
        })
        setShowSuccessDialog(true)
        
        // Automatically redirect to dashboard after 2 seconds
        setTimeout(() => {
          router.push(`/dashboard?new_expert=${expertId}`)
        }, 2000)
        
        // Reset form
        setFormData({
          name: '',
          description: '',
          systemPrompt: '',
          firstMessage: '',
          selectedVoice: '',
          avatar: null,
          avatarBase64: '',
          selectedFiles: []
        })
        setAvatarPreview(null)
      } else {
        console.error('Error creating expert:', result)
        alert(`Error creating expert: ${result.error || 'Unknown error'}`)
      }
      
    } catch (error) {
      console.error('Network error:', error)
      alert('Network error: Please check if the backend server is running')
    } finally {
      setIsSubmitting(false)
    }
  }

  const customHeader = (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between w-full space-y-4 sm:space-y-0">
      <div className="flex flex-col sm:flex-row sm:items-center space-y-3 sm:space-y-0 sm:space-x-4">
        <Link href="/dashboard">
          <Button variant="outline" size="sm" className="w-fit">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
        </Link>
        <div className="border-l border-gray-300 pl-4 hidden sm:block"></div>
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Create New Expert</h1>
          <p className="text-gray-600 mt-1 text-sm sm:text-base">Build your AI-powered digital mind</p>
        </div>
      </div>
    </div>
  )

  return (
    <DashboardLayout customHeader={customHeader} hideDefaultHeader={true}>
      <div className="space-y-8">

        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column - Main Form */}
            <div className="lg:col-span-2 space-y-8">
              {/* Basic Information */}
              <Card className="shadow-sm hover:shadow-md transition-shadow duration-200">
                <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-100">
                  <CardTitle className="flex items-center text-lg">
                    <User className="h-5 w-5 mr-2 text-blue-600" />
                    Basic Information
                  </CardTitle>
                  <CardDescription className="text-blue-700">
                    Define your expert's identity and purpose
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6 p-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-800 mb-3">
                      Expert Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 text-gray-900 placeholder-gray-500 hover:border-gray-300"
                      placeholder="e.g., Dr. Sarah Johnson"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-semibold text-gray-800 mb-3">
                      Description
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      rows={4}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 text-gray-900 placeholder-gray-500 hover:border-gray-300 resize-none"
                      placeholder="Brief description of your expert's expertise and personality..."
                    />
                  </div>
                </CardContent>
              </Card>

              {/* First Message */}
              <Card className="shadow-sm hover:shadow-md transition-shadow duration-200">
                <CardHeader className="bg-gradient-to-r from-orange-50 to-amber-50 border-b border-orange-100">
                  <CardTitle className="flex items-center text-lg">
                    <Play className="h-5 w-5 mr-2 text-orange-600" />
                    First Message
                  </CardTitle>
                  <CardDescription className="text-orange-700">
                    The initial greeting message your expert will send to users
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-6">
                  <textarea
                    value={formData.firstMessage}
                    onChange={(e) => setFormData(prev => ({ ...prev, firstMessage: e.target.value }))}
                    rows={3}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all duration-200 text-gray-900 placeholder-gray-500 hover:border-gray-300 resize-none"
                    placeholder="Hello! I'm your expert assistant. How can I help you today?"
                  />
                  <div className="mt-3 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                    <p className="text-sm text-orange-800 font-medium mb-1">💬 Tip:</p>
                    <p className="text-xs text-orange-700">
                      This message will be the first thing users see when they start a conversation. Make it welcoming and informative.
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* System Prompt */}
              <Card className="shadow-sm hover:shadow-md transition-shadow duration-200">
                <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 border-b border-green-100">
                  <CardTitle className="flex items-center text-lg">
                    <FileText className="h-5 w-5 mr-2 text-green-600" />
                    System Prompt
                  </CardTitle>
                  <CardDescription className="text-green-700">
                    Define how your expert should behave and respond
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-6">
                  <textarea
                    value={formData.systemPrompt}
                    onChange={(e) => setFormData(prev => ({ ...prev, systemPrompt: e.target.value }))}
                    rows={10}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200 text-gray-900 placeholder-gray-500 hover:border-gray-300 resize-none font-mono text-sm"
                    placeholder="You are an expert in... Your role is to... You should respond in a... When users ask about..."
                  />
                  <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-sm text-green-800 font-medium mb-1">💡 Pro Tip:</p>
                    <p className="text-xs text-green-700">
                      Be specific about your expert's knowledge domain, communication style, and response format. Include examples of how they should handle different types of questions.
                    </p>
                  </div>
                </CardContent>
              </Card>



              {/* Voice Selection */}
              <Card className="shadow-sm hover:shadow-md transition-shadow duration-200">
                <CardHeader className="bg-gradient-to-r from-purple-50 to-violet-50 border-b border-purple-100">
                  <CardTitle className="flex items-center text-lg">
                    <Mic className="h-5 w-5 mr-2 text-purple-600" />
                    Voice Selection
                  </CardTitle>
                  <CardDescription className="text-purple-700">
                    Choose a voice for your expert from ElevenLabs
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6 p-6">
                  {loadingVoices ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                      <span className="ml-2 text-gray-600">Loading voices...</span>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {/* Voice Dropdown */}
                      <div>
                        <label className="block text-sm font-semibold text-gray-800 mb-3">
                          Select Voice *
                        </label>
                        <select
                          value={formData.selectedVoice}
                          onChange={(e) => setFormData(prev => ({ ...prev, selectedVoice: e.target.value }))}
                          className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200 text-gray-900 hover:border-gray-300 bg-white"
                          required
                        >
                          <option value="" className="text-gray-500">Choose a voice...</option>
                          {voices.map((voice) => (
                            <option key={voice.id} value={voice.id} className="text-gray-900">
                              {voice.name} ({voice.gender}, {voice.age}, {voice.accent})
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Selected Voice Preview */}
                      {formData.selectedVoice && (
                        <div className="border rounded-lg p-4 bg-blue-50 border-blue-200">
                          {(() => {
                            const selectedVoice = voices.find(v => v.id === formData.selectedVoice)
                            return selectedVoice ? (
                              <div>
                                <div className="flex items-center justify-between mb-3">
                                  <h4 className="font-medium text-blue-900">Selected Voice: {selectedVoice.name}</h4>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => playVoicePreview(selectedVoice.id, selectedVoice.preview_url)}
                                    className="h-8 px-3"
                                  >
                                    {playingVoice === selectedVoice.id ? (
                                      <>
                                        <Pause className="h-3 w-3 mr-1" />
                                        Stop
                                      </>
                                    ) : (
                                      <>
                                        <Play className="h-3 w-3 mr-1" />
                                        Preview
                                      </>
                                    )}
                                  </Button>
                                </div>
                                <div className="grid grid-cols-2 gap-4 text-sm text-blue-800">
                                  <div>
                                    <span className="font-medium">Gender:</span> {selectedVoice.gender}
                                  </div>
                                  <div>
                                    <span className="font-medium">Age:</span> {selectedVoice.age}
                                  </div>
                                  <div>
                                    <span className="font-medium">Accent:</span> {selectedVoice.accent}
                                  </div>
                                  <div>
                                    <span className="font-medium">Category:</span> {selectedVoice.category}
                                  </div>
                                </div>
                                {selectedVoice.description && (
                                  <div className="mt-2 text-sm text-blue-800">
                                    <span className="font-medium">Description:</span> {selectedVoice.description}
                                  </div>
                                )}
                              </div>
                            ) : null
                          })()}
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Right Column - Avatar & Files */}
            <div className="space-y-8">
              {/* Avatar Upload */}
              <Card className="shadow-sm hover:shadow-md transition-shadow duration-200">
                <CardHeader className="bg-gradient-to-r from-orange-50 to-amber-50 border-b border-orange-100">
                  <CardTitle className="flex items-center text-lg">
                    <ImageIcon className="h-5 w-5 mr-2 text-orange-600" />
                    Avatar
                  </CardTitle>
                  <CardDescription className="text-orange-700">
                    Upload a profile picture for your expert
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="space-y-6">
                    {avatarPreview ? (
                      <div className="relative">
                        <img
                          src={avatarPreview}
                          alt="Avatar preview"
                          className="w-32 h-32 rounded-full object-cover mx-auto border-4 border-gray-200"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setAvatarPreview(null)
                            setFormData(prev => ({ ...prev, avatar: null, avatarBase64: '' }))
                          }}
                          className="absolute top-0 right-0 rounded-full"
                        >
                          ×
                        </Button>
                      </div>
                    ) : (
                      <div className="w-32 h-32 rounded-full bg-gradient-to-br from-orange-100 to-amber-100 flex items-center justify-center mx-auto border-2 border-dashed border-orange-300 hover:border-orange-400 transition-colors duration-200">
                        <Upload className="h-8 w-8 text-orange-500" />
                      </div>
                    )}
                    
                    <div className="text-center">
                      <label className="cursor-pointer">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleAvatarUpload}
                          className="hidden"
                        />
                        <Button type="button" variant="outline" size="sm" className="bg-orange-50 border-orange-200 text-orange-700 hover:bg-orange-100 hover:border-orange-300" asChild>
                          <span>
                            <Upload className="h-4 w-4 mr-2" />
                            {avatarPreview ? 'Change Avatar' : 'Upload Avatar'}
                          </span>
                        </Button>
                      </label>
                    </div>
                    
                    <div className="text-center p-2 bg-orange-50 rounded-lg border border-orange-100">
                      <p className="text-xs text-orange-700 font-medium">
                        📸 Recommended: 400x400px, JPG or PNG
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Files List */}
              <Card className="shadow-sm hover:shadow-md transition-shadow duration-200">
                <CardHeader className="bg-gradient-to-r from-indigo-50 to-blue-50 border-b border-indigo-100">
                  <CardTitle className="flex items-center justify-between text-lg">
                    <div className="flex items-center">
                      <FileText className="h-5 w-5 mr-2 text-indigo-600" />
                      Training Files
                    </div>
                    <div className="text-sm text-indigo-600 bg-indigo-100 px-2 py-1 rounded-full">
                      {formData.selectedFiles.length} of {knowledgeBaseFiles.length} selected
                    </div>
                  </CardTitle>
                  <CardDescription className="text-indigo-700">
                    Select files that will train your expert
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-6">
                  {/* Select All Button */}
                  <div className="mb-4 pb-3 border-b border-gray-200">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleSelectAllFiles}
                      className="text-xs"
                    >
                      {formData.selectedFiles.length === knowledgeBaseFiles.length ? 'Deselect All' : 'Select All'}
                    </Button>
                  </div>

                  {/* Loading State */}
                  {loadingFiles ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                      <span className="ml-2 text-gray-600">Loading files...</span>
                    </div>
                  ) : filesError ? (
                    <div className="text-center py-8">
                      <p className="text-red-600 mb-4">{filesError}</p>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={fetchKnowledgeBaseFiles}
                      >
                        Retry
                      </Button>
                    </div>
                  ) : knowledgeBaseFiles.length === 0 ? (
                    <div className="text-center py-8">
                      <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-600 mb-4">No files uploaded yet</p>
                      <p className="text-sm text-gray-500 mb-4">
                        Upload files to your knowledge base to train your expert
                      </p>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => window.open('/dashboard/knowledge-base', '_blank')}
                      >
                        Go to Knowledge Base
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-80 overflow-y-auto">
                      {knowledgeBaseFiles.map((file: KnowledgeBaseFile) => (
                        <div
                          key={file.id}
                          className={`p-3 rounded-lg border-2 transition-all cursor-pointer ${
                            formData.selectedFiles.includes(file.id)
                              ? 'bg-blue-50 border-blue-200'
                              : 'bg-gray-50 border-gray-200 hover:border-gray-300'
                          }`}
                          onClick={() => handleFileSelection(file.id)}
                        >
                          <div className="flex items-start space-x-3">
                            {/* Checkbox */}
                            <div className="flex items-center pt-1">
                              <input
                                type="checkbox"
                                checked={formData.selectedFiles.includes(file.id)}
                                onChange={() => handleFileSelection(file.id)}
                                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                onClick={(e) => e.stopPropagation()}
                              />
                            </div>
                            
                            {/* File Icon */}
                            <div className={`w-8 h-8 rounded flex items-center justify-center flex-shrink-0 ${
                              formData.selectedFiles.includes(file.id)
                                ? 'bg-blue-100'
                                : 'bg-gray-100'
                            }`}>
                              <FileText className={`h-4 w-4 ${
                                formData.selectedFiles.includes(file.id)
                                  ? 'text-blue-600'
                                  : 'text-gray-600'
                              }`} />
                            </div>
                            
                            {/* File Info */}
                            <div className="flex-1 min-w-0">
                              <p className={`text-sm font-medium mb-1 break-words ${
                                formData.selectedFiles.includes(file.id)
                                  ? 'text-blue-900'
                                  : 'text-gray-900'
                              }`} title={file.name}>
                                {file.name}
                              </p>
                              <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
                                <span className="bg-gray-200 px-2 py-1 rounded">
                                  {file.document_type || file.type}
                                </span>
                                <span>{formatFileSize(file.size)}</span>
                                {file.word_count && (
                                  <span>{file.word_count} words</span>
                                )}
                                {file.processing_status === 'completed' && (
                                  <span className="px-2 py-1 rounded bg-green-100 text-green-800">
                                    Ready
                                  </span>
                                )}
                              </div>
                              <div className="text-xs text-gray-400 mt-1">
                                Uploaded: {formatDate(file.created_at)}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {/* Selected Files Summary */}
                  {formData.selectedFiles.length > 0 && (
                    <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                      <p className="text-sm font-medium text-blue-800 mb-1">
                        Selected Files ({formData.selectedFiles.length})
                      </p>
                      <p className="text-xs text-blue-600">
                        These files will be available to your expert for answering questions.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Submit Button */}
              <div className="flex justify-end">
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-8 py-3 rounded-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Creating Expert...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Create Expert
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </form>
      </div>

      {/* Success Dialog */}
      <Dialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center text-green-600">
              <CheckCircle className="h-5 w-5 mr-2" />
              Expert Created Successfully!
            </DialogTitle>
            <DialogDescription>
              Your expert "{successData?.expertName}" has been created and is ready to use.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Agent ID:</span>
                <div className="flex items-center space-x-2">
                  <code className="text-xs bg-white px-2 py-1 rounded border">
                    {successData?.agentId}
                  </code>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (successData?.agentId) {
                        navigator.clipboard.writeText(successData.agentId)
                      }
                    }}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </div>
            {successData?.avatarUploaded && (
              <p className="text-sm text-green-600">✓ Avatar uploaded successfully</p>
            )}
          </div>
          <DialogFooter>
            <Button
              onClick={() => {
                setShowSuccessDialog(false)
                router.push('/dashboard')
              }}
              className="w-full"
            >
              Go to Dashboard
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  )
}

export default CreateExpertPage