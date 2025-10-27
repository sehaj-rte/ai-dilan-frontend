'use client'

import React, { useState, useRef, useEffect } from 'react'
import { Upload, X, Loader2, CheckCircle, FileAudio } from 'lucide-react'
import { API_URL } from '@/lib/config'
import { fetchWithAuth } from '@/lib/api-client'

interface AudioFileUploaderProps {
  userId: string
  expertId?: string
  expertName?: string
  onSuccess?: () => void
}

interface AudioFile {
  id: string
  file: File
  url: string
}

export default function AudioFileUploader({ userId, expertId, expertName, onSuccess }: AudioFileUploaderProps) {
  const [audioFiles, setAudioFiles] = useState<AudioFile[]>([])
  const [voiceName, setVoiceName] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Set default voice name from expert name
  useEffect(() => {
    if (expertName && !voiceName) {
      setVoiceName(`${expertName} Voice Clone`)
    }
  }, [expertName, voiceName])

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    const files = Array.from(e.dataTransfer.files)
    handleFiles(files)
  }

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files)
      handleFiles(files)
    }
  }

  const handleFiles = (files: File[]) => {
    const audioFiles = files.filter(file => file.type.startsWith('audio/'))
    
    if (audioFiles.length !== files.length) {
      alert('Only audio files are allowed')
    }

    const newAudioFiles: AudioFile[] = audioFiles.map(file => ({
      id: Date.now().toString() + Math.random(),
      file,
      url: URL.createObjectURL(file)
    }))

    setAudioFiles(prev => [...prev, ...newAudioFiles])
  }

  const removeFile = (id: string) => {
    setAudioFiles(prev => prev.filter(f => f.id !== id))
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  const handleCreateVoiceClone = async () => {
    if (!voiceName.trim()) {
      alert('Please enter a voice name')
      return
    }

    if (audioFiles.length === 0) {
      alert('Please upload at least one audio file')
      return
    }

    setLoading(true)
    setSuccess(false)

    try {
      // Upload each file
      for (const audioFile of audioFiles) {
        const formData = new FormData()
        formData.append('file', audioFile.file)
        formData.append('user_id', userId)
        formData.append('expert_id', expertId || '')
        formData.append('name', voiceName)
        formData.append('description', 'Voice clone from uploaded file')

        const response = await fetchWithAuth(`${API_URL}/voice-clone/samples/upload`, {
          method: 'POST',
          body: formData
        })

        const data = await response.json()
        if (!data.success) {
          throw new Error(data.error || 'Failed to upload file')
        }
      }

      // Don't automatically create voice clone - let user do it manually
      // This allows creating multiple voices from different sample sets
      
      setSuccess(true)
      setVoiceName('')
      setAudioFiles([])
      
      setTimeout(() => {
        setSuccess(false)
        onSuccess?.()
      }, 2000)

    } catch (error: any) {
      console.error('Error creating voice clone:', error)
      alert(error.message || 'Failed to create voice clone')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Expert Info (if provided) */}
      {expertName && (
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-gray-600">Creating voice for:</p>
          <p className="text-lg font-semibold text-blue-900">{expertName}</p>
        </div>
      )}

      {/* Voice Name Input */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Voice Name *
        </label>
        <input
          type="text"
          value={voiceName}
          onChange={(e) => setVoiceName(e.target.value)}
          placeholder="e.g., My Voice, Professional Voice"
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* Drag & Drop Area */}
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all ${
          dragActive
            ? 'border-blue-500 bg-blue-50'
            : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'
        }`}
      >
        <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
        <p className="text-gray-700 font-medium mb-1">
          Drop audio files here or click to browse
        </p>
        <p className="text-sm text-gray-500">
          Supports MP3, WAV, M4A, OGG, WebM (Max 10MB per file)
        </p>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="audio/*"
          onChange={handleFileInput}
          className="hidden"
        />
      </div>

      {/* File List */}
      {audioFiles.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-semibold text-gray-900">
            Uploaded Files ({audioFiles.length})
          </h3>
          {audioFiles.map((audioFile) => (
            <div
              key={audioFile.id}
              className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
            >
              <FileAudio className="w-5 h-5 text-blue-600 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {audioFile.file.name}
                </p>
                <p className="text-xs text-gray-500">
                  {formatFileSize(audioFile.file.size)}
                </p>
              </div>
              <audio src={audioFile.url} controls className="h-8" />
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  removeFile(audioFile.id)
                }}
                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Create Button */}
      <button
        onClick={handleCreateVoiceClone}
        disabled={loading || !voiceName.trim() || audioFiles.length === 0}
        className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Creating Voice Clone...
          </>
        ) : success ? (
          <>
            <CheckCircle className="w-5 h-5" />
            Voice Clone Created!
          </>
        ) : (
          <>Create Voice Clone ({audioFiles.length} file{audioFiles.length !== 1 ? 's' : ''})</>
        )}
      </button>
    </div>
  )
}
