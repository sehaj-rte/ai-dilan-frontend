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
  folder_id?: string
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

interface Pagination {
  currentPage: number
  totalPages: number
  totalRecords: number
  perPage: number
  hasNext: boolean
  hasPrevious: boolean
}

interface EnhancedKnowledgeBaseProps {
  projectId?: string
}

const EnhancedKnowledgeBase = ({ projectId }: EnhancedKnowledgeBaseProps = {}) => {
  const [files, setFiles] = useState<UploadedFile[]>([])
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(null)
  const [selectedFolderId, setSelectedFolderId] = useState<string>('')
  const [isLoadingFiles, setIsLoadingFiles] = useState(false)
  const [deletingFileId, setDeletingFileId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedFolderFilterId, setSelectedFolderFilterId] = useState<string | null>(null)
  const [isAddContentModalOpen, setIsAddContentModalOpen] = useState(false)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<UploadProgress>({})
  const [folderRefreshTrigger, setFolderRefreshTrigger] = useState(0)
  const [successCount, setSuccessCount] = useState(0)
  const [errorCount, setErrorCount] = useState(0)
  const [pagination, setPagination] = useState<Pagination>({
    currentPage: 1,
    totalPages: 1,
    totalRecords: 0,
    perPage: 10,
    hasNext: false,
    hasPrevious: false
  })
  const progressTimersRef = useRef<{ [key: string]: NodeJS.Timeout }>({})
  
  // Add request deduplication
  const requestInProgressRef = useRef<boolean>(false)
  const lastRequestParamsRef = useRef<string>('')
  
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
        // Only refresh folder counts after successful deletion
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


  useEffect(() => {
    fetchFiles()
    
    // Cleanup timers on unmount
    return () => {
      Object.values(progressTimersRef.current).forEach(timer => clearInterval(timer))
    }
  }, []) // Only run on mount

  // Debounced search effect
  useEffect(() => {
    if (searchQuery === '') {
      // If search is cleared, fetch immediately
      fetchFiles(selectedFolderFilterId, 1, '')
      return
    }

    const timeoutId = setTimeout(() => {
      // Reset to first page when searching
      setPagination(prev => ({ ...prev, currentPage: 1 }))
      fetchFiles(selectedFolderFilterId, 1, searchQuery)
    }, 500) // 500ms debounce

    return () => clearTimeout(timeoutId)
  }, [searchQuery]) // Only depend on searchQuery

  // Folder filter effect
  useEffect(() => {
    // Reset to first page when changing folders
    setPagination(prev => ({ ...prev, currentPage: 1 }))
    fetchFiles(selectedFolderFilterId, 1, searchQuery)
  }, [selectedFolderFilterId]) // Only depend on selectedFolderFilterId


  const fetchFiles = async (folderId: string | null = selectedFolderFilterId, page: number = 1, search: string = searchQuery) => {
    // Create request signature for deduplication
    const requestParams = JSON.stringify({ folderId, page, search, perPage: pagination.perPage })
    
    // Prevent duplicate requests
    if (requestInProgressRef.current && lastRequestParamsRef.current === requestParams) {
      console.log('🚫 Skipping duplicate request:', requestParams)
      return
    }
    
    requestInProgressRef.current = true
    lastRequestParamsRef.current = requestParams
    setIsLoadingFiles(true)
    
    try {
      // Build query parameters
      const params = new URLSearchParams({
        page: page.toString(),
        limit: pagination.perPage.toString()
      })
      
      if (folderId) {
        params.append('folder_id', folderId)
      }
      
      if (search && search.trim()) {
        params.append('search', search.trim())
      }
      
      // Add agent_id for agent isolation
      if (projectId) {
        params.append('agent_id', projectId)
      }
      
      console.log('🔍 Fetching files with params:', params.toString())
      
      const response = await fetchWithAuth(`${API_URL}/knowledge-base/files?${params.toString()}`, {
        headers: getAuthHeaders(),
      })
      const data = await response.json()
      
      console.log('📁 Files API response:', data)
      
      if (data.success) {
        setFiles(data.files)
        setPagination({
          currentPage: data.pagination.current_page,
          totalPages: data.pagination.total_pages,
          totalRecords: data.pagination.total_records,
          perPage: data.pagination.per_page,
          hasNext: data.pagination.has_next,
          hasPrevious: data.pagination.has_previous
        })
        // Only refresh folder counts if files were actually updated
        // Remove the automatic folder refresh trigger to break the circular pattern
      } else {
        console.error('Failed to fetch files:', data.error)
      }
    } catch (error) {
      console.error('Error fetching files:', error)
    } finally {
      setIsLoadingFiles(false)
      requestInProgressRef.current = false
    }
  }

  const handleFileUpload = async (selectedFiles: File[], folderId: string) => {
    console.log('folderId :::::',folderId)
    
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
        
        // Only append folder_id if it's not empty
        if (folderId && folderId.trim()) {
          formData.append('folder_id', folderId)
        }
        
        // Add agent_id for agent isolation
        if (projectId) {
          formData.append('agent_id', projectId)
        }

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
    
    // Manually trigger folder refresh only after successful uploads
    if (successCount > 0) {
      setFolderRefreshTrigger(prev => prev + 1)
    }
    
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
              selectedFolder={selectedFolderFilterId}
              onFolderSelect={(folderId) => {
                setSelectedFolderFilterId(folderId)
                setIsMobileSidebarOpen(false)
              }}
              isCollapsed={false}
              onToggleCollapse={() => {}}
              isMobile={true}
              onMobileClose={() => setIsMobileSidebarOpen(false)}
              refreshTrigger={folderRefreshTrigger}
              projectId={projectId}
            />
          </div>
        </div>
      )}

      {/* Desktop Sidebar */}
      <div className="hidden lg:block">
        <FolderSidebar
          selectedFolder={selectedFolderFilterId}
          onFolderSelect={(folderId) => {
            setSelectedFolderFilterId(folderId)
            setSelectedFolderId(folderId || '')
          }}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          refreshTrigger={folderRefreshTrigger}
          projectId={projectId}
        />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col bg-gray-50 overflow-hidden">
        {/* Success Notification Banner */}
        {Object.keys(uploadProgress).length === 0 && successCount > 0 && (
          <div className="bg-green-50 border-b border-green-200 px-6 py-3">
            <div className="flex items-center space-x-3">
              <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <span className="text-sm font-medium text-green-800">
                Content uploaded successfully
              </span>
              <button
                onClick={() => {
                  setSuccessCount(0)
                  setErrorCount(0)
                }}
                className="ml-auto text-green-600 hover:text-green-800"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="bg-white border-b px-6 py-4">
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
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                  <BookOpen className="h-4 w-4 text-gray-600" />
                </div>
                <h1 className="text-xl font-semibold text-gray-900">All Content</h1>
              </div>
            </div>
            <Button 
              onClick={() => setIsAddContentModalOpen(true)}
              className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg font-medium"
            >
              Add Content
            </Button>
          </div>

          {/* Search and Filters */}
          <div className="flex items-center justify-between mt-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Search Content"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 bg-gray-50 border-gray-200"
              />
            </div>
            <div className="flex items-center space-x-2">
              <Button variant="outline" size="sm" className="text-gray-600">
                <Filter className="h-4 w-4 mr-2" />
                Edit Filters
              </Button>
              <span className="text-sm text-gray-500">
                Showing {files.length} {files.length === 1 ? 'item' : 'items'}
              </span>
            </div>
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
          ) : files.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <FileText className="h-8 w-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {searchQuery ? 'No content found' : 'No content yet'}
                </h3>
                <p className="text-gray-500 text-sm mb-6 max-w-sm mx-auto">
                  {searchQuery 
                    ? 'Try adjusting your search query or check your filters' 
                    : 'Upload your first document, video, or audio file to get started'}
                </p>
                {!searchQuery && (
                  <Button 
                    onClick={() => setIsAddContentModalOpen(true)}
                    className="bg-orange-500 hover:bg-orange-600 text-white"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Content
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white mx-6 rounded-lg border border-gray-200 overflow-hidden">
              {/* Table Header */}
              <div className="grid grid-cols-12 gap-4 px-6 py-4 bg-gray-50 border-b border-gray-200">
                <div className="col-span-1 flex items-center">
                  <input type="checkbox" className="rounded border-gray-300" />
                </div>
                <div className="col-span-5 text-sm font-medium text-gray-700 uppercase tracking-wide">
                  CONTENT
                </div>
                <div className="col-span-2 text-sm font-medium text-gray-700 uppercase tracking-wide">
                  UPLOADED
                </div>
                <div className="col-span-2 text-sm font-medium text-gray-700 uppercase tracking-wide">
                  STATUS
                </div>
                <div className="col-span-2 text-sm font-medium text-gray-700 uppercase tracking-wide">
                  ACTIONS
                </div>
              </div>

              {/* Table Rows */}
              {files.map((file: UploadedFile, index) => {
                const FileIcon = getFileIcon(file.type)
                
                // Determine status based on processing_status and other indicators
                const getStatusBadge = () => {
                  // Check if file is currently being processed/indexed
                  const isRecentlyUploaded = new Date(file.created_at) > new Date(Date.now() - 5 * 60 * 1000) // Within last 5 minutes
                  const hasNoExtractedText = !file.extracted_text || file.extracted_text.trim() === ''
                  const isLikelyProcessing = isRecentlyUploaded && hasNoExtractedText && file.processing_status !== 'failed' && file.processing_status !== 'completed'
                  
                  switch (file.processing_status) {
                    case 'processing':
                      return (
                        <div className="flex items-center space-x-2">
                          <div className="w-2 h-2 bg-orange-400 rounded-full animate-pulse"></div>
                          <span className="text-sm text-orange-600 font-medium">Processing</span>
                        </div>
                      )
                    case 'completed':
                      return (
                        <div className="flex items-center space-x-2">
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          <span className="text-sm text-green-600 font-medium">Completed</span>
                        </div>
                      )
                    case 'failed':
                      return (
                        <div className="flex items-center space-x-2">
                          <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                          <span className="text-sm text-red-600 font-medium">Failed</span>
                        </div>
                      )
                    case 'pending':
                    default:
                      // If file seems to be processing based on heuristics, show as processing
                      if (isLikelyProcessing) {
                        return (
                          <div className="flex items-center space-x-2">
                            <div className="w-2 h-2 bg-orange-400 rounded-full animate-pulse"></div>
                            <span className="text-sm text-orange-600 font-medium">Processing</span>
                          </div>
                        )
                      }
                      // Otherwise show as queued
                      return (
                        <div className="flex items-center space-x-2">
                          <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                          <span className="text-sm text-gray-600 font-medium">Queued</span>
                        </div>
                      )
                  }
                }
                
                return (
                  <div 
                    key={file.id} 
                    className={`grid grid-cols-12 gap-4 px-6 py-4 hover:bg-gray-50 transition-colors items-center ${
                      index !== files.length - 1 ? 'border-b border-gray-100' : ''
                    }`}
                  >
                    {/* Checkbox */}
                    <div className="col-span-1 flex items-center">
                      <input type="checkbox" className="rounded border-gray-300" />
                    </div>

                    {/* File Info */}
                    <div className="col-span-5 flex items-center space-x-3 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                        <FileIcon className="h-4 w-4 text-gray-600" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="text-sm font-medium text-gray-900 truncate">
                          {file.name || file.original_name}
                        </h4>
                        <div className="flex items-center space-x-2 text-xs text-gray-500 mt-1">
                          <span className="capitalize">{file.type.split('/')[0] || 'Document'}</span>
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

                    {/* Status */}
                    <div className="col-span-2">
                      {getStatusBadge()}
                    </div>

                    {/* Actions */}
                    <div className="col-span-2 flex items-center space-x-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedDocumentId(file.id)}
                        className="text-gray-400 hover:text-gray-600 p-1"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => window.open(file.url, '_blank')}
                        className="text-gray-400 hover:text-gray-600 p-1"
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteFile(file.id)}
                        disabled={deletingFileId === file.id}
                        className="text-gray-400 hover:text-red-600 p-1"
                      >
                        {deletingFileId === file.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-gray-400 hover:text-gray-600 p-1"
                      >
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
          
          {/* Pagination */}
          {!isLoadingFiles && files.length > 0 && pagination.totalPages > 1 && (
            <div className="flex items-center justify-between py-4 px-6 mx-6 bg-white border-t border-gray-200 rounded-b-lg">
              <div className="flex items-center space-x-2">
                <Button
                  onClick={() => {
                    const newPage = pagination.currentPage - 1
                    setPagination(prev => ({ ...prev, currentPage: newPage }))
                    fetchFiles(selectedFolderFilterId, newPage, searchQuery)
                  }}
                  disabled={!pagination.hasPrevious || isLoadingFiles}
                  variant="outline"
                  size="sm"
                  className="text-gray-600 border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  Previous
                </Button>
                
                <div className="flex items-center space-x-2 mx-4">
                  <span className="text-sm text-gray-600">
                    Page {pagination.currentPage} of {pagination.totalPages}
                  </span>
                  <span className="text-xs text-gray-500">
                    ({pagination.totalRecords} total items)
                  </span>
                </div>
                
                <Button
                  onClick={() => {
                    const newPage = pagination.currentPage + 1
                    setPagination(prev => ({ ...prev, currentPage: newPage }))
                    fetchFiles(selectedFolderFilterId, newPage, searchQuery)
                  }}
                  disabled={!pagination.hasNext || isLoadingFiles}
                  variant="outline"
                  size="sm"
                  className="text-gray-600 border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                  <svg className="h-4 w-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Button>
              </div>
              
              <div className="text-xs text-gray-500">
                Showing {((pagination.currentPage - 1) * pagination.perPage) + 1} - {Math.min(pagination.currentPage * pagination.perPage, pagination.totalRecords)} of {pagination.totalRecords}
              </div>
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
        selectedFolderId={selectedFolderId}
        setSelectedFolderId={setSelectedFolderId}
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

     