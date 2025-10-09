'use client'

import React, { useState, useEffect } from 'react'
import DashboardLayout from '@/components/dashboard/DashboardLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
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
  Image as ImageIcon
} from 'lucide-react'
import Link from 'next/link'

const ELEVENLABS_API_KEY = "4b757c743f73858a0b19a8947b7742c3c2acbacc947374329ae264bb61d02c2d"

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

interface DemoFile {
  id: string
  name: string
  type: string
  size: string
  uploadDate: string
}

const CreateExpertPage = () => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    systemPrompt: '',
    selectedVoice: '',
    avatar: null as File | null,
    selectedFiles: [] as string[]
  })
  
  const [voices, setVoices] = useState<Voice[]>([])
  const [loadingVoices, setLoadingVoices] = useState(false)
  const [playingVoice, setPlayingVoice] = useState<string | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)

  // Demo files - you mentioned you'll provide real files later
  const demoFiles: DemoFile[] = [
    {
      id: '1',
      name: 'knowledge_base.pdf',
      type: 'PDF',
      size: '2.4 MB',
      uploadDate: '2024-01-15'
    },
    {
      id: '2',
      name: 'training_data.docx',
      type: 'DOCX',
      size: '1.8 MB',
      uploadDate: '2024-01-14'
    },
    {
      id: '3',
      name: 'expert_guidelines.txt',
      type: 'TXT',
      size: '156 KB',
      uploadDate: '2024-01-13'
    },
    {
      id: '4',
      name: 'conversation_examples.json',
      type: 'JSON',
      size: '892 KB',
      uploadDate: '2024-01-12'
    }
  ]

  useEffect(() => {
    fetchVoices()
  }, [])

  const fetchVoices = async () => {
    setLoadingVoices(true)
    try {
      const response = await fetch('http://localhost:8000/voice/elevenlabs-voices')
      const data = await response.json()
      
      if (data.success) {
        setVoices(data.voices)
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
      // Fallback voices
      setVoices([
        { id: 'demo1', name: 'Sarah', gender: 'female', age: 'young', accent: 'american', description: 'Warm and professional', category: 'premade' },
        { id: 'demo2', name: 'Marcus', gender: 'male', age: 'middle_aged', accent: 'british', description: 'Authoritative and clear', category: 'premade' }
      ])
    } finally {
      setLoadingVoices(false)
    }
  }

  const handleAvatarUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setFormData(prev => ({ ...prev, avatar: file }))
      
      // Create preview
      const reader = new FileReader()
      reader.onload = (e) => {
        setAvatarPreview(e.target?.result as string)
      }
      reader.readAsDataURL(file)
    }
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
    const allFileIds = demoFiles.map(file => file.id)
    setFormData(prev => ({
      ...prev,
      selectedFiles: prev.selectedFiles.length === allFileIds.length ? [] : allFileIds
    }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    const payload = {
      name: formData.name,
      description: formData.description,
      systemPrompt: formData.systemPrompt,
      selectedVoice: formData.selectedVoice,
      avatar: formData.avatar ? {
        name: formData.avatar.name,
        size: formData.avatar.size,
        type: formData.avatar.type
      } : null,
      selectedFiles: formData.selectedFiles,
      files: demoFiles.filter(file => formData.selectedFiles.includes(file.id))
    }
    
    console.log('Create Expert Payload:', payload)
    
    // You mentioned you'll tell me what to do with the payload later
    alert('Expert creation payload logged to console!')
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link href="/dashboard">
              <Button variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Create New Expert</h1>
              <p className="text-gray-600 mt-1">Build your AI-powered digital mind</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Main Form */}
            <div className="lg:col-span-2 space-y-6">
              {/* Basic Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <User className="h-5 w-5 mr-2 text-blue-600" />
                    Basic Information
                  </CardTitle>
                  <CardDescription>
                    Define your expert's identity and purpose
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Expert Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="e.g., Dr. Sarah Johnson"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Description
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Brief description of your expert's expertise and personality..."
                    />
                  </div>
                </CardContent>
              </Card>

              {/* System Prompt */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <FileText className="h-5 w-5 mr-2 text-green-600" />
                    System Prompt
                  </CardTitle>
                  <CardDescription>
                    Define how your expert should behave and respond
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <textarea
                    value={formData.systemPrompt}
                    onChange={(e) => setFormData(prev => ({ ...prev, systemPrompt: e.target.value }))}
                    rows={8}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="You are an expert in... Your role is to... You should respond in a... When users ask about..."
                  />
                  <p className="text-xs text-gray-500 mt-2">
                    Tip: Be specific about your expert's knowledge domain, communication style, and response format.
                  </p>
                </CardContent>
              </Card>

              {/* Voice Selection */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Mic className="h-5 w-5 mr-2 text-purple-600" />
                    Voice Selection
                  </CardTitle>
                  <CardDescription>
                    Choose a voice for your expert from ElevenLabs
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {loadingVoices ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                      <span className="ml-2 text-gray-600">Loading voices...</span>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {/* Voice Dropdown */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Select Voice *
                        </label>
                        <select
                          value={formData.selectedVoice}
                          onChange={(e) => setFormData(prev => ({ ...prev, selectedVoice: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          required
                        >
                          <option value="">Choose a voice...</option>
                          {voices.map((voice) => (
                            <option key={voice.id} value={voice.id}>
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
            <div className="space-y-6">
              {/* Avatar Upload */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <ImageIcon className="h-5 w-5 mr-2 text-orange-600" />
                    Avatar
                  </CardTitle>
                  <CardDescription>
                    Upload a profile picture for your expert
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
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
                            setFormData(prev => ({ ...prev, avatar: null }))
                          }}
                          className="absolute top-0 right-0 rounded-full"
                        >
                          ×
                        </Button>
                      </div>
                    ) : (
                      <div className="w-32 h-32 rounded-full bg-gray-100 flex items-center justify-center mx-auto border-2 border-dashed border-gray-300">
                        <Upload className="h-8 w-8 text-gray-400" />
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
                        <Button type="button" variant="outline" size="sm" asChild>
                          <span>
                            <Upload className="h-4 w-4 mr-2" />
                            {avatarPreview ? 'Change Avatar' : 'Upload Avatar'}
                          </span>
                        </Button>
                      </label>
                    </div>
                    
                    <p className="text-xs text-gray-500 text-center">
                      Recommended: 400x400px, JPG or PNG
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Files List */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center">
                      <FileText className="h-5 w-5 mr-2 text-indigo-600" />
                      Training Files
                    </div>
                    <div className="text-sm text-gray-500">
                      {formData.selectedFiles.length} of {demoFiles.length} selected
                    </div>
                  </CardTitle>
                  <CardDescription>
                    Select files that will train your expert
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {/* Select All Button */}
                  <div className="mb-4 pb-3 border-b border-gray-200">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleSelectAllFiles}
                      className="text-xs"
                    >
                      {formData.selectedFiles.length === demoFiles.length ? 'Deselect All' : 'Select All'}
                    </Button>
                  </div>

                  <div className="space-y-3">
                    {demoFiles.map((file) => (
                      <div
                        key={file.id}
                        className={`flex items-center justify-between p-3 rounded-lg border-2 transition-all cursor-pointer ${
                          formData.selectedFiles.includes(file.id)
                            ? 'bg-blue-50 border-blue-200'
                            : 'bg-gray-50 border-gray-200 hover:border-gray-300'
                        }`}
                        onClick={() => handleFileSelection(file.id)}
                      >
                        <div className="flex items-center space-x-3">
                          {/* Checkbox */}
                          <div className="flex items-center">
                            <input
                              type="checkbox"
                              checked={formData.selectedFiles.includes(file.id)}
                              onChange={() => handleFileSelection(file.id)}
                              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                              onClick={(e) => e.stopPropagation()}
                            />
                          </div>
                          
                          {/* File Icon */}
                          <div className={`w-8 h-8 rounded flex items-center justify-center ${
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
                          <div>
                            <p className={`text-sm font-medium ${
                              formData.selectedFiles.includes(file.id)
                                ? 'text-blue-900'
                                : 'text-gray-900'
                            }`}>
                              {file.name}
                            </p>
                            <p className="text-xs text-gray-500">{file.type} • {file.size}</p>
                          </div>
                        </div>
                        
                        {/* Upload Date */}
                        <span className="text-xs text-gray-400">{file.uploadDate}</span>
                      </div>
                    ))}
                  </div>
                  
                  {/* Selected Files Summary */}
                  {formData.selectedFiles.length > 0 && (
                    <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                      <p className="text-sm text-blue-800 font-medium mb-1">
                        Selected Files ({formData.selectedFiles.length})
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {formData.selectedFiles.map((fileId) => {
                          const file = demoFiles.find(f => f.id === fileId)
                          return file ? (
                            <span
                              key={fileId}
                              className="inline-flex items-center px-2 py-1 rounded text-xs bg-blue-100 text-blue-800"
                            >
                              {file.name}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleFileSelection(fileId)
                                }}
                                className="ml-1 text-blue-600 hover:text-blue-800"
                              >
                                ×
                              </button>
                            </span>
                          ) : null
                        })}
                      </div>
                    </div>
                  )}
                  
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <Button type="button" variant="outline" size="sm" className="w-full">
                      <Upload className="h-4 w-4 mr-2" />
                      Add More Files
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
            <Link href="/dashboard">
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </Link>
            <Button type="submit" className="bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700">
              <Save className="h-4 w-4 mr-2" />
              Create Expert
            </Button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  )
}

export default CreateExpertPage
