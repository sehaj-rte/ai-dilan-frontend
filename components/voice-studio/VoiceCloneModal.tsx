'use client'

import React, { useState, useRef, useEffect } from 'react'
import { X, Upload, Loader2, Mic2, Globe, Users, FileAudio, AlertCircle } from 'lucide-react'
import { API_URL } from '@/lib/config'
import { getAuthHeadersForFormData } from '@/lib/api-client'

interface VoiceCloneModalProps {
  isOpen: boolean
  onClose: () => void
  projectId: string
  onSuccess: () => void
}

const LANGUAGES = [
  'English', 'Spanish', 'French', 'German', 'Italian', 
  'Portuguese', 'Hindi', 'Japanese', 'Korean', 'Chinese'
]

const ACCENTS = [
  'American', 'British', 'Australian', 'Canadian', 
  'Irish', 'Scottish', 'Neutral'
]

export default function VoiceCloneModal({ isOpen, onClose, projectId, onSuccess }: VoiceCloneModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    language: 'English',
    accent: 'American',
    description: ''
  })
  const [audioFiles, setAudioFiles] = useState<File[]>([])
  const [isCreating, setIsCreating] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Auto-dismiss error message after 5 seconds
  useEffect(() => {
    if (errorMessage) {
      const timer = setTimeout(() => {
        setErrorMessage(null)
      }, 5000)
      return () => clearTimeout(timer)
    }
  }, [errorMessage])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleFileSelect = (files: FileList | null) => {
    if (!files) return
    
    const validFiles = Array.from(files).filter(file => {
      const validTypes = ['audio/mpeg', 'audio/wav', 'audio/webm', 'audio/ogg', 'audio/m4a', 'audio/mp3']
      return validTypes.includes(file.type) || file.name.toLowerCase().match(/\.(mp3|wav|webm|ogg|m4a)$/)
    })
    
    setAudioFiles(prev => [...prev, ...validFiles])
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragActive(false)
    handleFileSelect(e.dataTransfer.files)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setDragActive(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setDragActive(false)
  }

  const removeFile = (index: number) => {
    setAudioFiles(prev => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Clear previous errors
    setErrorMessage(null)
    
    if (!formData.name.trim()) {
      setErrorMessage('Please enter a voice name')
      return
    }
    
    if (audioFiles.length === 0) {
      setErrorMessage('Please upload at least one audio file')
      return
    }

    setIsCreating(true)

    try {
      const formDataToSend = new FormData()
      formDataToSend.append('name', formData.name)
      formDataToSend.append('expert_id', projectId)
      formDataToSend.append('language', formData.language)
      formDataToSend.append('accent', formData.accent)
      if (formData.description) {
        formDataToSend.append('description', formData.description)
      }

      audioFiles.forEach((file, index) => {
        formDataToSend.append('files', file)
      })

      const response = await fetch(`${API_URL}/voice-clone/create`, {
        method: 'POST',
        headers: getAuthHeadersForFormData(),
        body: formDataToSend,
      })

      if (response.ok) {
        // Reset form
        setFormData({ name: '', language: 'English', accent: 'American', description: '' })
        setAudioFiles([])
        onSuccess()
        onClose()
      } else {
        const errorData = await response.json()
        throw new Error(errorData.detail || 'Failed to create voice clone')
      }
    } catch (error) {
      console.error('Error creating voice clone:', error)
      setErrorMessage(`Failed to create voice clone: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsCreating(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      {/* Error Toast */}
      {errorMessage && (
        <div className="fixed top-4 right-4 z-[60] bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg flex items-center space-x-2 animate-in slide-in-from-right duration-300">
          <AlertCircle className="w-5 h-5" />
          <span>{errorMessage}</span>
          <button
            onClick={() => setErrorMessage(null)}
            className="ml-2 hover:bg-red-600 rounded p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
      
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Mic2 className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Create Voice Clone</h2>
              <p className="text-sm text-gray-600">Generate a custom voice for your expert</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            disabled={isCreating}
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Voice Information */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2 mb-4">
              <Users className="w-5 h-5 text-gray-600" />
              <h3 className="text-lg font-medium text-gray-900">Voice Information</h3>
            </div>

            {/* Name */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                Voice Name *
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="Enter a name for this voice clone"
                required
              />
            </div>

            {/* Language and Accent */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="language" className="block text-sm font-medium text-gray-700 mb-2">
                  <Globe className="w-4 h-4 inline mr-1" />
                  Language
                </label>
                <select
                  id="language"
                  name="language"
                  value={formData.language}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  {LANGUAGES.map(lang => (
                    <option key={lang} value={lang}>{lang}</option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="accent" className="block text-sm font-medium text-gray-700 mb-2">
                  Accent/Style
                </label>
                <select
                  id="accent"
                  name="accent"
                  value={formData.accent}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  {ACCENTS.map(accent => (
                    <option key={accent} value={accent}>{accent}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Description */}
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                Description (Optional)
              </label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                placeholder="Describe the voice characteristics, tone, or style..."
              />
            </div>
          </div>

          {/* Audio Upload */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2 mb-4">
              <FileAudio className="w-5 h-5 text-gray-600" />
              <h3 className="text-lg font-medium text-gray-900">Upload Audio Files</h3>
            </div>

            {/* Upload Area */}
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                dragActive
                  ? 'border-purple-500 bg-purple-50'
                  : 'border-gray-300 hover:border-purple-400 hover:bg-gray-50'
              }`}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
            >
              <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-lg font-medium text-gray-900 mb-2">
                Click to upload or drag and drop
              </p>
              <p className="text-sm text-gray-600 mb-4">
                MP3, WAV, WebM, OGG, M4A (Multiple files recommended)
              </p>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
              >
                Select Files
              </button>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="audio/*,.mp3,.wav,.webm,.ogg,.m4a"
                onChange={(e) => handleFileSelect(e.target.files)}
                className="hidden"
              />
            </div>

            {/* Selected Files */}
            {audioFiles.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-gray-700">
                  Selected Files ({audioFiles.length})
                </h4>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {audioFiles.map((file, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-2">
                        <FileAudio className="w-4 h-4 text-purple-600" />
                        <span className="text-sm text-gray-700 truncate">{file.name}</span>
                        <span className="text-xs text-gray-500">
                          ({(file.size / 1024 / 1024).toFixed(1)} MB)
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeFile(index)}
                        className="p-1 hover:bg-gray-200 rounded transition-colors"
                      >
                        <X className="w-4 h-4 text-gray-500" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tips */}
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
              <h4 className="text-sm font-semibold text-blue-900 mb-2">💡 Tips for Best Results</h4>
              <ul className="space-y-1 text-sm text-blue-800">
                <li>• Upload 2-5 high-quality audio samples</li>
                <li>• Each sample should be at least 30 seconds long</li>
                <li>• Use clear audio without background noise</li>
                <li>• All samples should be from the same person</li>
              </ul>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              disabled={isCreating}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isCreating || !formData.name.trim() || audioFiles.length === 0}
              className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              {isCreating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Creating...</span>
                </>
              ) : (
                <>
                  <Mic2 className="w-4 h-4" />
                  <span>Create Voice Clone</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
