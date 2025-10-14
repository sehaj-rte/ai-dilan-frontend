'use client'

import React, { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { API_URL } from '@/lib/config'
import { fetchWithAuth, getAuthHeaders, getAuthHeadersForFormData } from '@/lib/api-client'
import DocumentContentViewer from './DocumentContentViewer'
import AddContentModal from './AddContentModal'
import FolderSidebar from './FolderSidebar'
import { 
  Upload, 
  FileText, 
  Trash2,
  Download,
  Eye,
  File,
  Image as ImageIcon,
  FileVideo,
  FileAudio,
  Plus,
  Search,
  Filter,
  Menu,
  Loader2,
  MoreVertical,
  BookOpen
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
  folder?: string
  
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
  const [filteredFiles, setFilteredFiles] = useState<UploadedFile[]>([])
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(null)
  const [selectedFolder, setSelectedFolder] = useState<string>('Uncategorized')
  const [selectedFolderFilter, setSelectedFolderFilter] = useState<string | null>(null)
  const [isLoadingFiles, setIsLoadingFiles] = useState(false)
  const [deletingFileId, setDeletingFileId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [isAddContentModalOpen, setIsAddContentModalOpen] = useState(false)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<UploadProgress>({})
  const [folderRefreshTrigger, setFolderRefreshTrigger] = useState(0)
  const [successCount, setSuccessCount] = useState(0)
  const [errorCount, setErrorCount] = useState(0)
  const progressTimersRef = useRef<{ [key: string]: NodeJS.Timeout }>({})
  
  // Toast notification state
  const [toast, setToast] = useState<{
    message: string
    type: 'success' | 'error' | 'info'
    show: boolean
  }>({ message: '', type: 'info', show: false })

  // Toast notification function
  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message, type, show: true })
    setTimeout(() => {
      setToast(prev => ({ ...prev, show: false }))
    }, 4000)
  }
  
  // Add confirmation dialog state
  const [deleteConfirm, setDeleteConfirm] = useState<{
    fileId: string | null
    fileName: string
    show: boolean
  }>({ fileId: null, fileName: '', show: false })
  
  // Show delete confirmation
  const confirmDelete = (fileId: string, fileName: string) => {
    setDeleteConfirm({ fileId, fileName, show: true })
  }
  
  // Handle confirmed deletion
  const handleConfirmedDelete = async () => {
    if (!deleteConfirm.fileId) return
    
    setDeletingFileId(deleteConfirm.fileId)
    try {
      const response = await fetchWithAuth(`${API_URL}/knowledge-base/files/${deleteConfirm.fileId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      })

      const result = await response.json()
      
      if (result.success) {
        setFiles(files.filter(file => file.id !== deleteConfirm.fileId))
        // Refresh folder counts after deletion
        setFolderRefreshTrigger(prev => prev + 1)
        showToast('File deleted successfully', 'success')
      } else {
        console.error('Failed to delete file:', result.error)
        showToast('Failed to delete file: ' + result.error, 'error')
      }
    } catch (error) {
      console.error('Error deleting file:', error)
      showToast('Failed to delete file. Please try again.', 'error')
    } finally {
      setDeletingFileId(null)
      setDeleteConfirm({ fileId: null, fileName: '', show: false })
    }
  }

        {/* Enhanced Upload Summary Toast */}
        {Object.keys(uploadProgress).length === 0 && successCount > 0 && errorCount >= 0 && (
          <div className="border-b bg-gradient-to-r from-green-50 to-emerald-50 px-6 py-4">
            <div className="bg-white rounded-lg border border-green-200 p-4 shadow-sm">
              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0">
                  <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center">
                    <svg className="h-5 w-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-semibold text-green-900">
                        Upload Complete!
                      </h3>
                      <p className="text-sm text-green-700 mt-1">
                        {successCount} {successCount === 1 ? 'file' : 'files'} successfully uploaded to your knowledge base
                        {errorCount > 0 && (
                          <span className="text-red-600 ml-1">
                            • {errorCount} failed
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-green-600 mt-1">
                        Files are now available for your AI experts to search and reference.
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        setSuccessCount(0)
                        setErrorCount(0)
                      }}
                      className="flex items-center space-x-1 text-green-600 hover:text-green-800 text-xs font-medium px-2 py-1 rounded hover:bg-green-100 transition-colors"
                    >
                      <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      <span>Dismiss</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

  useEffect(() => {
    fetchFiles()
    
    // Cleanup timers on unmount
    return () => {
      Object.values(progressTimersRef.current).forEach(timer => clearInterval(timer))
    }
  }, [])

  useEffect(() => {
    // Filter files based on folder and search query
    let filtered = files

    // Filter by folder
    if (selectedFolderFilter) {
      filtered = filtered.filter(file => file.folder === selectedFolderFilter)
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim()
      filtered = filtered.filter(file => 
        // Search in filename
        (file.name || file.original_name).toLowerCase().includes(query) ||
        // Search in file type
        file.type.toLowerCase().includes(query) ||
        // Search in folder name
        (file.folder || '').toLowerCase().includes(query) ||
        // Search in extracted text preview
        (file.extracted_text_preview || '').toLowerCase().includes(query) ||
        // Search in description
        (file.description || '').toLowerCase().includes(query) ||
        // Search in tags
        file.tags?.some(tag => tag.toLowerCase().includes(query)) ||
        // Search in document type
        (file.document_type || '').toLowerCase().includes(query)
      )
    }

    setFilteredFiles(filtered)
  }, [files, selectedFolderFilter, searchQuery])

  const fetchFiles = async () => {
    setIsLoadingFiles(true)
    try {
      const response = await fetchWithAuth(`${API_URL}/knowledge-base/files`, {
        headers: getAuthHeaders(),
      })
      const data = await response.json()
      
      if (data.success) {
        setFiles(data.files)
        // Refresh folder counts when files are fetched
        setFolderRefreshTrigger(prev => prev + 1)
      } else {
        console.error('Failed to fetch files:', data.error)
      }
    } catch (error) {
      console.error('Error fetching files:', error)
    } finally {
      setIsLoadingFiles(false)
    }
  }

  const handleFileUpload = async (selectedFiles: File[], folder: string) => {
    // Reset counters at the start of each upload batch
    setSuccessCount(0)
    setErrorCount(0)

    let successCount = 0
    let errorCount = 0
    
    for (let i = 0; i < selectedFiles.length; i++) {
      const file = selectedFiles[i]
      const fileId = `${file.name}_${Date.now()}_${i}`
      
      // Initialize progress tracking
      setUploadProgress(prev => ({
        ...prev,
        [fileId]: { progress: 0, status: 'uploading' }
      }))

      try {
        const formData = new FormData()
        formData.append('file', file)
        formData.append('folder', folder)

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
          successCount++
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
        } else {
          errorCount++
          // Clear timer and show error
          setUploadProgress(prev => ({
            ...prev,
            [fileId]: { progress: 0, status: 'error', error: result.error || 'Upload failed' }
          }))

          // Remove error after delay
          setTimeout(() => {
            setUploadProgress(prev => {
              const newProgress = { ...prev }
              delete newProgress[fileId]
              return newProgress
            })
          }, 5000)
          
          console.error(`Upload failed for ${file.name}:`, result.error)
        }
      } catch (error) {
        errorCount++
        // Clear timer on error
        if (progressTimersRef.current[fileId]) {
          clearInterval(progressTimersRef.current[fileId])
          delete progressTimersRef.current[fileId]
        }

        setUploadProgress(prev => ({
          ...prev,
          [fileId]: { progress: 0, status: 'error', error: 'Network error or server unavailable' }
        }))

        // Remove error after delay
        setTimeout(() => {
          setUploadProgress(prev => {
            const newProgress = { ...prev }
            delete newProgress[fileId]
            return newProgress
          })
        }, 5000)

        console.error(`Upload error for ${file.name}:`, error)
      }
      
      // Small delay between uploads to avoid overwhelming the server
      if (i < selectedFiles.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 100))
      }
    }
    
    // Refresh files list after all uploads complete
    await fetchFiles()
    
    // Log summary
    console.log(`Upload complete: ${successCount} succeeded, ${errorCount} failed out of ${selectedFiles.length} files`)
  }

  const handleDeleteFile = async (fileId: string) => {
    confirmDelete(fileId, files.find(file => file.id === fileId)?.name || '')
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

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    })
  }

  return (
    <div className="flex h-[calc(100vh-200px)] bg-gray-50">
      {/* Mobile Sidebar Overlay */}
      {isMobileSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setIsMobileSidebarOpen(false)}
        >
          <div className="w-64 h-full" onClick={(e) => e.stopPropagation()}>
            <FolderSidebar
              selectedFolder={selectedFolderFilter}
              onFolderSelect={setSelectedFolderFilter}
              isCollapsed={false}
              onToggleCollapse={() => {}}
              isMobile={true}
              onMobileClose={() => setIsMobileSidebarOpen(false)}
              refreshTrigger={folderRefreshTrigger}
            />
          </div>
        </div>
      )}

      {/* Desktop Sidebar */}
      <div className="hidden lg:block">
        <FolderSidebar
          selectedFolder={selectedFolderFilter}
          onFolderSelect={setSelectedFolderFilter}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          refreshTrigger={folderRefreshTrigger}
        />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col bg-white overflow-hidden">
        {/* Header */}
        <div className="border-b bg-white px-4 py-4 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Button
                variant="ghost"
                size="sm"
                className="lg:hidden"
                onClick={() => setIsMobileSidebarOpen(true)}
              >
                <Menu className="h-5 w-5" />
              </Button>
              <div>
                <h2 className="text-xl font-bold flex items-center">
                  <BookOpen className="h-5 w-5 mr-2" />
                  Content
                </h2>
                <p className="text-sm text-gray-500">
                  {filteredFiles.length} {filteredFiles.length === 1 ? 'file' : 'files'}
                  {selectedFolderFilter && ` in ${selectedFolderFilter}`}
                </p>
              </div>
            </div>
            {selectedFolderFilter && (
              <Button 
                onClick={() => setIsAddContentModalOpen(true)}
                className="bg-black hover:bg-gray-800 text-white"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Content
              </Button>
            )}
          </div>

          {/* Search and Filters */}
          <div className="flex items-center space-x-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button variant="outline" size="sm">
              <Filter className="h-4 w-4 mr-2" />
              Edit Filters
            </Button>
          </div>
        </div>


      {/* Files Table */}
        <div className="flex-1 overflow-y-auto">
          {isLoadingFiles ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <Loader2 className="h-12 w-12 mx-auto mb-4 text-blue-500 animate-spin" />
                <p className="text-gray-600">Loading files...</p>
              </div>
            </div>
          ) : filteredFiles.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <FileText className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {searchQuery ? 'No files found' : 'No documents yet'}
                </h3>
                <p className="text-gray-500 text-sm mb-6">
                  {searchQuery 
                    ? 'Try adjusting your search query' 
                    : 'Upload your first document to get started'}
                </p>
                {!searchQuery && selectedFolderFilter && (
                  <Button onClick={() => setIsAddContentModalOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Content
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <div className="divide-y">
              {/* Table Header */}
              <div className="grid grid-cols-12 gap-4 px-6 py-3 bg-gray-50 text-xs font-medium text-gray-500 uppercase tracking-wider">
                <div className="col-span-5">Content</div>
                <div className="col-span-2">Uploaded</div>
                <div className="col-span-2">Actions</div>
              </div>

              {/* Table Rows */}
              {filteredFiles.map((file) => {
                const FileIcon = getFileIcon(file.type)
                
                return (
                  <div 
                    key={file.id} 
                    className="grid grid-cols-12 gap-4 px-6 py-4 hover:bg-gray-50 transition-colors items-center"
                  >
                    {/* File Info */}
                    <div className="col-span-5 flex items-center space-x-3 min-w-0">
                      <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                        <FileIcon className="h-5 w-5 text-blue-600" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="text-sm font-medium text-gray-900 truncate">
                          {file.name || file.original_name}
                        </h4>
                        <div className="flex items-center space-x-2 text-xs text-gray-500">
                          <span>{formatFileSize(file.size)}</span>
                          {file.word_count && (
                            <>
                              <span>•</span>
                              <span>{file.word_count.toLocaleString()} words</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Upload Date */}
                    <div className="col-span-2">
                      <span className="text-sm text-gray-600">
                        {formatDate(file.created_at)}
                      </span>
                    </div>

                    {/* Actions */}
                    <div className="col-span-2 flex items-center space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedDocumentId(file.id)}
                        className="text-gray-600 hover:text-gray-900"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => window.open(file.url, '_blank')}
                        className="text-gray-600 hover:text-gray-900"
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteFile(file.id)}
                        disabled={deletingFileId === file.id}
                        className="text-red-600 hover:text-red-700"
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
      </div>

      {/* Add Content Modal */}
      <AddContentModal
        isOpen={isAddContentModalOpen}
        onClose={() => setIsAddContentModalOpen(false)}
        onFileUpload={handleFileUpload}
        onTranscriptionComplete={fetchFiles}
        selectedFolder={selectedFolderFilter || 'Uncategorized'}
        setSelectedFolder={setSelectedFolder}
      />

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

      {/* Delete Confirmation Dialog */}
      {deleteConfirm.show && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="max-w-md w-full bg-white rounded-lg shadow-lg">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Delete File
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                Are you sure you want to delete "{deleteConfirm.fileName}"? This action cannot be undone.
              </p>
              <div className="flex items-center justify-end space-x-3">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setDeleteConfirm({ fileId: null, fileName: '', show: false })}
                  className="text-gray-600 hover:text-gray-900"
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleConfirmedDelete}
                  disabled={deletingFileId !== null}
                  className="bg-red-500 hover:bg-red-600 text-white"
                >
                  {deletingFileId ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    'Delete'
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Floating Upload Progress Notifications */}
      {Object.keys(uploadProgress).length > 0 && (
        <div className="fixed top-4 right-4 z-40 w-80 max-w-sm">
          <div className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden">
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-4 py-3">
              <h3 className="text-sm font-semibold text-white flex items-center">
                <Upload className="h-4 w-4 mr-2" />
                Uploading Files
              </h3>
            </div>
            <div className="max-h-96 overflow-y-auto">
              {Object.entries(uploadProgress).map(([fileId, progress]) => {
                const fileName = fileId.split('_')[0]
                const fileExtension = fileName.split('.').pop()?.toLowerCase() || ''
                
                // Get appropriate file icon
                const getFileIcon = () => {
                  if (['pdf'].includes(fileExtension)) return <FileText className="h-4 w-4 text-red-500" />
                  if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(fileExtension)) return <ImageIcon className="h-4 w-4 text-green-500" />
                  if (['mp4', 'avi', 'mov', 'webm'].includes(fileExtension)) return <FileVideo className="h-4 w-4 text-purple-500" />
                  if (['mp3', 'wav', 'ogg', 'm4a'].includes(fileExtension)) return <FileAudio className="h-4 w-4 text-orange-500" />
                  return <File className="h-4 w-4 text-gray-500" />
                }
                
                return (
                  <div key={fileId} className="p-3 border-b border-gray-100 last:border-b-0">
                    <div className="flex items-center space-x-3">
                      {/* File Icon */}
                      <div className="flex-shrink-0">
                        {getFileIcon()}
                      </div>
                      
                      {/* File Info and Progress */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-sm font-medium text-gray-900 truncate" title={fileName}>
                            {fileName.length > 20 ? `${fileName.substring(0, 20)}...` : fileName}
                          </p>
                          
                          {/* Status */}
                          <div className="flex items-center space-x-1 ml-2">
                            {progress.status === 'uploading' && (
                              <>
                                <Loader2 className="h-3 w-3 text-blue-500 animate-spin" />
                                <span className="text-xs font-medium text-blue-600">
                                  {progress.progress}%
                                </span>
                              </>
                            )}
                            {progress.status === 'completed' && (
                              <div className="h-4 w-4 rounded-full bg-green-100 flex items-center justify-center">
                                <svg className="h-3 w-3 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                              </div>
                            )}
                            {progress.status === 'error' && (
                              <div className="h-4 w-4 rounded-full bg-red-100 flex items-center justify-center">
                                <svg className="h-3 w-3 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </div>
                            )}
                          </div>
                        </div>
                        
                        {/* Progress Bar */}
                        {progress.status === 'uploading' && (
                          <div className="w-full bg-gray-200 rounded-full h-1.5">
                            <div 
                              className="bg-gradient-to-r from-blue-500 to-blue-600 h-1.5 rounded-full transition-all duration-300 ease-out"
                              style={{ width: `${progress.progress}%` }}
                            />
                          </div>
                        )}
                        
                        {/* Error Message */}
                        {progress.status === 'error' && progress.error && (
                          <p className="text-xs text-red-600 mt-1 truncate" title={progress.error}>
                            {progress.error}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast.show && (
        <div className={`fixed bottom-4 ${Object.keys(uploadProgress).length > 0 ? 'right-96' : 'right-4'} bg-${toast.type === 'success' ? 'green' : toast.type === 'error' ? 'red' : 'blue'}-100 p-4 rounded shadow-md transition-all duration-300`}>
          <div className="flex items-center space-x-2">
            <svg className={`h-5 w-5 text-${toast.type === 'success' ? 'green' : toast.type === 'error' ? 'red' : 'blue'}-600`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              {toast.type === 'success' && (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              )}
              {toast.type === 'error' && (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              )}
              {toast.type === 'info' && (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              )}
            </svg>
            <p className="text-sm font-medium text-gray-900">{toast.message}</p>
          </div>
        </div>
      )}
    </div>
  )
}

export default EnhancedKnowledgeBase

     