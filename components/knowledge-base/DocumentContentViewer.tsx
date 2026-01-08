'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { API_URL } from '@/lib/config'
import { 
  FileText, 
  File,
  Image as ImageIcon,
  FileVideo,
  FileAudio,
  Calendar,
  HardDrive,
  Hash,
  Languages,
  BookOpen,
  Eye,
  Download,
  X,
  Clock,
  CheckCircle,
  AlertCircle
} from 'lucide-react'

interface DocumentDetails {
  id: string
  name: string
  document_type: string
  size: number
  word_count?: number
  page_count?: number
  language?: string
  has_images?: boolean
  has_tables?: boolean
  created_at: string
  updated_at?: string
  extracted_text?: string
  extracted_text_preview?: string
  processing_status: 'pending' | 'processing' | 'completed' | 'failed'
  metadata?: {
    [key: string]: any
  }
}

interface DocumentContentViewerProps {
  documentId: string | null
  onClose: () => void
}

const DocumentContentViewer: React.FC<DocumentContentViewerProps> = ({
  documentId,
  onClose
}) => {
  const [document, setDocument] = useState<DocumentDetails | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showFullContent, setShowFullContent] = useState(false)

  useEffect(() => {
    if (documentId) {
      fetchDocumentDetails()
    }
  }, [documentId])

  const fetchDocumentDetails = async () => {
    if (!documentId) return

    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch(`${API_URL}/knowledge-base/documents/${documentId}/details`)
      const data = await response.json()
      
      if (data.success) {
        setDocument(data.document)
      } else {
        setError(data.error || 'Failed to load document details')
      }
    } catch (error) {
      console.error('Error fetching document details:', error)
      setError('Failed to load document details')
    } finally {
      setLoading(false)
    }
  }

  const getFileIcon = (type: string) => {
    switch (type) {
      case 'pdf':
      case 'doc':
      case 'docx':
      case 'txt':
        return FileText
      case 'image':
        return ImageIcon
      case 'video':
        return FileVideo
      case 'audio':
        return FileAudio
      default:
        return File
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
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

  const handleDownload = () => {
    if (!document) return

    const token = localStorage.getItem('dilan_ai_token')
    
    if (!token) {
      alert('Please log in to download files')
      return
    }

    // Create download URL with token as query parameter
    const downloadUrl = `${API_URL}/knowledge-base/files/${document.id}/download?token=${encodeURIComponent(token)}`
    
    // Open in new window to trigger download
    window.open(downloadUrl, '_blank')
  }

  if (!documentId) {
    return null
  }

  if (loading) {
    return (
      <Card className="w-full max-w-4xl mx-auto">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center">
              <Eye className="h-5 w-5 mr-2" />
              Document Details
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-12">
            <Clock className="h-6 w-6 animate-spin text-blue-500 mr-2" />
            <span>Loading document details...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="w-full max-w-4xl mx-auto">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center">
              <Eye className="h-5 w-5 mr-2" />
              Document Details
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-12 text-red-500">
            <AlertCircle className="h-6 w-6 mr-2" />
            <span>{error}</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!document) {
    return null
  }

  const FileIcon = getFileIcon(document.document_type)

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center">
            <Eye className="h-5 w-5 mr-2" />
            File Content
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Document Header */}
        <div className="flex items-start space-x-4">
          <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center">
            <FileIcon className="h-6 w-6 text-blue-600" />
          </div>
          
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-semibold text-gray-900 truncate" title={document.name}>
              {document.name}
            </h2>
            <div className="flex items-center space-x-2 mt-1">
              <Badge variant="secondary">
                {document.document_type?.toUpperCase() || 'UNKNOWN'}
              </Badge>
              <Badge className={getStatusColor(document.processing_status)}>
                <div className="flex items-center space-x-1">
                  {getStatusIcon(document.processing_status)}
                  <span className="capitalize">{document.processing_status}</span>
                </div>
              </Badge>
            </div>
          </div>
          
          <div className="flex space-x-2">
            <Button variant="outline" size="sm" onClick={handleDownload}>
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
          </div>
        </div>

        <Separator />

        {/* Document Metadata */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="flex items-center space-x-2 text-sm">
            <HardDrive className="h-4 w-4 text-gray-400" />
            <span className="text-gray-600">Size:</span>
            <span className="font-medium">{formatFileSize(document.size)}</span>
          </div>
          
          {document.word_count && (
            <div className="flex items-center space-x-2 text-sm">
              <Hash className="h-4 w-4 text-gray-400" />
              <span className="text-gray-600">Words:</span>
              <span className="font-medium">{document.word_count.toLocaleString()}</span>
            </div>
          )}
          
          {document.page_count && (
            <div className="flex items-center space-x-2 text-sm">
              <BookOpen className="h-4 w-4 text-gray-400" />
              <span className="text-gray-600">Pages:</span>
              <span className="font-medium">{document.page_count}</span>
            </div>
          )}
          
          {document.language && (
            <div className="flex items-center space-x-2 text-sm">
              <Languages className="h-4 w-4 text-gray-400" />
              <span className="text-gray-600">Language:</span>
              <span className="font-medium">{document.language.toUpperCase()}</span>
            </div>
          )}
          
          <div className="flex items-center space-x-2 text-sm">
            <Calendar className="h-4 w-4 text-gray-400" />
            <span className="text-gray-600">Uploaded:</span>
            <span className="font-medium">{formatDate(document.created_at)}</span>
          </div>
        </div>

        {/* Document Features */}
        {(document.has_images || document.has_tables) && (
          <>
            <Separator />
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-gray-900">Document Features</h3>
              <div className="flex space-x-2">
                {document.has_images && (
                  <Badge variant="outline">
                    <ImageIcon className="h-3 w-3 mr-1" />
                    Contains Images
                  </Badge>
                )}
                {document.has_tables && (
                  <Badge variant="outline">
                    <FileText className="h-3 w-3 mr-1" />
                    Contains Tables
                  </Badge>
                )}
              </div>
            </div>
          </>
        )}

        {/* Document Content Preview */}
        {(document.extracted_text_preview || document.extracted_text) && (
          <>
            <Separator />
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-gray-900">Document Content</h3>
                {document.extracted_text && document.extracted_text.length > 500 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowFullContent(!showFullContent)}
                  >
                    {showFullContent ? 'Show Less' : 'Show More'}
                  </Button>
                )}
              </div>
              
              <div className="bg-gray-50 rounded-lg p-4 max-h-96 overflow-y-auto">
                <pre className="text-sm text-gray-700 whitespace-pre-wrap font-sans">
                  {showFullContent 
                    ? document.extracted_text 
                    : (document.extracted_text_preview || document.extracted_text?.substring(0, 500) + '...')
                  }
                </pre>
              </div>
            </div>
          </>
        )}

        {/* RAG Indexes */}
        <Separator />
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-gray-900">RAG Indexes</h3>
          <div className="text-sm text-gray-600">
            {document.processing_status === 'completed' ? (
              <div className="flex items-center space-x-2 text-green-600">
                <CheckCircle className="h-4 w-4" />
                <span>Document has been indexed and is ready for search</span>
              </div>
            ) : document.processing_status === 'processing' ? (
              <div className="flex items-center space-x-2 text-blue-600">
                <Clock className="h-4 w-4 animate-spin" />
                <span>Document is being processed and indexed...</span>
              </div>
            ) : document.processing_status === 'failed' ? (
              <div className="flex items-center space-x-2 text-red-600">
                <AlertCircle className="h-4 w-4" />
                <span>Document processing failed. Please try re-uploading.</span>
              </div>
            ) : (
              <div className="flex items-center space-x-2 text-green-600">
                <CheckCircle className="h-4 w-4" />
                <span>Document is ready</span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default DocumentContentViewer
