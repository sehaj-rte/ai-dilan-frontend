'use client'

import React, { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import FolderSelector from './FolderSelector'
import { fetchWithAuth, getAuthHeadersForFormData } from '@/lib/api-client'
import { 
  Upload, 
  FileAudio,
  Trash2, 
  Loader2,
  CheckCircle,
  AlertCircle,
  Plus,
  Play,
  Pause
} from 'lucide-react'
import { API_URL } from '@/lib/config'

interface AudioFileUploaderProps {
  onTranscriptionComplete?: (result: any) => void
  defaultFolder?: string
  hideFolderSelector?: boolean
}

interface SelectedAudioFile extends File {
  id: string
  isValid: boolean
  errorMessage?: string
  audioUrl?: string
}

const AudioFileUploader: React.FC<AudioFileUploaderProps> = ({ 
  onTranscriptionComplete, 
  defaultFolder, 
  hideFolderSelector = false 
}) => {
  const [selectedFiles, setSelectedFiles] = useState<SelectedAudioFile[]>([])
  const [dragActive, setDragActive] = useState(false)
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [transcriptionResults, setTranscriptionResults] = useState<any[]>([])
  const [error, setError] = useState<string | null>(null)
  const [selectedFolder, setSelectedFolder] = useState<string>(defaultFolder || 'Uncategorized')
  const [playingFileId, setPlayingFileId] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const audioRefs = useRef<{ [key: string]: HTMLAudioElement }>({})
  
  const SUPPORTED_FORMATS = ['mp3', 'wav', 'ogg', 'm4a', 'webm', 'flac', 'aac']

  const validateAudioFile = (file: File): { isValid: boolean; errorMessage?: string } => {
    // Check if file is empty
    if (file.size === 0) {
      return {
        isValid: false,
        errorMessage: 'File is empty'
      }
    }

    // Check file format
    const fileExtension = file.name.split('.').pop()?.toLowerCase()
    if (!fileExtension || !SUPPORTED_FORMATS.includes(fileExtension)) {
      return {
        isValid: false,
        errorMessage: `Unsupported format. Supported: ${SUPPORTED_FORMATS.join(', ')}`
      }
    }

    // Check MIME type
    if (!file.type.startsWith('audio/')) {
      return {
        isValid: false,
        errorMessage: 'File is not a valid audio file'
      }
    }

    return { isValid: true }
  }

  const handleFileSelection = (files: FileList) => {
    if (!files || files.length === 0) return

    const filesArray = Array.from(files)
    const audioFiles: SelectedAudioFile[] = []

    filesArray.forEach((file, index) => {
      const validation = validateAudioFile(file)
      const fileId = `${file.name}_${Date.now()}_${index}`
      
      const audioFile: SelectedAudioFile = Object.assign(file, {
        id: fileId,
        isValid: validation.isValid,
        errorMessage: validation.errorMessage,
        audioUrl: validation.isValid ? URL.createObjectURL(file) : undefined
      })

      audioFiles.push(audioFile)
    })

    setSelectedFiles(prev => [...prev, ...audioFiles])
    setError(null)
  }

  const removeFile = (fileId: string) => {
    setSelectedFiles(prev => {
      const fileToRemove = prev.find(f => f.id === fileId)
      if (fileToRemove?.audioUrl) {
        URL.revokeObjectURL(fileToRemove.audioUrl)
      }
      return prev.filter(f => f.id !== fileId)
    })
    
    // Stop playing if this file was playing
    if (playingFileId === fileId) {
      setPlayingFileId(null)
    }
  }

  const playAudio = (fileId: string) => {
    const file = selectedFiles.find(f => f.id === fileId)
    if (!file?.audioUrl) return

    // Stop currently playing audio
    if (playingFileId && audioRefs.current[playingFileId]) {
      audioRefs.current[playingFileId].pause()
      audioRefs.current[playingFileId].currentTime = 0
    }

    if (playingFileId === fileId) {
      // If clicking the same file, stop it
      setPlayingFileId(null)
    } else {
      // Play the new file
      if (audioRefs.current[fileId]) {
        audioRefs.current[fileId].play()
        setPlayingFileId(fileId)
      }
    }
  }

  const handleAudioEnded = (fileId: string) => {
    setPlayingFileId(null)
  }

  const getValidFiles = () => {
    return selectedFiles.filter(file => file.isValid)
  }

  const getInvalidFiles = () => {
    return selectedFiles.filter(file => !file.isValid)
  }

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
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelection(e.dataTransfer.files)
    }
  }

  const transcribeFiles = async () => {
    const validFiles = getValidFiles()
    if (validFiles.length === 0) return

    setIsTranscribing(true)
    setError(null)
    setTranscriptionResults([])

    const results: any[] = []

    try {
      for (const file of validFiles) {
        const formData = new FormData()
        formData.append('file', file)
        formData.append('folder_id', selectedFolder)
        
        // Use original filename without the ID prefix
        const originalName = file.name
        formData.append('custom_name', originalName.split('.')[0])

        const response = await fetchWithAuth(`${API_URL}/knowledge-base/transcribe-audio`, {
          method: 'POST',
          headers: getAuthHeadersForFormData(),
          body: formData,
        })

        const result = await response.json()

        if (result.success) {
          results.push(result)
        } else {
          throw new Error(`Failed to transcribe ${file.name}: ${result.error}`)
        }
      }

      setTranscriptionResults(results)
      
      // Call callback if provided
      if (onTranscriptionComplete) {
        onTranscriptionComplete(results)
      }

      // Clear selected files after successful transcription
      selectedFiles.forEach(file => {
        if (file.audioUrl) {
          URL.revokeObjectURL(file.audioUrl)
        }
      })
      setSelectedFiles([])
      
    } catch (err) {
      console.error('Transcription error:', err)
      setError(err instanceof Error ? err.message : 'Failed to transcribe audio files. Please try again.')
    } finally {
      setIsTranscribing(false)
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const formatDuration = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const audio = new Audio(URL.createObjectURL(file))
      audio.addEventListener('loadedmetadata', () => {
        const duration = audio.duration
        const minutes = Math.floor(duration / 60)
        const seconds = Math.floor(duration % 60)
        resolve(`${minutes}:${seconds.toString().padStart(2, '0')}`)
        URL.revokeObjectURL(audio.src)
      })
      audio.addEventListener('error', () => {
        resolve('--:--')
        URL.revokeObjectURL(audio.src)
      })
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <FileAudio className="h-5 w-5 mr-2" />
          Upload Audio Files
        </CardTitle>
        <CardDescription>
          Upload audio files and transcribe them using AI. Supports MP3, WAV, OGG, M4A, WebM, FLAC, AAC formats.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Folder Selection */}
        {!hideFolderSelector && (
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Save to Folder</label>
            <FolderSelector value={selectedFolder} onChange={setSelectedFolder} />
          </div>
        )}

        {/* File Selection Area */}
        {selectedFiles.length === 0 ? (
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              dragActive 
                ? 'border-blue-500 bg-blue-50' 
                : 'border-gray-300 hover:border-gray-400 bg-gray-50'
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <div className="flex flex-col items-center justify-center">
              <div className="w-16 h-16 rounded-full bg-orange-100 flex items-center justify-center mb-4">
                <FileAudio className="h-8 w-8 text-orange-600" />
              </div>
              <p className="text-gray-700 mb-1">
                Drag and drop audio files here or{' '}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="text-blue-600 hover:underline font-medium"
                >
                  click here to browse
                </button>
              </p>
              <p className="text-sm text-gray-500 mt-2">
                Supports: MP3, WAV, OGG, M4A, WebM, FLAC, AAC
              </p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={(e) => e.target.files && handleFileSelection(e.target.files)}
              accept=".mp3,.wav,.ogg,.m4a,.webm,.flac,.aac,audio/*"
            />
          </div>
        ) : (
          <div className="space-y-4">
            {/* Selected Files List */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">
                  Selected Files ({selectedFiles.length})
                </label>
                {getValidFiles().length > 0 && (
                  <span className="text-xs text-green-600 font-medium">
                    {getValidFiles().length} ready to transcribe
                  </span>
                )}
              </div>
              
              {/* File List */}
              <div className="border rounded-lg divide-y max-h-64 overflow-y-auto">
                {selectedFiles.map((file) => (
                  <div key={file.id} className={`p-3 flex items-center justify-between ${
                    file.isValid ? 'bg-white' : 'bg-red-50'
                  }`}>
                    <div className="flex items-center space-x-3 flex-1 min-w-0">
                      {file.isValid ? (
                        <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                      ) : (
                        <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
                      )}
                      <FileAudio className="h-5 w-5 text-orange-500 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p 
                          title={file.name}
                          className={`text-sm font-medium truncate ${
                            file.isValid ? 'text-gray-900' : 'text-red-900'
                          }`}
                        >
                          {file.name.length > 40 ? `${file.name.substring(0, 37)}...` : file.name}
                        </p>
                        <p className={`text-xs ${
                          file.isValid ? 'text-gray-500' : 'text-red-600'
                        }`}>
                          {file.errorMessage || formatFileSize(file.size)}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2 ml-2">
                      {/* Play Button for Valid Files */}
                      {file.isValid && file.audioUrl && (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => playAudio(file.id)}
                            className="flex-shrink-0"
                          >
                            {playingFileId === file.id ? (
                              <Pause className="h-4 w-4 text-blue-600" />
                            ) : (
                              <Play className="h-4 w-4 text-blue-600" />
                            )}
                          </Button>
                          <audio
                            ref={(el) => {
                              if (el) audioRefs.current[file.id] = el
                            }}
                            src={file.audioUrl}
                            onEnded={() => handleAudioEnded(file.id)}
                            className="hidden"
                          />
                        </>
                      )}
                      
                      {/* Remove Button */}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFile(file.id)}
                        className="flex-shrink-0"
                      >
                        <Trash2 className="h-4 w-4 text-gray-400 hover:text-red-500" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Add More Files Button */}
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                className="w-full"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add More Audio Files
              </Button>
              
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={(e) => e.target.files && handleFileSelection(e.target.files)}
                accept=".mp3,.wav,.ogg,.m4a,.webm,.flac,.aac,audio/*"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex justify-between items-center">
              <div>
                {getInvalidFiles().length > 0 && (
                  <p className="text-xs text-red-600 flex items-center">
                    <AlertCircle className="h-3 w-3 mr-1" />
                    {getInvalidFiles().length} file(s) will be skipped due to validation errors
                  </p>
                )}
              </div>
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    selectedFiles.forEach(file => {
                      if (file.audioUrl) {
                        URL.revokeObjectURL(file.audioUrl)
                      }
                    })
                    setSelectedFiles([])
                    setTranscriptionResults([])
                    setError(null)
                  }}
                >
                  Clear All
                </Button>
                <Button 
                  onClick={transcribeFiles} 
                  disabled={getValidFiles().length === 0 || isTranscribing}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {isTranscribing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Transcribing...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      Transcribe {getValidFiles().length > 0 && `(${getValidFiles().length})`}
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="flex items-center space-x-2 p-3 bg-red-50 border border-red-200 rounded-lg">
            <AlertCircle className="h-5 w-5 text-red-600" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Transcription Progress */}
        {isTranscribing && (
          <div className="space-y-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center space-x-3">
              <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />
              <div className="flex-1">
                <p className="text-sm font-medium text-blue-900">
                  Transcribing audio files...
                </p>
                <p className="text-xs text-blue-700">
                  Processing {getValidFiles().length} file(s) with ElevenLabs AI
                </p>
              </div>
            </div>
            <div className="w-full bg-blue-200 rounded-full h-2">
              <div className="bg-blue-600 h-2 rounded-full animate-pulse" style={{ width: '100%' }} />
            </div>
          </div>
        )}

        {/* Transcription Results */}
        {transcriptionResults.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-medium text-green-900 flex items-center">
              <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
              Transcription Complete! ({transcriptionResults.length} files)
            </h4>
            
            {transcriptionResults.map((result, index) => (
              <div key={index} className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">File:</span>
                    <span className="font-medium text-blue-600">{result.file.name}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Word Count:</span>
                    <span className="font-medium">{result.transcription.word_count}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Language:</span>
                    <span className="font-medium">{result.transcription.language}</span>
                  </div>
                </div>

                <div className="mt-3 p-3 bg-white rounded border border-gray-200">
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">
                    {result.transcription.preview}
                  </p>
                </div>
              </div>
            ))}

            <p className="text-xs text-gray-500">
              All transcriptions have been saved to your knowledge base and can be used by your AI experts.
            </p>
          </div>
        )}

        {/* Info Box */}
        <div className="text-xs text-gray-500 p-3 bg-gray-50 rounded-lg">
          <p><strong>Tips:</strong></p>
          <ul className="list-disc list-inside space-y-1 mt-1">
            <li>Clear audio quality produces better transcription results</li>
            <li>No file size limit</li>
            <li>Supported formats: MP3, WAV, OGG, M4A, WebM, FLAC, AAC</li>
            <li>Transcriptions are powered by ElevenLabs AI</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}

export default AudioFileUploader
