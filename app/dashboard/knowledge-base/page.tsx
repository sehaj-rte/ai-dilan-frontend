'use client'
import { API_URL } from '@/lib/config'

import React, { useState, useEffect } from 'react'
import DashboardLayout from '@/components/dashboard/DashboardLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
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
  Clock
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
  extracted_text_preview?: string
  has_images: boolean
  has_tables: boolean
  
  // Legacy compatibility
  uploadDate?: string
  status?: 'uploading' | 'completed' | 'error'
}

const KnowledgeBasePage = () => {
  const [files, setFiles] = useState<UploadedFile[]>([])
  const [uploading, setUploading] = useState(false)
  const [dragActive, setDragActive] = useState(false)

  useEffect(() => {
    fetchFiles()
  }, [])

  const fetchFiles = async () => {
    try {
      const response = await fetch(`${API_URL}/knowledge-base/files')
      const data = await response.json()
      
      if (data.success) {
        setFiles(data.files)
      } else {
        console.error('Failed to fetch files:', data.error)
      }
    } catch (error) {
      console.error('Error fetching files:', error)
      // Set demo files for now
      setFiles([
        {
          id: '1',
          name: 'AI_Research_Paper.pdf',
          original_name: 'AI_Research_Paper.pdf',
          size: 2457600,
          type: 'application/pdf',
          url: 'https://ai-dilan.s3.amazonaws.com/files/AI_Research_Paper.pdf',
          created_at: '2024-01-15T10:30:00Z',
          updated_at: '2024-01-15T10:30:00Z',
          tags: ['AI', 'Research', 'Machine Learning'],
          document_type: 'pdf',
          language: 'en',
          word_count: 5420,
          page_count: 12,
          processing_status: 'completed',
          extracted_text_preview: 'This research paper explores the latest developments in artificial intelligence...',
          has_images: true,
          has_tables: false,
          uploadDate: '2024-01-15T10:30:00Z',
          status: 'completed'
        },
        {
          id: '2',
          name: 'Training_Dataset.csv',
          original_name: 'Training_Dataset.csv',
          size: 1048576,
          type: 'text/csv',
          url: 'https://ai-dilan.s3.amazonaws.com/files/Training_Dataset.csv',
          created_at: '2024-01-14T14:20:00Z',
          updated_at: '2024-01-14T14:20:00Z',
          tags: ['Dataset', 'Training', 'CSV'],
          document_type: 'csv',
          language: 'en',
          word_count: 2150,
          page_count: 1,
          processing_status: 'completed',
          extracted_text_preview: 'Name, Age, Category, Score\nJohn Doe, 25, A, 95\nJane Smith, 30, B, 87...',
          has_images: false,
          has_tables: true,
          uploadDate: '2024-01-14T14:20:00Z',
          status: 'completed'
        }
      ])
    }
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
      handleFiles(e.dataTransfer.files)
    }
  }

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFiles(e.target.files)
    }
  }

  const handleFiles = async (fileList: FileList) => {
    const filesArray = Array.from(fileList)
    setUploading(true)

    for (const file of filesArray) {
      const tempId = Date.now().toString() + Math.random().toString(36).substr(2, 9)
      
      // Add file to state with uploading status
      const newFile: UploadedFile = {
        id: tempId,
        name: file.name,
        original_name: file.name,
        size: file.size,
        type: file.type,
        url: '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        tags: [],
        processing_status: 'processing',
        has_images: false,
        has_tables: false,
        uploadDate: new Date().toISOString(),
        status: 'uploading'
      }
      
      setFiles(prev => [...prev, newFile])

      try {
        const formData = new FormData()
        formData.append('file', file)

        const response = await fetch(`${API_URL}/knowledge-base/upload', {
          method: 'POST',
          body: formData
        })

        const result = await response.json()

        if (result.success) {
          // Update file with completed status and S3 URL
          setFiles(prev => prev.map(f => 
            f.id === tempId 
              ? { ...f, status: 'completed', url: result.url, id: result.id }
              : f
          ))
        } else {
          // Update file with error status
          setFiles(prev => prev.map(f => 
            f.id === tempId 
              ? { ...f, status: 'error' }
              : f
          ))
        }
      } catch (error) {
        console.error('Upload error:', error)
        // Update file with error status
        setFiles(prev => prev.map(f => 
          f.id === tempId 
            ? { ...f, status: 'error' }
            : f
        ))
      }
    }

    setUploading(false)
  }

  const handleDelete = async (fileId: string) => {
    if (!confirm('Are you sure you want to delete this file?')) return

    try {
      const response = await fetch(`${API_URL}/knowledge-base/files/${fileId}`, {
        method: 'DELETE'
      })

      const result = await response.json()

      if (result.success) {
        setFiles(prev => prev.filter(f => f.id !== fileId))
      } else {
        alert('Failed to delete file')
      }
    } catch (error) {
      console.error('Delete error:', error)
      alert('Error deleting file')
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) return ImageIcon
    if (type.startsWith('video/')) return FileVideo
    if (type.startsWith('audio/')) return FileAudio
    if (type.includes('pdf')) return FileText
    return File
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center">
              <BookOpen className="h-8 w-8 mr-3 text-blue-600" />
              Knowledge Base
            </h1>
            <p className="text-gray-600 mt-1">Upload and manage your training files</p>
          </div>
          <div className="text-sm text-gray-500">
            {files.length} files • {formatFileSize(files.reduce((total, file) => total + file.size, 0))} total
          </div>
        </div>

        {/* Upload Area */}
        <Card>
          <CardHeader>
            <CardTitle>Upload Files</CardTitle>
            <CardDescription>
              Drag and drop files here or click to browse. Supported formats: PDF, DOC, TXT, CSV, Images, Audio, Video
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
              <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-lg font-medium text-gray-900 mb-2">
                Drop files here to upload
              </p>
              <p className="text-gray-500 mb-4">
                or click the button below to browse
              </p>
              <label className="cursor-pointer">
                <input
                  type="file"
                  multiple
                  onChange={handleFileInput}
                  className="hidden"
                  accept=".pdf,.doc,.docx,.txt,.csv,.jpg,.jpeg,.png,.gif,.mp3,.wav,.mp4,.avi"
                />
                <Button variant="outline" disabled={uploading} asChild>
                  <span>
                    <Upload className="h-4 w-4 mr-2" />
                    {uploading ? 'Uploading...' : 'Browse Files'}
                  </span>
                </Button>
              </label>
            </div>
          </CardContent>
        </Card>

        {/* Files List */}
        <Card>
          <CardHeader>
            <CardTitle>Uploaded Files</CardTitle>
            <CardDescription>
              Manage your knowledge base files
            </CardDescription>
          </CardHeader>
          <CardContent>
            {files.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No files uploaded yet</h3>
                <p className="text-gray-500 text-sm">
                  Upload your first file to start building your knowledge base
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {files.map((file) => {
                  const FileIcon = getFileIcon(file.type)
                  return (
                    <div
                      key={file.id}
                      className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
                    >
                      <div className="flex items-center space-x-4">
                        {/* Status Icon */}
                        <div className="relative">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                            file.processing_status === 'completed' ? 'bg-green-100' :
                            file.processing_status === 'failed' ? 'bg-red-100' : 'bg-blue-100'
                          }`}>
                            <FileIcon className={`h-5 w-5 ${
                              file.processing_status === 'completed' ? 'text-green-600' :
                              file.processing_status === 'failed' ? 'text-red-600' : 'text-blue-600'
                            }`} />
                          </div>
                          {(file.processing_status === 'processing' || file.status === 'uploading') && (
                            <div className="absolute -top-1 -right-1">
                              <Clock className="h-4 w-4 text-blue-500 animate-spin" />
                            </div>
                          )}
                          {file.processing_status === 'completed' && (
                            <div className="absolute -top-1 -right-1">
                              <CheckCircle className="h-4 w-4 text-green-500" />
                            </div>
                          )}
                          {file.processing_status === 'failed' && (
                            <div className="absolute -top-1 -right-1">
                              <AlertCircle className="h-4 w-4 text-red-500" />
                            </div>
                          )}
                        </div>

                        {/* File Info */}
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <p className="font-medium text-gray-900">{file.name}</p>
                            {file.document_type && (
                              <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
                                {file.document_type.toUpperCase()}
                              </span>
                            )}
                          </div>
                          
                          <div className="flex items-center space-x-4 text-sm text-gray-500 mt-1">
                            <span>{formatFileSize(file.size)}</span>
                            {file.word_count && (
                              <>
                                <span>•</span>
                                <span>{file.word_count.toLocaleString()} words</span>
                              </>
                            )}
                            {file.page_count && file.page_count > 1 && (
                              <>
                                <span>•</span>
                                <span>{file.page_count} pages</span>
                              </>
                            )}
                            <span>•</span>
                            <span>{formatDate(file.uploadDate || file.created_at)}</span>
                            {file.processing_status === 'failed' && (
                              <>
                                <span>•</span>
                                <span className="text-red-500">Processing failed</span>
                              </>
                            )}
                          </div>
                          
                          {/* Tags */}
                          {file.tags && file.tags.length > 0 && (
                            <div className="flex items-center space-x-1 mt-2">
                              {file.tags.slice(0, 3).map((tag, index) => (
                                <span key={index} className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded">
                                  {tag}
                                </span>
                              ))}
                              {file.tags.length > 3 && (
                                <span className="text-xs text-gray-500">+{file.tags.length - 3} more</span>
                              )}
                            </div>
                          )}
                          
                          {/* Preview */}
                          {file.extracted_text_preview && (
                            <p className="text-xs text-gray-500 mt-2 line-clamp-2">
                              {file.extracted_text_preview}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center space-x-2">
                        {file.processing_status === 'completed' && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => window.open(file.url, '_blank')}
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              View
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                const link = document.createElement('a')
                                link.href = file.url
                                link.download = file.name
                                link.click()
                              }}
                            >
                              <Download className="h-4 w-4 mr-1" />
                              Download
                            </Button>
                          </>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(file.id)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
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
      </div>
    </DashboardLayout>
  )
}

export default KnowledgeBasePage
