'use client'

import React, { useState, useRef } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { API_URL } from '@/lib/config'
import { getAuthHeaders } from '@/lib/api-client'
import {
  Upload,
  X,
  Mic,
  Loader2,
  CheckCircle,
  AlertCircle,
  FileAudio,
  Info,
  Sparkles
} from 'lucide-react'

interface PVCTestModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: (voiceId: string, voiceName: string) => void
}

const PVCTestModal: React.FC<PVCTestModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [voiceName, setVoiceName] = useState('')
  const [language, setLanguage] = useState('en')
  const [audioFiles, setAudioFiles] = useState<File[]>([])
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [voiceId, setVoiceId] = useState<string | null>(null)
  const [dragActive, setDragActive] = useState(false)
  const [nextSteps, setNextSteps] = useState<string[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

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
    const audioFiles = files.filter(file => file.type.startsWith('audio/'))
    
    if (audioFiles.length === 0) {
      setError('Please drop audio files only')
      return
    }

    addFiles(audioFiles)
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files)
      addFiles(files)
    }
  }

  const addFiles = (newFiles: File[]) => {
    const currentCount = audioFiles.length
    const availableSlots = 25 - currentCount
    
    if (newFiles.length > availableSlots) {
      setError(`Maximum 25 files allowed. You can add ${availableSlots} more file(s).`)
      return
    }

    setAudioFiles(prev => [...prev, ...newFiles])
    setError(null)
  }

  const removeFile = (index: number) => {
    setAudioFiles(prev => prev.filter((_, i) => i !== index))
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  const handleSubmit = async () => {
    if (!voiceName.trim()) {
      setError('Please enter a name for your voice clone')
      return
    }

    if (audioFiles.length === 0) {
      setError('Please upload at least one audio file')
      return
    }

    setUploading(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.append('name', voiceName.trim())
      formData.append('language', language)
      formData.append('description', `Professional voice clone: ${voiceName}`)
      
      audioFiles.forEach((file) => {
        formData.append('audio_files', file)
      })

      console.log('🚀 Submitting PVC request...')
      
      const response = await fetch(`${API_URL}/pvc/create-complete`, {
        method: 'POST',
        headers: {
          ...getAuthHeaders(),
        },
        body: formData
      })

      const data = await response.json()
      console.log('📊 Response:', data)

      if (data.success) {
        setSuccess(true)
        setVoiceId(data.voice_id)
        setNextSteps(data.next_steps || [])
        
        if (onSuccess) {
          setTimeout(() => {
            onSuccess(data.voice_id, data.name)
          }, 3000)
        }
      } else {
        setError(data.error || 'Failed to create professional voice clone')
      }
    } catch (err: any) {
      console.error('❌ Error creating PVC:', err)
      setError(err.message || 'Failed to create voice clone. Please try again.')
    } finally {
      setUploading(false)
    }
  }

  const handleClose = () => {
    if (!uploading) {
      setVoiceName('')
      setLanguage('en')
      setAudioFiles([])
      setError(null)
      setSuccess(false)
      setVoiceId(null)
      setNextSteps([])
      setUploading(false)
      onClose()
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-600" />
            Professional Voice Clone (Test)
          </DialogTitle>
          <DialogDescription>
            Create a high-quality voice clone using ElevenLabs Professional Voice Cloning
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Success Message */}
          {success && voiceId && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 space-y-3">
              <div className="flex items-center gap-3">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <div>
                  <p className="font-medium text-green-900">Voice clone created successfully!</p>
                  <p className="text-sm text-green-700">Voice ID: <code className="bg-green-100 px-2 py-1 rounded">{voiceId}</code></p>
                </div>
              </div>
              
              {nextSteps.length > 0 && (
                <div className="mt-3 pl-8">
                  <p className="text-sm font-medium text-green-900 mb-2">Next Steps:</p>
                  <ol className="text-sm text-green-800 space-y-1 list-decimal list-inside">
                    {nextSteps.map((step, index) => (
                      <li key={index}>{step}</li>
                    ))}
                  </ol>
                </div>
              )}
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-red-600" />
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {/* Voice Name Input */}
          <div className="space-y-2">
            <Label htmlFor="voiceName">Voice Name *</Label>
            <Input
              id="voiceName"
              placeholder="e.g., My Professional Voice"
              value={voiceName}
              onChange={(e) => setVoiceName(e.target.value)}
              disabled={uploading || success}
            />
          </div>

          {/* Language Selection */}
          <div className="space-y-2">
            <Label htmlFor="language">Language *</Label>
            <select
              id="language"
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              disabled={uploading || success}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="en">English</option>
              <option value="es">Spanish</option>
              <option value="fr">French</option>
              <option value="de">German</option>
              <option value="it">Italian</option>
              <option value="pt">Portuguese</option>
              <option value="pl">Polish</option>
              <option value="hi">Hindi</option>
              <option value="ja">Japanese</option>
              <option value="ko">Korean</option>
              <option value="zh">Chinese</option>
            </select>
          </div>

          {/* File Upload Area */}
          <div className="space-y-2">
            <Label>Audio Samples * (1-25 files)</Label>
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                dragActive
                  ? 'border-purple-500 bg-purple-50'
                  : 'border-gray-300 hover:border-gray-400'
              } ${uploading || success ? 'opacity-50 pointer-events-none' : ''}`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-sm text-gray-600 mb-2">
                Drag and drop audio files here, or
              </p>
              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading || success}
              >
                Browse Files
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="audio/*"
                onChange={handleFileSelect}
                className="hidden"
              />
              <p className="text-xs text-gray-500 mt-4">
                Supported formats: MP3, WAV, WebM, OGG
              </p>
            </div>
          </div>

          {/* File List */}
          {audioFiles.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Uploaded Files ({audioFiles.length}/25)</Label>
                <Badge variant="outline">
                  Total: {formatFileSize(audioFiles.reduce((sum, f) => sum + f.size, 0))}
                </Badge>
              </div>
              <div className="max-h-48 overflow-y-auto space-y-2 border rounded-lg p-3">
                {audioFiles.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-2 bg-gray-50 rounded hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <FileAudio className="h-4 w-4 text-purple-600 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {file.name}
                        </p>
                        <p className="text-xs text-gray-500">
                          {formatFileSize(file.size)}
                        </p>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFile(index)}
                      disabled={uploading || success}
                      className="flex-shrink-0"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Info Box */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="space-y-2">
                <p className="font-medium text-blue-900 text-sm">What happens next:</p>
                <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
                  <li>Voice clone will be created (Steps 1-3)</li>
                  <li>Audio samples will be uploaded</li>
                  <li>Speaker separation will be processed (2-5 minutes)</li>
                  <li>You'll receive a voice_id for verification</li>
                  <li>Complete verification via CAPTCHA (use Swagger UI)</li>
                  <li>Train the voice (10-30 minutes)</li>
                </ol>
                <p className="text-xs text-blue-700 mt-2">
                  💡 Tip: Use high-quality recordings (30 sec - 5 min each) for best results
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={uploading}
          >
            {success ? 'Close' : 'Cancel'}
          </Button>
          {!success && (
            <Button
              onClick={handleSubmit}
              disabled={uploading || !voiceName.trim() || audioFiles.length === 0}
              className="min-w-[140px] bg-purple-600 hover:bg-purple-700"
            >
              {uploading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Create PVC
                </>
              )}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default PVCTestModal
