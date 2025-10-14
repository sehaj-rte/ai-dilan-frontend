'use client'

import React, { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { API_URL } from '@/lib/config'
import { fetchWithAuth, getAuthHeaders, getAuthHeadersForFormData } from '@/lib/api-client'
import DocumentContentViewer from './DocumentContentViewer'
import AudioRecorder from './AudioRecorder'
import YouTubeTranscriber from './YouTubeTranscriber'
import FolderSelector from './FolderSelector'
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
  Plus,
  Folder,
  Mic,
  Youtube,
  ChevronDown,
  ChevronRight,
  Loader2
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
  folder?: string  // Added folder field
  
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
  const [selectedFolder, setSelectedFolder] = useState<string>('Uncategorized')
  const [isCreateFolderOpen, setIsCreateFolderOpen] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const [isCreatingFolder, setIsCreatingFolder] = useState(false)
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(['Uncategorized']))
  const [isLoadingFiles, setIsLoadingFiles] = useState(false)
  const [deletingFileId, setDeletingFileId] = useState<string | null>(null)
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [customFileName, setCustomFileName] = useState('')
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
    setIsLoadingFiles(true)
    try {
      const response = await fetchWithAuth(`${API_URL}/knowledge-base/files`, {
        headers: getAuthHeaders(),
      })
      const data = await response.json()
      
      if (data.success) {
        setFiles(data.files)
      } else {
        console.error('Failed to fetch files:', data.error)
      }
    } catch (error) {
      console.error('Error fetching files:', error)
    } finally {
      setIsLoadingFiles(false)
    }
  }

  const handleFileSelection = (files: FileList) => {
    if (!files || files.length === 0) return
    
    const filesArray = Array.from(files)
    setSelectedFiles(filesArray)
    // Set first file name as default
    if (filesArray.length > 0) {
      setCustomFileName(filesArray[0].name)
    }
  }

  const handleFileUpload = async () => {
    if (selectedFiles.length === 0) return

    setUploading(true)

    for (let i = 0; i < selectedFiles.length; i++) {
      const file = selectedFiles[i]
      // Use custom name for first file, original name for others
      const fileName = i === 0 && customFileName ? customFileName : file.name
      const fileId = `temp_${Date.now()}_${i}`
      
      // Initialize progress tracking
      setUploadProgress(prev => ({
        ...prev,
        [fileId]: { progress: 0, status: 'uploading' }
      }))

      try {
        const formData = new FormData()
        formData.append('file', file)
        formData.append('folder', selectedFolder)
        formData.append('custom_name', fileName)

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

        const response = await fetchWithAuth(`${API_URL}/knowledge-base/upload`, {
          method: 'POST',
          headers: getAuthHeadersForFormData(),
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
    setSelectedFiles([])
    setCustomFileName('')
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

  const handleDeleteFile = async (fileId: string) => {
    setDeletingFileId(fileId)
    try {
      const response = await fetchWithAuth(`${API_URL}/knowledge-base/files/${fileId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      })

      const result = await response.json()
      
      if (result.success) {
        setFiles(files.filter(file => file.id !== fileId))
      } else {
        console.error('Failed to delete file:', result.error)
        alert('Failed to delete file: ' + result.error)
      }
    } catch (error) {
      console.error('Error deleting file:', error)
      alert('Failed to delete file. Please try again.')
    } finally {
      setDeletingFileId(null)
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

  // Group files by folder
  const groupedFiles = files.reduce((acc, file) => {
    const folder = file.folder || 'Uncategorized'
    if (!acc[folder]) {
      acc[folder] = []
    }
    acc[folder].push(file)
    return acc
  }, {} as Record<string, UploadedFile[]>)

  // Sort folders: Uncategorized last, others alphabetically
  const sortedFolders = Object.keys(groupedFiles).sort((a, b) => {
    if (a === 'Uncategorized') return 1
    if (b === 'Uncategorized') return -1
    return a.localeCompare(b)
  })

  const toggleFolder = (folderName: string) => {
    setExpandedFolders(prev => {
      const newSet = new Set(prev)
      if (newSet.has(folderName)) {
        newSet.delete(folderName)
      } else {
        newSet.add(folderName)
      }
      return newSet
    })
  }

  const handleTranscriptionComplete = (result: any) => {
    // Refresh files list to show the new transcription
    fetchFiles()
  }

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return
    
    const trimmedName = newFolderName.trim()
    setIsCreatingFolder(true)
    
    try {
      const response = await fetchWithAuth(`${API_URL}/knowledge-base/folders?folder_name=${encodeURIComponent(trimmedName)}`, {
        method: 'POST',
        headers: getAuthHeaders(),
      })
      
      const data = await response.json()
      
      if (data.success) {
        // Set the newly created folder as selected
        setSelectedFolder(trimmedName)
        setIsCreateFolderOpen(false)
        setNewFolderName('')
        console.log('✅ Folder created:', trimmedName)
      } else {
        console.error('Failed to create folder:', data.error)
        alert(data.error || 'Failed to create folder')
      }
    } catch (error) {
      console.error('Error creating folder:', error)
      alert('Failed to create folder. Please try again.')
    } finally {
      setIsCreatingFolder(false)
    }
  }

  return (
    <div className="space-y-4 md:space-y-6 px-2 md:px-0">
      {/* Header with Create Folder Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl md:text-2xl font-bold flex items-center">
            <BookOpen className="h-5 w-5 md:h-6 md:w-6 mr-2" />
            Knowledge Base
          </h2>
          <p className="text-sm md:text-base text-gray-600 mt-1">Upload and manage documents for your AI assistant</p>
        </div>
        <Dialog open={isCreateFolderOpen} onOpenChange={setIsCreateFolderOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setIsCreateFolderOpen(true)} className="flex items-center w-full sm:w-auto">
              <Plus className="h-4 w-4 mr-2" />
              Create Folder
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Folder</DialogTitle>
              <DialogDescription>
                Enter a name for your new folder to organize your files.
              </DialogDescription>
            </DialogHeader>
            <Input
              placeholder="e.g., Medical, Research, Educational"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && newFolderName.trim() && !isCreatingFolder) {
                  handleCreateFolder()
                }
              }}
              disabled={isCreatingFolder}
            />
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateFolderOpen(false)} disabled={isCreatingFolder}>
                Cancel
              </Button>
              <Button
                onClick={handleCreateFolder}
                disabled={!newFolderName.trim() || isCreatingFolder}
              >
                {isCreatingFolder ? 'Creating...' : 'Create'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Tabbed Interface */}
      <Tabs defaultValue="upload" className="w-full">
        <TabsList className="grid w-full grid-cols-3 h-auto">
          <TabsTrigger value="upload" className="flex items-center justify-center py-3">
            <Upload className="h-4 w-4 mr-1 md:mr-2" />
            <span className="text-xs md:text-sm">Upload</span>
          </TabsTrigger>
          <TabsTrigger value="speech" className="flex items-center justify-center py-3">
            <Mic className="h-4 w-4 mr-1 md:mr-2" />
            <span className="text-xs md:text-sm">Speech</span>
          </TabsTrigger>
          <TabsTrigger value="youtube" className="flex items-center justify-center py-3">
            <Youtube className="h-4 w-4 mr-1 md:mr-2" />
            <span className="text-xs md:text-sm">YouTube</span>
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Upload Documents */}
        <TabsContent value="upload" className="space-y-4">
          <Card>
            <CardHeader className="px-4 md:px-6">
              <CardTitle className="text-lg md:text-xl">Upload Files</CardTitle>
              <CardDescription className="text-xs md:text-sm">
                Supported formats: PDF, DOCX, TXT, Images, Audio, Video
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 px-4 md:px-6">
              {/* Folder Selector */}
              <div className="space-y-2">
                <label className="text-xs md:text-sm font-medium">Save to Folder</label>
                <FolderSelector value={selectedFolder} onChange={setSelectedFolder} />
              </div>

              {/* File Name Input */}
              {selectedFiles.length > 0 && (
                <div className="space-y-2">
                  <label className="text-xs md:text-sm font-medium">
                    File Name {selectedFiles.length > 1 && `(${selectedFiles.length} files selected)`}
                  </label>
                  <div className="flex gap-2">
                    <Input
                      value={customFileName}
                      onChange={(e) => setCustomFileName(e.target.value)}
                      placeholder="Enter file name"
                      className="flex-1"
                    />
                    <Button
                      onClick={handleFileUpload}
                      disabled={uploading || !customFileName}
                    >
                      {uploading ? 'Uploading...' : 'Upload'}
                    </Button>
                  </div>
                  {selectedFiles.length > 1 && (
                    <p className="text-xs text-gray-500">
                      Custom name will apply to the first file. Other files will keep their original names.
                    </p>
                  )}
                </div>
              )}

              {/* Upload Area */}
              <div
                className={`border-2 border-dashed rounded-lg p-4 md:p-8 text-center transition-colors ${
                  dragActive 
                    ? 'border-blue-500 bg-blue-50' 
                    : 'border-gray-300 hover:border-gray-400'
                }`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                <Upload className="h-8 w-8 md:h-12 md:w-12 text-gray-400 mx-auto mb-2 md:mb-4" />
                <p className="text-sm md:text-lg font-medium text-gray-700 mb-2">Upload Documents</p>
                <p className="text-gray-600 mb-4">
                  Drag and drop files here, or click to select files
                </p>
                <Button 
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="w-full sm:w-auto"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Select Files
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  className="hidden"
                  onChange={(e) => e.target.files && handleFileSelection(e.target.files)}
                  accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.gif,.mp3,.wav,.mp4,.avi"
                />
              </div>

              {/* Upload Progress */}
              {Object.entries(uploadProgress).length > 0 && (
                <div className="space-y-2">
                  {Object.entries(uploadProgress).map(([fileId, progress]) => (
                    <div key={fileId} className="flex items-center space-x-3 p-3 md:p-4 bg-gray-50 rounded-lg">
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
        </TabsContent>

        {/* Tab 2: Speech to Text */}
        <TabsContent value="speech">
          <AudioRecorder onTranscriptionComplete={handleTranscriptionComplete} />
        </TabsContent>

        {/* Tab 3: YouTube */}
        <TabsContent value="youtube">
          <YouTubeTranscriber onTranscriptionComplete={handleTranscriptionComplete} />
        </TabsContent>
      </Tabs>

      {/* Files List */}
      <Card>
        <CardHeader className="px-4 md:px-6">
          <CardTitle className="text-lg md:text-xl">Uploaded Documents ({files.length})</CardTitle>
          <CardDescription className="text-xs md:text-sm">
            Manage your knowledge base documents
          </CardDescription>
        </CardHeader>
        <CardContent className="px-2 md:px-6">
          {isLoadingFiles ? (
            <div className="text-center py-6 md:py-8">
              <Loader2 className="h-10 w-10 md:h-12 md:w-12 mx-auto mb-2 text-blue-500 animate-spin" />
              <p className="text-sm md:text-base text-gray-600">Loading files...</p>
            </div>
          ) : files.length === 0 ? (
            <div className="text-center py-6 md:py-8 text-gray-500">
              <FileText className="h-10 w-10 md:h-12 md:w-12 mx-auto mb-2 text-gray-300" />
              <p className="text-sm md:text-base">No documents uploaded yet</p>
              <p className="text-xs md:text-sm">Upload your first document to get started</p>
            </div>
          ) : (
            <div className="space-y-4">
              {sortedFolders.map((folderName) => {
                const folderFiles = groupedFiles[folderName]
                const isExpanded = expandedFolders.has(folderName)
                
                return (
                  <div key={folderName} className="border rounded-lg">
                    {/* Folder Header */}
                    <button
                      onClick={() => toggleFolder(folderName)}
                      className="w-full flex items-center justify-between p-3 md:p-4 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center space-x-2 md:space-x-3">
                        {isExpanded ? (
                          <ChevronDown className="h-5 w-5 text-gray-500" />
                        ) : (
                          <ChevronRight className="h-5 w-5 text-gray-500" />
                        )}
                        <Folder className="h-4 w-4 md:h-5 md:w-5 text-blue-500" />
                        <span className="text-sm md:text-base font-medium text-gray-900">{folderName}</span>
                        <Badge variant="secondary" className="ml-1 md:ml-2 text-xs">
                          {folderFiles.length} {folderFiles.length === 1 ? 'file' : 'files'}
                        </Badge>
                      </div>
                    </button>
                    
                    {/* Folder Files */}
                    {isExpanded && (
                      <div className="border-t">
                        {folderFiles.map((file) => {
                          const FileIcon = getFileIcon(file.type)
                          
                          return (
                            <div key={file.id} className="flex items-center space-x-2 md:space-x-4 p-3 md:p-4 border-b last:border-b-0 hover:bg-gray-50">
                              <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                                <FileIcon className="h-5 w-5 text-blue-600" />
                              </div>
                              
                              <div className="flex-1 min-w-0">
                                {/* File Name */}
                                <h4 className="text-sm md:text-base font-medium text-gray-900 truncate mb-1">
                                  {file.name || file.original_name}
                                </h4>
                                
                                <div className="flex flex-wrap items-center gap-2 md:gap-4 text-xs md:text-sm text-gray-500">
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
                                  <p className="text-xs md:text-sm text-gray-500 mb-3 md:mb-4 line-clamp-2">
                                    {file.extracted_text_preview}
                                  </p>
                                )}
                              </div>
                              
                              <div className="flex space-x-1 md:space-x-2 flex-shrink-0">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setSelectedDocumentId(file.id)}
                                  className="hidden sm:flex"
                                >
                                  <Eye className="h-4 w-4 mr-2" />
                                  Content
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setSelectedDocumentId(file.id)}
                                  className="sm:hidden p-2"
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => window.open(file.url, '_blank')}
                                  className="p-2"
                                >
                                  <Download className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleDeleteFile(file.id)}
                                  disabled={deletingFileId === file.id}
                                  className="text-red-600 hover:text-red-700 p-2"
                                >
                                  {deletingFileId === file.id ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <Trash2 className="h-4 w-4" />
                                  )}
                                </Button>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Document Content Viewer Modal */}
      {selectedDocumentId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-2 md:p-4 z-50">
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
