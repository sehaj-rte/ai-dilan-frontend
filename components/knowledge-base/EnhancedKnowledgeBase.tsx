'use client'

import React, { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import DocumentContentViewer from './DocumentContentViewer'
import { 
  Upload, 
  FileText, 
  Trash2,
  Download,
  Eye,
  BookOpen,
  File,
  Image as ImageIcon,
  FileVideo,
  FileAudio,
  AlertCircle,
  CheckCircle,
  Clock,
  X,
  Plus
} from 'lucide-react'

interface UploadedFile {
  id: string
  name: string
  original_name: string
  size: number
  type: string
  url: string
  created_at: string
  updated_at: string
  
  // Enhanced metadata
  description?: string
  tags: string[]
  document_type?: string
  language?: string
  word_count?: number
  page_count?: number
  
  // Processing info
  processing_status: 'pending' | 'processing' | 'completed' | 'failed'
  processing_error?: string
  
  // Content metadata
  extracted_text?: string
  extracted_text_preview?: string
  has_images: boolean
  has_tables: boolean
}

interface UploadProgress {
  [key: string]: {
    progress: number
    status: 'uploading' | 'processing' | 'completed' | 'error'
    error?: string
  }
}

const EnhancedKnowledgeBase = () => {
  const [files, setFiles] = useState<UploadedFile[]>([])
  const [uploading, setUploading] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(null)
  const [uploadProgress, setUploadProgress] = useState<UploadProgress>({})
  const fileInputRef = useRef<HTMLInputElement>(null)
  const progressTimersRef = useRef<{ [key: string]: NodeJS.Timeout }>({})

  useEffect(() => {
    fetchFiles()
    
    // Cleanup timers on unmount
    return () => {
      Object.values(progressTimersRef.current).forEach(timer => clearInterval(timer))
    }
  }, [])

  const fetchFiles = async () => {
    try {
      const response = await fetch('http://localhost:8000/knowledge-base/files')
      const data = await response.json()
      
      if (data.success) {
        setFiles(data.files)
      } else {
        console.error('Failed to fetch files:', data.error)
      }
    } catch (error) {
      console.error('Error fetching files:', error)
    }
  }

  const handleFileUpload = async (selectedFiles: FileList) => {
    if (!selectedFiles || selectedFiles.length === 0) return

    setUploading(true)

    for (let i = 0; i < selectedFiles.length; i++) {
      const file = selectedFiles[i]
      const fileId = `temp_${Date.now()}_${i}`
      
      // Initialize progress tracking
      setUploadProgress(prev => ({
        ...prev,
        [fileId]: { progress: 0, status: 'uploading' }
      }))

      try {
        const formData = new FormData()
        formData.append('file', file)

        // Simulate upload progress
        const progressTimer = setInterval(() => {
          setUploadProgress(prev => {
            const current = prev[fileId]?.progress || 0
            if (current < 90) {
              return {
                ...prev,
                [fileId]: { ...prev[fileId], progress: current + 10 }
              }
            }
            return prev
          })
        }, 200)

        progressTimersRef.current[fileId] = progressTimer

        const response = await fetch('http://localhost:8000/knowledge-base/upload', {
          method: 'POST',
          body: formData,
        })

        const result = await response.json()

        // Clear the progress timer
        clearInterval(progressTimer)
        delete progressTimersRef.current[fileId]

        if (result.success) {
          // Update progress to completed
          setUploadProgress(prev => ({
            ...prev,
            [fileId]: { progress: 100, status: 'completed' }
          }))

          // Remove from progress after a delay
          setTimeout(() => {
            setUploadProgress(prev => {
              const newProgress = { ...prev }
              delete newProgress[fileId]
              return newProgress
            })
          }, 2000)

          // Refresh files list
          await fetchFiles()
        } else {
          // Clear timer and show error
          setUploadProgress(prev => ({
            ...prev,
            [fileId]: { progress: 0, status: 'error', error: result.error }
          }))

          // Remove error after delay
          setTimeout(() => {
            setUploadProgress(prev => {
              const newProgress = { ...prev }
              delete newProgress[fileId]
              return newProgress
            })
          }, 5000)
        }
      } catch (error) {
        // Clear timer on error
        if (progressTimersRef.current[fileId]) {
          clearInterval(progressTimersRef.current[fileId])
          delete progressTimersRef.current[fileId]
        }

        setUploadProgress(prev => ({
          ...prev,
          [fileId]: { progress: 0, status: 'error', error: 'Upload failed' }
        }))

        // Remove error after delay
        setTimeout(() => {
          setUploadProgress(prev => {
            const newProgress = { ...prev }
            delete newProgress[fileId]
            return newProgress
          })
        }, 5000)

        console.error('Upload error:', error)
      }
    }

    setUploading(false)
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
      handleFileUpload(e.dataTransfer.files)
    }
  }

  const handleDeleteFile = async (fileId: string) => {
    try {
      const response = await fetch(`http://localhost:8000/knowledge-base/files/${fileId}`, {
        method: 'DELETE',
      })

      const result = await response.json()
      
      if (result.success) {
        setFiles(files.filter(file => file.id !== fileId))
      } else {
        console.error('Failed to delete file:', result.error)
      }
    } catch (error) {
      console.error('Error deleting file:', error)
    }
  }

  const getFileIcon = (type: string) => {
    if (type.includes('pdf') || type.includes('document')) return FileText
    if (type.includes('image')) return ImageIcon
    if (type.includes('video')) return FileVideo
    if (type.includes('audio')) return FileAudio
    return File
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'processing':
        return <Clock className="h-4 w-4 text-blue-500 animate-spin" />
      case 'failed':
        return <AlertCircle className="h-4 w-4 text-red-500" />
      default:
        return <Clock className="h-4 w-4 text-gray-400" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800'
      case 'processing':
        return 'bg-blue-100 text-blue-800'
      case 'failed':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="space-y-6">
      {/* Upload Area */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <BookOpen className="h-5 w-5 mr-2" />
            Knowledge Base
          </CardTitle>
          <CardDescription>
            Upload and manage documents for your AI assistant. Supported formats: PDF, DOCX, TXT, Images, Audio, Video.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              dragActive 
                ? 'border-blue-500 bg-blue-50' 
                : 'border-gray-300 hover:border-gray-400'
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <Upload className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-medium mb-2">Upload Documents</h3>
            <p className="text-gray-600 mb-4">
              Drag and drop files here, or click to select files
            </p>
            <Button 
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              <Plus className="h-4 w-4 mr-2" />
              Select Files
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={(e) => e.target.files && handleFileUpload(e.target.files)}
              accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.gif,.mp3,.wav,.mp4,.avi"
            />
          </div>

          {/* Upload Progress */}
          {Object.entries(uploadProgress).length > 0 && (
            <div className="mt-4 space-y-2">
              {Object.entries(uploadProgress).map(([fileId, progress]) => (
                <div key={fileId} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium">
                        {progress.status === 'uploading' ? 'Uploading...' : 
                         progress.status === 'processing' ? 'Processing...' :
                         progress.status === 'completed' ? 'Completed!' : 'Error'}
                      </span>
                      <span className="text-sm text-gray-500">{progress.progress}%</span>
                    </div>
                    <Progress value={progress.progress} className="h-2" />
                    {progress.error && (
                      <p className="text-sm text-red-600 mt-1">{progress.error}</p>
                    )}
                  </div>
                  {progress.status === 'completed' && (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  )}
                  {progress.status === 'error' && (
                    <AlertCircle className="h-5 w-5 text-red-500" />
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Files List */}
      <Card>
        <CardHeader>
          <CardTitle>Uploaded Documents ({files.length})</CardTitle>
          <CardDescription>
            Manage your knowledge base documents
          </CardDescription>
        </CardHeader>
        <CardContent>
          {files.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <FileText className="h-12 w-12 mx-auto mb-2 text-gray-300" />
              <p>No documents uploaded yet</p>
              <p className="text-sm">Upload your first document to get started</p>
            </div>
          ) : (
            <div className="space-y-3">
              {files.map((file) => {
                const FileIcon = getFileIcon(file.type)
                
                return (
                  <div key={file.id} className="flex items-center space-x-4 p-4 border rounded-lg hover:bg-gray-50">
                    <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                      <FileIcon className="h-5 w-5 text-blue-600" />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <h4 className="font-medium text-gray-900 truncate">{file.name}</h4>
                        <Badge className={getStatusColor(file.processing_status)}>
                          <div className="flex items-center space-x-1">
                            {getStatusIcon(file.processing_status)}
                            <span className="capitalize">{file.processing_status}</span>
                          </div>
                        </Badge>
                      </div>
                      
                      <div className="flex items-center space-x-4 text-sm text-gray-500 mt-1">
                        <span>{formatFileSize(file.size)}</span>
                        {file.word_count && (
                          <>
                            <span>•</span>
                            <span>{file.word_count.toLocaleString()} words</span>
                          </>
                        )}
                        {file.page_count && (
                          <>
                            <span>•</span>
                            <span>{file.page_count} pages</span>
                          </>
                        )}
                      </div>
                      
                      {file.extracted_text_preview && (
                        <p className="text-sm text-gray-600 mt-2 line-clamp-2">
                          {file.extracted_text_preview}
                        </p>
                      )}
                    </div>
                    
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedDocumentId(file.id)}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        Content
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(file.url, '_blank')}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteFile(file.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Document Content Viewer Modal */}
      {selectedDocumentId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <DocumentContentViewer
              documentId={selectedDocumentId}
              onClose={() => setSelectedDocumentId(null)}
            />
          </div>
        </div>
      )}
    </div>
  )
}

export default EnhancedKnowledgeBase
